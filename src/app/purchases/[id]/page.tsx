'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/gst'
import { formatDate } from '@/lib/date'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function PurchaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [purchase, setPurchase] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) fetchPurchase()
  }, [params.id])

  async function fetchPurchase() {
    try {
      const { data } = await supabase
        .from('purchases')
        .select('*, supplier:parties!supplier_id(*), items:purchase_items(*)')
        .eq('id', params.id)
        .single()
      setPurchase(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  if (!purchase) return <div className="text-center py-12"><p className="text-gray-500">Purchase not found</p></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/purchases')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{purchase.purchase_number}</h1>
          <p className="text-gray-500 text-sm">Purchase from {purchase.supplier?.name}</p>
        </div>
        <Link href={`/purchases/${purchase.id}/edit`} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Edit</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Supplier</h3>
          <p className="font-medium">{purchase.supplier?.name}</p>
          {purchase.supplier?.phone && <p className="text-sm text-gray-500">{purchase.supplier.phone}</p>}
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Date & Invoice</h3>
          <p className="font-medium">{formatDate(purchase.invoice_date)}</p>
          {purchase.supplier_invoice_number && <p className="text-sm text-gray-500">Supplier Inv: {purchase.supplier_invoice_number}</p>}
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Payment Status</h3>
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            purchase.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
            purchase.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
          }`}>
            {purchase.payment_status.charAt(0).toUpperCase() + purchase.payment_status.slice(1)}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b">
                <th className="pb-3 text-sm font-medium text-gray-500">Material</th>
                <th className="pb-3 text-sm font-medium text-gray-500">HSN</th>
                <th className="pb-3 text-sm font-medium text-gray-500">Qty</th>
                <th className="pb-3 text-sm font-medium text-gray-500">Unit</th>
                <th className="pb-3 text-sm font-medium text-gray-500">Rate</th>
                <th className="pb-3 text-sm font-medium text-gray-500">GST</th>
                <th className="pb-3 text-sm font-medium text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items?.map((item: any) => (
                <tr key={item.id} className="border-t">
                  <td className="py-3 text-sm">{item.material_name}</td>
                  <td className="py-3 text-sm">{item.hsn_code || '-'}</td>
                  <td className="py-3 text-sm">{item.quantity}</td>
                  <td className="py-3 text-sm">{item.unit}</td>
                  <td className="py-3 text-sm">{formatCurrency(item.rate)}</td>
                  <td className="py-3 text-sm">{item.gst_rate}%</td>
                  <td className="py-3 text-sm font-medium">{formatCurrency(Number(item.amount) + Number(item.gst_amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Summary</h3>
        <div className="max-w-md space-y-3">
          <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-medium">{formatCurrency(Number(purchase.subtotal))}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">CGST</span><span className="font-medium">{formatCurrency(Number(purchase.cgst_amount))}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">SGST</span><span className="font-medium">{formatCurrency(Number(purchase.sgst_amount))}</span></div>
          <div className="flex justify-between border-t pt-3"><span className="text-lg font-semibold">Total</span><span className="text-lg font-semibold">{formatCurrency(Number(purchase.total_amount))}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Paid</span><span className="font-medium text-green-600">{formatCurrency(Number(purchase.amount_paid))}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Balance Due</span><span className="font-bold text-orange-600">{formatCurrency(Number(purchase.balance_due))}</span></div>
        </div>
      </div>

      {purchase.remarks && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Remarks</h3>
          <p className="text-sm">{purchase.remarks}</p>
        </div>
      )}
    </div>
  )
}
