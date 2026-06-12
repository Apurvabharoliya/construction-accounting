'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createSale } from '@/lib/api/sales'
import { toast } from 'sonner'
import SaleForm from '@/components/sales/SaleForm'

export default function NewSalePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function resolveOrCreateClient(name: string): Promise<string> {
    const { data: existing } = await supabase
      .from('parties')
      .select('id')
      .eq('name', name)
      .eq('party_type', 'client')
      .maybeSingle()
    if (existing) return existing.id
    const { data: created, error } = await supabase
      .from('parties')
      .insert([{ name, party_type: 'client' }])
      .select('id')
      .single()
    if (error) throw new Error(`Failed to create client: ${error.message}`)
    return created.id
  }

  async function handleSubmit(data: {
    client_name: string
    invoice_date: string
    payment_mode?: string
    payment_status: 'paid' | 'unpaid'
    amount_received: number
    remarks?: string
    items: Array<{
      item_name: string
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
          item_name: item.item_name,
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

      const client_id = await resolveOrCreateClient(data.client_name)

      const saleData = {
        client_id,
        invoice_date: data.invoice_date,
        subtotal: totalAmount,
        gst_rate: 0,
        cgst_amount: totalGstAmount / 2,
        sgst_amount: totalGstAmount / 2,
        igst_amount: 0,
        total_amount: totalWithGst,
        payment_mode: data.payment_mode || undefined,
        payment_status: data.payment_status,
        amount_received: data.amount_received,
        balance_due: totalWithGst - data.amount_received,
        remarks: data.remarks || undefined
      }

      await createSale(saleData, itemsWithGst)
      
      toast.success('Sale recorded successfully')
      router.push('/sales')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to record sale')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Sale</h1>
        <p className="text-gray-500 text-sm mt-1">Record a new sale to a client</p>
      </div>
      <SaleForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
