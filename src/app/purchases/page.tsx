'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Eye, Edit3, Trash2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/gst'
import { formatDate } from '@/lib/date'
import { deletePurchase } from '@/lib/api/purchases'
import { toast } from 'sonner'
import { useAiDescriptions } from '@/lib/hooks/useAiDescriptions'

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  useEffect(() => {
    fetchPurchases()
  }, [searchQuery, statusFilter, dateRange])

  async function fetchPurchases() {
    setLoading(true)
    try {
      let query = supabase
        .from('purchases')
        .select('*, supplier:parties!supplier_id(name, phone)')
        .order('invoice_date', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('payment_status', statusFilter)
      }
      if (dateRange.start) {
        query = query.gte('invoice_date', dateRange.start)
      }
      if (dateRange.end) {
        query = query.lte('invoice_date', dateRange.end)
      }
      if (searchQuery) {
        query = query.ilike('purchase_number', `%${searchQuery}%`)
      }

      const { data, error } = await query
      if (error) throw error
      setPurchases(data || [])
    } catch (error) {
      console.error('Error fetching purchases:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, invoice: string) {
    if (!confirm(`Are you sure you want to delete purchase ${invoice}?`)) return
    try {
      await deletePurchase(id)
      toast.success('Purchase deleted')
      fetchPurchases()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const { descriptions: aiDescs, loading: aiLoading } = useAiDescriptions({
    records: purchases,
    type: 'purchase',
    enabled: purchases.length > 0
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
          <p className="text-gray-500 text-sm mt-1">Manage material purchases from suppliers</p>
        </div>
        <Link
          href="/purchases/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Purchase
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by purchase number or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm"
          >
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
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : purchases.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">No purchases found</p>
            <Link href="/purchases/new" className="text-blue-600 hover:underline font-medium">Record your first purchase</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left bg-gray-50">
                  <th className="p-4 text-sm font-medium text-gray-500">Date</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Invoice #</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Supplier</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Amount</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Description</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm">{formatDate(p.invoice_date)}</td>
                    <td className="p-4 text-sm font-medium">{p.purchase_number}</td>
                    <td className="p-4 text-sm">{p.supplier?.name || 'N/A'}</td>
                    <td className="p-4 text-sm font-medium">{formatCurrency(Number(p.total_amount))}</td>
                    <td className="p-4 text-sm text-gray-500 max-w-xs truncate">
                      {aiLoading && !aiDescs[p.id] ? (
                        <span className="flex items-center gap-1 text-gray-400"><Sparkles className="w-3 h-3 animate-pulse" /> Generating...</span>
                      ) : aiDescs[p.id] ? (
                        <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-blue-500 shrink-0" />{aiDescs[p.id]}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        p.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                        p.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {p.payment_status.charAt(0).toUpperCase() + p.payment_status.slice(1)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Link href={`/purchases/${p.id}`} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium">
                          <Eye className="w-4 h-4" /> View
                        </Link>
                        <Link href={`/purchases/${p.id}/edit`} className="flex items-center gap-1 text-gray-600 hover:text-gray-700 text-sm">
                          <Edit3 className="w-4 h-4" /> Edit
                        </Link>
                        <button onClick={() => handleDelete(p.id, p.purchase_number)} className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm">
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
