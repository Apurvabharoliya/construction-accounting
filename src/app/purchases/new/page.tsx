'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createPurchase } from '@/lib/api/purchases'
import { toast } from 'sonner'
import PurchaseForm from '@/components/purchases/PurchaseForm'

export default function NewPurchasePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function resolveOrCreateSupplier(name: string): Promise<string> {
    // Look up existing supplier
    const { data: existing } = await supabase
      .from('parties')
      .select('id')
      .eq('name', name)
      .eq('party_type', 'supplier')
      .maybeSingle()
    if (existing) return existing.id
    // Create a new supplier party
    const { data: created, error } = await supabase
      .from('parties')
      .insert([{ name, party_type: 'supplier' }])
      .select('id')
      .single()
    if (error) throw new Error(`Failed to create supplier: ${error.message}`)
    return created.id
  }

  async function handleSubmit(data: {
    supplier_name: string
    invoice_date: string
    supplier_invoice_number?: string
    payment_mode?: string
    payment_status: 'paid' | 'partial' | 'unpaid'
    amount_paid: number
    remarks?: string
    items: Array<{
      material_name: string
      hsn_code?: string
      quantity: number
      unit: string
      rate: number
      gst_rate: number
    }>
  }) {
    setIsLoading(true)
    try {
      // Calculate per-item GST for accurate tax computation
      const itemsWithGst = data.items.map(item => {
        const amount = item.quantity * item.rate
        const gstAmount = amount * item.gst_rate / 100
        return {
          material_name: item.material_name,
          hsn_code: item.hsn_code || undefined,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: amount,
          gst_rate: item.gst_rate,
          gst_amount: gstAmount
        }
      })

      const totalAmount = itemsWithGst.reduce((sum, item) => sum + item.amount, 0)
      const totalGstAmount = itemsWithGst.reduce((sum, item) => sum + item.gst_amount, 0)
      const totalWithGst = totalAmount + totalGstAmount

      const supplier_id = await resolveOrCreateSupplier(data.supplier_name)

      const purchaseData = {
        supplier_id,
        invoice_date: data.invoice_date,
        supplier_invoice_number: data.supplier_invoice_number || undefined,
        subtotal: totalAmount,
        gst_rate: 0, // Per-item rates tracked in items
        cgst_amount: totalGstAmount / 2,
        sgst_amount: totalGstAmount / 2,
        igst_amount: 0,
        total_amount: totalWithGst,
        payment_mode: data.payment_mode || undefined,
        payment_status: data.payment_status,
        amount_paid: data.amount_paid,
        balance_due: totalWithGst - data.amount_paid,
        remarks: data.remarks || undefined
      }

      await createPurchase(purchaseData, itemsWithGst)
      
      toast.success('Purchase recorded successfully')
      router.push('/purchases')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to record purchase')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Vendor Purchase</h1>
        <p className="text-gray-500 text-sm mt-1">Record a new material purchase</p>
      </div>
      <PurchaseForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
