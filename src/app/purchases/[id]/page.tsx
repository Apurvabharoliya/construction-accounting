'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/gst'
import { formatDate } from '@/lib/date'
import { ArrowLeft, Edit3, Trash2, Banknote, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { deletePurchase } from '@/lib/api/purchases'
import { toast } from 'sonner'

export default function PurchaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [purchase, setPurchase] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [transactions, setTransactions] = useState<any[]>([])

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

      // Fetch related payment transactions
      if (data) {
        const { data: txnData } = await supabase
          .from('transactions')
          .select('*')
          .eq('reference_id', params.id)
          .eq('reference_type', 'purchase')
          .order('created_at', { ascending: true })
        setTransactions(txnData || [])
      }
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
          <p className="text-gray-500 text-sm">{purchase.supplier?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => {
            if (confirm(`Are you sure you want to delete ${purchase.purchase_number}?`)) {
              deletePurchase(purchase.id).then(() => {
                toast.success('Purchase deleted')
                router.push('/purchases')
              }).catch((e: any) => toast.error(e.message))
            }
          }} className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
          <Link href={`/purchases/${purchase.id}/edit`} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
            <Edit3 className="w-4 h-4" /> Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
          <h3 className="text-xs md:text-sm font-medium text-gray-500 mb-1 md:mb-2">Supplier</h3>
          <p className="font-medium text-sm md:text-base">{purchase.supplier?.name}</p>
          {purchase.supplier?.phone && <p className="text-xs md:text-sm text-gray-500">{purchase.supplier.phone}</p>}
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
          <h3 className="text-xs md:text-sm font-medium text-gray-500 mb-1 md:mb-2">Date & Invoice</h3>
          <p className="font-medium text-sm md:text-base">{formatDate(purchase.invoice_date)}</p>
          {purchase.supplier_invoice_number && <p className="text-xs md:text-sm text-gray-500">Supplier Inv: {purchase.supplier_invoice_number}</p>}
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 sm:col-span-2 md:col-span-1">
          <h3 className="text-xs md:text-sm font-medium text-gray-500 mb-1 md:mb-2">Payment Status</h3>
          <span className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-medium ${
            purchase.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {purchase.payment_status.charAt(0).toUpperCase() + purchase.payment_status.slice(1)}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Items</h3>
        <div className="overflow-x-auto -mx-4 md:-mx-0">
          <div className="inline-block min-w-full px-4 md:px-0">
            <table className="w-full responsive-table-card">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-3 pr-3 text-xs md:text-sm font-medium text-gray-500 whitespace-nowrap">Material</th>
                  <th className="pb-3 pr-3 text-xs md:text-sm font-medium text-gray-500 whitespace-nowrap hidden sm:table-cell">HSN</th>
                  <th className="pb-3 pr-3 text-xs md:text-sm font-medium text-gray-500 whitespace-nowrap">Qty</th>
                  <th className="pb-3 pr-3 text-xs md:text-sm font-medium text-gray-500 whitespace-nowrap hidden sm:table-cell">Unit</th>
                  <th className="pb-3 pr-3 text-xs md:text-sm font-medium text-gray-500 whitespace-nowrap">Rate</th>
                  <th className="pb-3 pr-3 text-xs md:text-sm font-medium text-gray-500 whitespace-nowrap">GST</th>
                  <th className="pb-3 text-xs md:text-sm font-medium text-gray-500 whitespace-nowrap">Total</th>
                </tr>
              </thead>
              <tbody>
                {purchase.items?.map((item: any) => (
                  <tr key={item.id} className="border-t">
                    <td className="py-2 md:py-3 pr-3 text-xs md:text-sm" data-label="Material">{item.material_name}</td>
                    <td className="py-2 md:py-3 pr-3 text-xs md:text-sm hidden sm:table-cell" data-label="HSN">{item.hsn_code || '-'}</td>
                    <td className="py-2 md:py-3 pr-3 text-xs md:text-sm" data-label="Qty">{item.quantity}</td>
                    <td className="py-2 md:py-3 pr-3 text-xs md:text-sm hidden sm:table-cell" data-label="Unit">{item.unit}</td>
                    <td className="py-2 md:py-3 pr-3 text-xs md:text-sm" data-label="Rate">{formatCurrency(item.rate)}</td>
                    <td className="py-2 md:py-3 pr-3 text-xs md:text-sm" data-label="GST">{item.gst_rate}%</td>
                    <td className="py-2 md:py-3 text-xs md:text-sm font-medium" data-label="Total">{formatCurrency(Number(item.amount) + Number(item.gst_amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Summary</h3>
        <div className="max-w-md space-y-2 md:space-y-3 text-sm md:text-base">
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
          <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
          <p className="text-sm">{purchase.remarks}</p>
        </div>
      )}

      {/* Payment History */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-gray-500" />
            Payment & Transaction History
          </h3>
          <div className="overflow-x-auto -mx-4 md:-mx-0">
            <div className="inline-block min-w-full px-4 md:px-0">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b">
                    <th className="pb-3 pr-3 text-xs md:text-sm font-medium text-gray-500 whitespace-nowrap">Date</th>
                    <th className="pb-3 pr-3 text-xs md:text-sm font-medium text-gray-500 whitespace-nowrap">Description</th>
                    <th className="pb-3 pr-3 text-xs md:text-sm font-medium text-gray-500 whitespace-nowrap">Type</th>
                    <th className="pb-3 pr-3 text-xs md:text-sm font-medium text-gray-500 text-right whitespace-nowrap">Debit (₹)</th>
                    <th className="pb-3 text-xs md:text-sm font-medium text-gray-500 text-right whitespace-nowrap">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn: any) => (
                    <tr key={txn.id} className="border-t hover:bg-gray-50/50">
                      <td className="py-2 md:py-3 pr-3 text-xs md:text-sm text-gray-600">{formatDate(txn.transaction_date)}</td>
                      <td className="py-2 md:py-3 pr-3 text-xs md:text-sm text-gray-800">{txn.description || '-'}</td>
                      <td className="py-2 md:py-3 pr-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          txn.transaction_type === 'purchase' ? 'bg-orange-50 text-orange-700' :
                          txn.transaction_type === 'payment' ? 'bg-green-50 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {txn.transaction_type === 'purchase' && <ShoppingCart className="w-3 h-3" />}
                          {txn.transaction_type === 'payment' && <Banknote className="w-3 h-3" />}
                          {txn.transaction_type === 'purchase' ? 'Purchase' : 'Payment'}
                        </span>
                      </td>
                      <td className="py-2 md:py-3 pr-3 text-xs md:text-sm font-medium text-red-600 text-right">{txn.debit > 0 ? formatCurrency(txn.debit) : '-'}</td>
                      <td className="py-2 md:py-3 text-xs md:text-sm font-medium text-green-600 text-right">{txn.credit > 0 ? formatCurrency(txn.credit) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
