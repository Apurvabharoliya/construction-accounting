'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Eye, Trash2, Receipt, ShoppingCart, DollarSign, Banknote, ArrowUp, FileText } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/gst'
import { formatDate, formatDateTime } from '@/lib/date'
import DatePicker from '@/components/ui/DatePicker'
import { toast } from 'sonner'

interface TransactionRow {
  id: string
  party_id: string
  party_name: string
  transaction_type: 'purchase' | 'sale' | 'payment' | 'receipt' | 'subsidy'
  reference_id?: string
  reference_type?: string
  debit: number
  credit: number
  description?: string
  transaction_date: string
  created_at: string
  running_balance: number
}

export default function CashbookPage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  useEffect(() => {
    fetchTransactions()
  }, [dateRange])

  async function fetchTransactions() {
    setLoading(true)
    try {
      let query = supabase
        .from('transactions')
        .select('*, party:parties!party_id(name)')
        .order('transaction_date', { ascending: true })
        .order('created_at', { ascending: true })

      if (dateRange.start) {
        query = query.gte('transaction_date', dateRange.start)
      }
      if (dateRange.end) {
        query = query.lte('transaction_date', dateRange.end)
      }

      const { data, error } = await query
      if (error) throw error

      // Calculate running balance from oldest to newest
      let runningBalance = 0
      const withBalance: TransactionRow[] = (data || []).map((txn: any) => {
        runningBalance = runningBalance + Number(txn.debit) - Number(txn.credit)
        return {
          id: txn.id,
          party_id: txn.party_id,
          party_name: txn.party?.name || 'Unknown',
          transaction_type: txn.transaction_type,
          reference_id: txn.reference_id,
          reference_type: txn.reference_type,
          debit: Number(txn.debit) || 0,
          credit: Number(txn.credit) || 0,
          description: txn.description || '',
          transaction_date: txn.transaction_date,
          created_at: txn.created_at,
          running_balance: runningBalance
        }
      })

      setTransactions(withBalance)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Apply client-side filters for search and type
  const filteredTransactions = useMemo(() => {
    return transactions.filter(txn => {
      // Type filter
      if (typeFilter !== 'all' && txn.transaction_type !== typeFilter) return false

      // Search filter - search by party name or description
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchesParty = txn.party_name.toLowerCase().includes(q)
        const matchesDesc = (txn.description || '').toLowerCase().includes(q)
        const matchesType = txn.transaction_type.toLowerCase().includes(q)
        if (!matchesParty && !matchesDesc && !matchesType) return false
      }

      return true
    })
  }, [transactions, typeFilter, searchQuery])

  // Calculate running balance on filtered set + summary stats
  const { displayTransactions, summary } = useMemo(() => {
    let runningBal = 0
    const withRunningBalance = filteredTransactions.map(txn => {
      runningBal = runningBal + txn.debit - txn.credit
      return { ...txn, running_balance: runningBal }
    })

    let totalDebits = 0
    let totalCredits = 0
    withRunningBalance.forEach(txn => {
      totalDebits += txn.debit
      totalCredits += txn.credit
    })

    return {
      displayTransactions: withRunningBalance,
      summary: {
        totalDebits,
        totalCredits,
        netBalance: totalDebits - totalCredits,
        count: withRunningBalance.length
      }
    }
  }, [filteredTransactions])

  async function handleDelete(txn: TransactionRow) {
    const label = `${txn.transaction_type} entry${txn.description ? ` — ${txn.description}` : ''}`

    // For invoice-type entries (purchase/sale), warn about cascading delete
    if (txn.transaction_type === 'purchase' || txn.transaction_type === 'sale') {
      if (!txn.reference_id) {
        toast.error('Cannot delete: no linked invoice found')
        return
      }
      if (!confirm(`Delete this ${txn.transaction_type} and its associated invoice entirely?\n\nThis will remove the invoice, all items, and related payment entries.\n\nTransaction: ${label}`)) return
      try {
        if (txn.transaction_type === 'purchase') {
          const { deletePurchase } = await import('@/lib/api/purchases')
          await deletePurchase(txn.reference_id)
        } else {
          const { deleteSale } = await import('@/lib/api/sales')
          await deleteSale(txn.reference_id)
        }
        toast.success(`${txn.transaction_type === 'purchase' ? 'Purchase' : 'Sale'} deleted`)
        fetchTransactions()
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete')
      }
      return
    }

    // For payment/receipt entries, just remove the transaction row
    if (!confirm(`Delete this ${txn.transaction_type} entry?\n\n${label}`)) return
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', txn.id)
      if (error) throw error
      toast.success('Transaction entry deleted')
      fetchTransactions()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete transaction')
    }
  }

  function getTransactionLink(txn: TransactionRow): string | null {
    if (txn.reference_id && txn.reference_type === 'purchase') return `/purchases/${txn.reference_id}`
    if (txn.reference_id && txn.reference_type === 'sale') return `/sales/${txn.reference_id}`
    return null
  }

  function getTypeBadge(type: string) {
    const styles: Record<string, string> = {
      purchase: 'bg-orange-50 text-orange-700 ring-orange-600/20',
      sale: 'bg-blue-50 text-blue-700 ring-blue-600/20',
      payment: 'bg-green-50 text-green-700 ring-green-600/20',
      receipt: 'bg-teal-50 text-teal-700 ring-teal-600/20',
      subsidy: 'bg-purple-50 text-purple-700 ring-purple-600/20',
    }
    const icons: Record<string, React.ReactNode> = {
      purchase: <ShoppingCart className="w-3 h-3" />,
      sale: <DollarSign className="w-3 h-3" />,
      payment: <Banknote className="w-3 h-3" />,
      receipt: <Banknote className="w-3 h-3" />,
      subsidy: <DollarSign className="w-3 h-3" />,
    }
    const labels: Record<string, string> = {
      purchase: 'Purchase',
      sale: 'Sale',
      payment: 'Payment',
      receipt: 'Receipt',
      subsidy: 'Subsidy',
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ring-1 ring-inset ${styles[type] || 'bg-gray-100 text-gray-700'}`}>
        {icons[type] || null}
        {labels[type] || type}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cashbook / Ledger</h1>
          <p className="text-gray-500 text-sm mt-1">Complete transaction log with debit/credit entries and running balance</p>
        </div>
        <Link
          href="/purchases/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          New Purchase
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border-l-4 border-blue-500">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Debits</p>
          <p className="text-lg md:text-xl font-bold text-blue-700 mt-1">{formatCurrency(summary.totalDebits)}</p>
          <p className="text-xs text-gray-400 mt-1">{summary.count} entries</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border-l-4 border-green-500">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Credits</p>
          <p className="text-lg md:text-xl font-bold text-green-600 mt-1">{formatCurrency(summary.totalCredits)}</p>
          <p className="text-xs text-gray-400 mt-1">{summary.count} entries</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border-l-4 border-orange-500">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Net Balance</p>
          <p className={`text-lg md:text-xl font-bold mt-1 ${summary.netBalance > 0 ? 'text-orange-600' : summary.netBalance < 0 ? 'text-green-600' : 'text-gray-900'}`}>
            {formatCurrency(Math.abs(summary.netBalance))}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {summary.netBalance > 0 ? 'Net Payable (Dr)' : summary.netBalance < 0 ? 'Net Receivable (Cr)' : 'Settled'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border-l-4 border-purple-500">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</p>
          <p className="text-lg md:text-xl font-bold text-gray-900 mt-1">{transactions.length}</p>
          <p className="text-xs text-gray-400 mt-1">
            {transactions.filter(t => t.transaction_type === 'purchase' || t.transaction_type === 'sale').length} invoices
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by party name, description, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <DatePicker value={dateRange.start} onChange={(v) => setDateRange(prev => ({ ...prev, start: v }))} />
            <DatePicker value={dateRange.end} onChange={(v) => setDateRange(prev => ({ ...prev, end: v }))} />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm bg-white min-w-[140px]"
          >
            <option value="all">All Types</option>
            <option value="purchase">Purchases</option>
            <option value="sale">Sales</option>
            <option value="payment">Payments</option>
            <option value="receipt">Receipts</option>
            <option value="subsidy">Subsidies</option>
          </select>
        </div>
      </div>

      {/* Cashbook Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-semibold">Cashbook Statement</h2>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-400">
                {filteredTransactions.length !== transactions.length
                  ? `${filteredTransactions.length} of ${transactions.length} entries`
                  : `${transactions.length} entries`}
              </span>
              <span className={`font-semibold ${summary.netBalance > 0 ? 'text-orange-600' : summary.netBalance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                Bal: {formatCurrency(Math.abs(summary.netBalance))} {summary.netBalance > 0 ? 'Dr' : summary.netBalance < 0 ? 'Cr' : ''}
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-1">
              {transactions.length === 0 ? 'No transactions found' : 'No transactions match your filters'}
            </p>
            <p className="text-gray-400 text-sm">
              {transactions.length === 0
                ? 'Record a purchase or sale to see entries here'
                : 'Try adjusting your search or filter criteria'}
            </p>
            {transactions.length === 0 && (
              <Link href="/purchases/new" className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium text-sm mt-3">
                <Plus className="w-4 h-4" /> Record your first transaction
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3 pl-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Party</th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="p-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Debit (₹)</th>
                  <th className="p-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Credit (₹)</th>
                  <th className="p-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider pr-5">Running Balance</th>
                  <th className="p-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayTransactions.map((txn, idx) => {
                  const isInvoiceType = txn.transaction_type === 'purchase' || txn.transaction_type === 'sale'
                  const isPaymentType = txn.transaction_type === 'payment' || txn.transaction_type === 'receipt'
                  const link = getTransactionLink(txn)

                  return (
                    <tr
                      key={txn.id}
                      className={`transition-colors group ${
                        isPaymentType
                          ? 'bg-green-50/30 hover:bg-green-50/70'
                          : isInvoiceType
                            ? 'hover:bg-gray-50/80'
                            : 'hover:bg-gray-50/50'
                      }`}
                    >
                      {/* Row number */}
                      <td className="p-3 pl-5 text-xs text-gray-400 font-mono w-10">{idx + 1}</td>

                      {/* Date */}
                      <td className="p-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(txn.transaction_date)}
                        {txn.created_at && (
                          <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(txn.created_at)}</div>
                        )}
                      </td>

                      {/* Description */}
                      <td className="p-3">
                        {link && isInvoiceType ? (
                          <Link
                            href={link}
                            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[180px]">{txn.description || 'View Invoice'}</span>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-1.5 text-sm text-gray-700">
                            {isPaymentType && <ArrowUp className="w-3.5 h-3.5 text-green-600 shrink-0" />}
                            <span className="truncate max-w-[200px]">{txn.description || '—'}</span>
                          </div>
                        )}
                      </td>

                      {/* Party */}
                      <td className="p-3">
                        <Link
                          href={`/parties/${txn.party_id}`}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {txn.party_name}
                        </Link>
                      </td>

                      {/* Type Badge */}
                      <td className="p-3">
                        {getTypeBadge(txn.transaction_type)}
                      </td>

                      {/* Debit */}
                      <td className="p-3 text-sm font-medium text-right whitespace-nowrap">
                        {txn.debit > 0 ? (
                          <span className="text-red-600 font-semibold">{formatCurrency(txn.debit)}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Credit */}
                      <td className="p-3 text-sm font-medium text-right whitespace-nowrap">
                        {txn.credit > 0 ? (
                          <span className="text-green-600 font-semibold">{formatCurrency(txn.credit)}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Running Balance */}
                      <td className="p-3 pr-5 text-sm font-semibold text-right whitespace-nowrap border-l-2 border-gray-200">
                        <span className={txn.running_balance > 0 ? 'text-gray-900' : txn.running_balance < 0 ? 'text-red-600' : 'text-green-600'}>
                          {txn.running_balance === 0 ? '—' : (
                            <>
                              {formatCurrency(Math.abs(txn.running_balance))}
                              <span className="text-xs ml-0.5 font-normal">
                                {txn.running_balance > 0 ? 'Dr' : 'Cr'}
                              </span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {link && (
                            <Link
                              href={link}
                              className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View invoice"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          )}
                          <button
                            onClick={() => handleDelete(txn)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              txn.transaction_type === 'purchase' || txn.transaction_type === 'sale'
                                ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
                                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title={txn.transaction_type === 'purchase' || txn.transaction_type === 'sale' ? 'Delete invoice and all related entries' : 'Delete this entry'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
