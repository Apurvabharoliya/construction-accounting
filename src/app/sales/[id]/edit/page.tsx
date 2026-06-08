'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { updateSale } from '@/lib/api/sales'
import { toast } from 'sonner'
import SaleForm from '@/components/sales/SaleForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function EditSalePage() {
  const params = useParams()
  const router = useRouter()
  const [sale, setSale] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (params.id) fetchSale()
  }, [params.id])

  async function fetchSale() {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*, client:parties!client_id(*), items:sale_items(*)')
        .eq('id', params.id)
        .single()
      if (error) throw error
      setSale(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoadingData(false)
    }
  }

  async function handleSubmit(data: any) {
    if (!params.id) return
    setIsLoading(true)
    try {
      const totalAmount = data.items.reduce((sum: number, item: any) => sum + (item.quantity * item.rate), 0)
      const totalGst = data.items.reduce((sum: number, item: any) => sum + (item.quantity * item.rate * item.gst_rate / 100), 0)
      const totalWithGst = totalAmount + totalGst

      await updateSale(params.id as string, {
        client_id: data.client_id,
        invoice_date: data.invoice_date,
        subtotal: totalAmount,
        gst_rate: 0,
        cgst_amount: totalGst / 2,
        sgst_amount: totalGst / 2,
        igst_amount: 0,
        total_amount: totalWithGst,
        payment_mode: data.payment_mode || undefined,
        payment_status: data.payment_status,
        amount_received: data.amount_received,
        balance_due: totalWithGst - data.amount_received,
        remarks: data.remarks || undefined
      }, data.items.map((item: any) => ({
        item_name: item.item_name,
        hsn_code: item.hsn_code || undefined,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        amount: item.quantity * item.rate,
        gst_rate: item.gst_rate,
        gst_amount: (item.quantity * item.rate) * item.gst_rate / 100
      })))

      toast.success('Sale updated successfully')
      router.push(`/sales/${params.id}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update sale')
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingData) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  }

  if (!sale) {
    return <div className="text-center py-12"><p className="text-gray-500">Sale not found</p></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/sales/${params.id}`} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Sale</h1>
          <p className="text-gray-500 text-sm mt-0.5">{sale.sale_number}</p>
        </div>
      </div>
      <SaleForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        initialData={sale ? {
          client_id: sale.client_id,
          invoice_date: sale.invoice_date,
          payment_mode: sale.payment_mode,
          payment_status: sale.payment_status,
          amount_received: sale.amount_received,
          remarks: sale.remarks,
          items: sale.items?.map((i: any) => ({
            item_name: i.item_name,
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
