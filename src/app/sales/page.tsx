'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Eye, Edit3, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/gst'
import { formatDate } from '@/lib/date'
import { deleteSale } from '@/lib/api/sales'
import { toast } from 'sonner'
export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  useEffect(() => {
    fetchSales()
  }, [statusFilter, dateRange])

  async function fetchSales() {
    setLoading(true)
    try {
      let query = supabase
        .from('sales')
        .select('*, client:parties!client_id(name, phone), remarks')
        .order('invoice_date', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('payment_status', statusFilter)
      }
      if (dateRange.start) query = query.gte('invoice_date', dateRange.start)
      if (dateRange.end) query = query.lte('invoice_date', dateRange.end)

      const { data, error } = await query
      if (error) throw error
      setSales(data || [])
    } catch (error) {
      console.error('Error fetching sales:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, invoice: string) {
    if (!confirm(`Are you sure you want to delete sale ${invoice}?`)) return
    try {
      await deleteSale(id)
      toast.success('Sale deleted')
      fetchSales()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-gray-500 text-sm mt-1">Manage sales invoices and client payments</p>
        </div>
        <Link href="/sales/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-5 h-5" /> New Sale
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex gap-2">
            <input type="date" value={dateRange.start} onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm" />
            <input type="date" value={dateRange.end} onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border rounded-lg text-sm">
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">No sales found</p>
            <Link href="/sales/new" className="text-blue-600 hover:underline font-medium">Record your first sale</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left bg-gray-50">
                  <th className="p-4 text-sm font-medium text-gray-500">Date</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Invoice #</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Client</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Amount</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Description</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-t hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm">{formatDate(s.invoice_date)}</td>
                    <td className="p-4 text-sm font-medium">{s.sale_number}</td>
                    <td className="p-4 text-sm">{s.client?.name || 'N/A'}</td>
                    <td className="p-4 text-sm font-medium">{formatCurrency(Number(s.total_amount))}</td>
                    <td className="p-4 text-sm text-gray-500 max-w-xs truncate">
                      {s.remarks || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        s.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                        s.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {s.payment_status.charAt(0).toUpperCase() + s.payment_status.slice(1)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Link href={`/sales/${s.id}`} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium">
                          <Eye className="w-4 h-4" /> View
                        </Link>
                        <Link href={`/sales/${s.id}/edit`} className="flex items-center gap-1 text-gray-600 hover:text-gray-700 text-sm">
                          <Edit3 className="w-4 h-4" /> Edit
                        </Link>
                        <button onClick={() => handleDelete(s.id, s.sale_number)} className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm">
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
