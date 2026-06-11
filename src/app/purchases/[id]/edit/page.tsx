'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { updatePurchase } from '@/lib/api/purchases'
import { toast } from 'sonner'
import PurchaseForm from '@/components/purchases/PurchaseForm'
import type { Purchase, PurchaseItem } from '@/types/database'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function EditPurchasePage() {
  const params = useParams()
  const router = useRouter()
  const [purchase, setPurchase] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (params.id) fetchPurchase()
  }, [params.id])

  async function fetchPurchase() {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*, supplier:parties!supplier_id(*), items:purchase_items(*)')
        .eq('id', params.id)
        .single()
      if (error) throw error
      setPurchase(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoadingData(false)
    }
  }

  async function resolveOrCreateSupplier(name: string): Promise<string> {
    const { data: existing } = await supabase
      .from('parties')
      .select('id')
      .eq('name', name)
      .eq('party_type', 'supplier')
      .maybeSingle()
    if (existing) return existing.id
    const { data: created, error } = await supabase
      .from('parties')
      .insert([{ name, party_type: 'supplier' }])
      .select('id')
      .single()
    if (error) throw new Error(`Failed to create supplier: ${error.message}`)
    return created.id
  }

  async function handleSubmit(data: any) {
    if (!params.id) return
    setIsLoading(true)
    try {
      const totalAmount = data.items.reduce((sum: number, item: any) => sum + (item.quantity * item.rate), 0)
      const totalGst = data.items.reduce((sum: number, item: any) => sum + (item.quantity * item.rate * item.gst_rate / 100), 0)
      const totalWithGst = totalAmount + totalGst

      const supplier_id = await resolveOrCreateSupplier(data.supplier_name)

      await updatePurchase(params.id as string, {
        supplier_id,
        invoice_date: data.invoice_date,
        supplier_invoice_number: data.supplier_invoice_number || undefined,
        subtotal: totalAmount,
        gst_rate: 0,
        cgst_amount: totalGst / 2,
        sgst_amount: totalGst / 2,
        igst_amount: 0,
        total_amount: totalWithGst,
        payment_mode: data.payment_mode || undefined,
        payment_status: data.payment_status,
        amount_paid: data.amount_paid,
        balance_due: totalWithGst - data.amount_paid,
        remarks: data.remarks || undefined
      }, data.items.map((item: any) => ({
        material_name: item.material_name,
        hsn_code: item.hsn_code || undefined,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        amount: item.quantity * item.rate,
        gst_rate: item.gst_rate,
        gst_amount: (item.quantity * item.rate) * item.gst_rate / 100
      })))

      toast.success('Purchase updated successfully')
      router.push(`/purchases/${params.id}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update purchase')
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingData) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  }

  if (!purchase) {
    return <div className="text-center py-12"><p className="text-gray-500">Purchase not found</p></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/purchases/${params.id}`} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Purchase</h1>
          <p className="text-gray-500 text-sm mt-0.5">{purchase.purchase_number}</p>
        </div>
      </div>
      <PurchaseForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        initialData={purchase ? {
          supplier_name: purchase.supplier?.name || '',
          invoice_date: purchase.invoice_date,
          supplier_invoice_number: purchase.supplier_invoice_number,
          payment_mode: purchase.payment_mode,
          payment_status: purchase.payment_status,
          amount_paid: purchase.amount_paid,
          remarks: purchase.remarks,
          items: purchase.items?.map((i: any) => ({
            material_name: i.material_name,
            hsn_code: i.hsn_code || '',
            quantity: i.quantity,
            unit: i.unit,
            rate: i.rate,
            gst_rate: i.gst_rate
          }))
        } : undefined}
      />
    </div>
  )
}
