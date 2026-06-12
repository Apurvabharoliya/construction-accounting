'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Eye, Edit3, Trash2, ChevronDown, ChevronRight, ShoppingCart, Banknote, FileText } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/gst'
import { formatDate, formatDateTime } from '@/lib/date'
import DatePicker from '@/components/ui/DatePicker'
import { deletePurchase } from '@/lib/api/purchases'
import { toast } from 'sonner'
import { getPartyLedger } from '@/lib/api/ledger'

export default function TransactionsPage() {
  const [purchases, setPurchases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [paymentTxns, setPaymentTxns] = useState<Record<string, any[]>>({})

  useEffect(() => {
    fetchPurchases()
  }, [searchQuery, statusFilter, dateRange])

  async function fetchPurchases() {
    setLoading(true)
    try {
      let query = supabase
        .from('purchases')
        .select('*, supplier:parties!supplier_id(name, phone), remarks')
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
      
      // Fetch payment transactions for each purchase
      if (data && data.length > 0) {
        const ids = data.map(p => p.id)
        const { data: txnData } = await supabase
          .from('transactions')
          .select('*')
          .in('reference_id', ids)
          .eq('reference_type', 'purchase')
          .in('transaction_type', ['payment', 'purchase'])
          .order('created_at', { ascending: true })
        
        const txnMap: Record<string, any[]> = {}
        txnData?.forEach((t: any) => {
          if (!txnMap[t.reference_id]) txnMap[t.reference_id] = []
          txnMap[t.reference_id].push(t)
        })
        setPaymentTxns(txnMap)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, invoice: string) {
    if (!confirm(`Are you sure you want to delete transaction ${invoice}?`)) return
    try {
      await deletePurchase(id)
      toast.success('Transaction deleted')
      fetchPurchases()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  function toggleRow(id: string) {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-500 text-sm mt-1">Manage all purchase transactions and payments</p>
        </div>
        <Link
          href="/purchases/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Transaction
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by transaction number or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            />
          </div>
          <div className="flex gap-2">
            <DatePicker value={dateRange.start} onChange={(v) => setDateRange(prev => ({ ...prev, start: v }))} />
            <DatePicker value={dateRange.end} onChange={(v) => setDateRange(prev => ({ ...prev, end: v }))} />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
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
            <p className="text-gray-500 mb-4">No transactions found</p>
            <Link href="/purchases/new" className="text-blue-600 hover:underline font-medium">Record your first transaction</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {purchases.map((p) => {
              const isExpanded = expandedRows.has(p.id)
              const txns = paymentTxns[p.id] || []
              const purchaseTxn = txns.find(t => t.transaction_type === 'purchase')
              const paymentTxn = txns.find(t => t.transaction_type === 'payment')

              return (
                <div key={p.id} className="transition-colors hover:bg-gray-50/50">
                  {/* Main Row (clickable) */}
                  <button
                    onClick={() => toggleRow(p.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                  >
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{p.supplier?.name || 'N/A'}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          p.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {p.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{formatDate(p.invoice_date)}</span>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-gray-400">{formatDateTime(p.created_at)}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(p.total_amount))}</p>
                      {Number(p.balance_due) > 0 && (
                        <p className="text-xs text-orange-600 font-medium">Due: {formatCurrency(Number(p.balance_due))}</p>
                      )}
                      {Number(p.balance_due) <= 0 && Number(p.total_amount) > 0 && (
                        <p className="text-xs text-green-600 font-medium">Settled</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/purchases/${p.id}`} className="p-1.5 text-blue-600 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-colors" title="View">
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link href={`/purchases/${p.id}/edit`} className="p-1.5 text-gray-600 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors" title="Edit">
                        <Edit3 className="w-4 h-4" />
                      </Link>
                      <button onClick={() => handleDelete(p.id, p.purchase_number)} className="p-1.5 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="bg-gray-50/70 border-t border-gray-100">
                      <div className="p-4 space-y-3">
                        {/* Purchase Entry */}
                        {purchaseTxn && (
                          <div className="bg-white rounded-lg border border-blue-100 p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <ShoppingCart className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-semibold text-blue-700">Purchase Entry</span>
                              <span className="text-xs text-gray-400">({p.purchase_number})</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Amount:</span>
                                <span className="ml-1 font-medium text-gray-900">{formatCurrency(Number(p.total_amount))}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Debit:</span>
                                <span className="ml-1 font-medium text-red-600">{formatCurrency(Number(purchaseTxn.debit))}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Date:</span>
                                <span className="ml-1 font-medium text-gray-900">{formatDate(p.invoice_date)}</span>
                              </div>
                            </div>

                          </div>
                        )}

                        {/* Payment Entry */}
                        {paymentTxn ? (
                          <div className="bg-white rounded-lg border border-green-100 p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Banknote className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-semibold text-green-700">Payment Entry</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Amount:</span>
                                <span className="ml-1 font-medium text-gray-900">{formatCurrency(Number(paymentTxn.credit))}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Credit:</span>
                                <span className="ml-1 font-medium text-green-600">{formatCurrency(Number(paymentTxn.credit))}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Date:</span>
                                <span className="ml-1 font-medium text-gray-900">{formatDate(paymentTxn.transaction_date)}</span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{paymentTxn.description || ''}</p>
                          </div>
                        ) : p.payment_status === 'unpaid' && Number(p.balance_due) > 0 ? (
                          <div className="bg-white rounded-lg border border-orange-100 p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Banknote className="w-4 h-4 text-orange-500" />
                              <span className="text-sm font-semibold text-orange-700">Payment Pending</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Balance due: <span className="font-medium text-orange-600">{formatCurrency(Number(p.balance_due))}</span>
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
