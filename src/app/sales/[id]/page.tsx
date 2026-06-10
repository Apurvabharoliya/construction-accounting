'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/gst'
import { formatDate } from '@/lib/date'
import { ArrowLeft, Printer, Edit3, Trash2, FileText } from 'lucide-react'
import Link from 'next/link'
import { deleteSale } from '@/lib/api/sales'
import { toast } from 'sonner'

export default function SaleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [sale, setSale] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) fetchSale()
  }, [params.id])

  async function fetchSale() {
    try {
      const { data } = await supabase
        .from('sales')
        .select('*, client:parties!client_id(*), items:sale_items(*)')
        .eq('id', params.id)
        .single()
      setSale(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const amountInWords = (amount: number) => {
    const numToWord = (n: number): string => {
      if (n === 0) return 'Zero'
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
      if (n < 20) return ones[n]
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWord(n % 100) : '')
      if (n < 100000) return numToWord(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWord(n % 1000) : '')
      if (n < 10000000) return numToWord(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWord(n % 100000) : '')
      return numToWord(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numToWord(n % 10000000) : '')
    }
    return numToWord(Math.round(amount)) + ' Rupees Only'
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  )
  
  if (!sale) return (
    <div className="text-center py-12">
      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500 font-medium">Sale not found</p>
    </div>
  )

  return (
    <>
      {/* Action Bar - Hidden when printing */}
      <div className="no-print mb-6">
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/sales')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                {sale.sale_number}
              </h1>
              <p className="text-gray-500 text-sm">Sale to {sale.client?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => {
              if (confirm(`Are you sure you want to delete ${sale.sale_number}?`)) {
                deleteSale(sale.id).then(() => {
                  toast.success('Sale deleted')
                  router.push('/sales')
                }).catch((e: any) => toast.error(e.message))
              }
            }} className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-all text-sm font-medium">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
            <Link href={`/sales/${sale.id}/edit`} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium text-gray-700">
              <Edit3 className="w-4 h-4" />
              Edit
            </Link>
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium shadow-sm">
              <Printer className="w-4 h-4" />
              Print / PDF
            </button>
          </div>
        </div>
      </div>

      {/* Professional Invoice Template */}
      <div className="max-w-[210mm] mx-auto bg-white rounded-xl shadow-sm overflow-hidden print:shadow-none print:rounded-none">
        {/* Invoice Header */}
        <div className="border-b-2 border-gray-200 p-8 pb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">TAX INVOICE</h2>
              <p className="text-sm text-gray-500 mt-1">Original for Recipient</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">{sale.sale_number}</p>
              <p className="text-sm text-gray-500">Date: {formatDate(sale.invoice_date)}</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Party Details */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-gray-50 rounded-lg p-4 border">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bill To</p>
              <p className="font-bold text-gray-900">{sale.client?.name || 'N/A'}</p>
              {sale.client?.address && <p className="text-sm text-gray-600 mt-1">{sale.client.address}</p>}
              {sale.client?.phone && <p className="text-sm text-gray-600 mt-0.5">Phone: {sale.client.phone}</p>}
              {sale.client?.gstin && <p className="text-sm text-gray-600 mt-0.5">GSTIN: {sale.client.gstin}</p>}
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Invoice Details</p>
              <div className="space-y-1">
                <p className="text-sm"><span className="text-gray-500">Invoice No:</span> <span className="font-medium">{sale.sale_number}</span></p>
                <p className="text-sm"><span className="text-gray-500">Date:</span> <span className="font-medium">{formatDate(sale.invoice_date)}</span></p>
                <p className="text-sm"><span className="text-gray-500">Payment Mode:</span> <span className="font-medium">{sale.payment_mode || 'N/A'}</span></p>
                <p className="text-sm"><span className="text-gray-500">Status:</span> 
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    sale.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                    sale.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {sale.payment_status.charAt(0).toUpperCase() + sale.payment_status.slice(1)}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-hidden rounded-lg border mb-8">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">HSN/SAC</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Unit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Rate</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">GST %</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sale.items?.map((item: any, index: number) => (
                  <tr key={item.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50/30 transition-colors`}>
                    <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.item_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.hsn_code || item.sac_code || '—'}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.unit}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.rate)}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.gst_rate}%</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(Number(item.amount) + Number(item.gst_amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Amount in Words</p>
              <p className="text-sm text-gray-600 italic border rounded-lg p-3 bg-gray-50">
                {amountInWords(Number(sale.total_amount))}
              </p>
              {sale.remarks && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                  <p className="text-sm text-gray-600">{sale.remarks}</p>
                </div>
              )}
            </div>
            <div>
              <div className="border rounded-lg overflow-hidden">
                <div className="space-y-2 p-4">
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span>{formatCurrency(Number(sale.subtotal))}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">CGST @ 9%</span><span>{formatCurrency(Number(sale.cgst_amount))}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">SGST @ 9%</span><span>{formatCurrency(Number(sale.sgst_amount))}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">IGST</span><span>{formatCurrency(Number(sale.igst_amount))}</span></div>
                  <div className="flex justify-between border-t-2 pt-2 mt-2">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-bold text-xl text-gray-900">{formatCurrency(Number(sale.total_amount))}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-gray-600">Amount Received</span>
                    <span className="font-medium text-green-600">{formatCurrency(Number(sale.amount_received))}</span>
                  </div>
                  {Number(sale.balance_due) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-medium">Balance Due</span>
                      <span className="font-bold text-orange-600">{formatCurrency(Number(sale.balance_due))}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-sm text-gray-500">This is a computer-generated invoice</p>
            <p className="text-xs text-gray-400 mt-1">Powered by Construction Accounting App</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body { 
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          @page { margin: 15mm; }
        }
      `}</style>
    </>
  )
}
