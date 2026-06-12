'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getPartyLedger, getPartyInvoices, type InvoiceSummary } from '@/lib/api/ledger'
import { formatCurrency } from '@/lib/gst'
import { formatDate } from '@/lib/date'
import DatePicker from '@/components/ui/DatePicker'
import { ArrowLeft, ShoppingCart, DollarSign, Banknote, Receipt, AlertCircle, ChevronDown, ChevronRight, FileText } from 'lucide-react'
import Link from 'next/link'
import type { Party } from '@/types/database'
import RecordPaymentDialog from '@/components/payments/RecordPaymentDialog'

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'bg-green-100 text-green-700 ring-green-600/20',
    partial: 'bg-yellow-100 text-yellow-700 ring-yellow-600/20',
    unpaid: 'bg-red-100 text-red-700 ring-red-600/20',
  }
  const s = styles[status] || styles.unpaid
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${s}`}>
      {status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Unpaid'}
    </span>
  )
}

function PaymentProgress({ paid, total }: { paid: number; total: number }) {
  const percentage = total > 0 ? Math.min((paid / total) * 100, 100) : 0
  const roundedPct = Math.round(percentage)
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            roundedPct >= 100 ? 'bg-green-500' : roundedPct > 0 ? 'bg-yellow-400' : 'bg-red-400'
          }`}
          style={{ width: `${roundedPct}%` }}
        />
      </div>
      <span className={`text-xs font-semibold min-w-[32px] text-right ${
        roundedPct >= 100 ? 'text-green-600' : roundedPct > 0 ? 'text-yellow-600' : 'text-red-600'
      }`}>
        {roundedPct}%
      </span>
    </div>
  )
}

export default function LedgerReportPage() {
  const params = useParams()
  const [party, setParty] = useState<Party | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [currentBalance, setCurrentBalance] = useState(0)
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set())
  const [paymentDialogInvoice, setPaymentDialogInvoice] = useState<InvoiceSummary | null>(null)

  useEffect(() => {
    if (params.partyId) {
      fetchData()
    }
  }, [params.partyId, dateRange])

  async function fetchData() {
    setLoading(true)
    try {
      const { data: partyData } = await supabase
        .from('parties')
        .select('*')
        .eq('id', params.partyId)
        .single()

      setParty(partyData)

      const [ledgerData, invoiceData] = await Promise.all([
        getPartyLedger(params.partyId as string, {
          startDate: dateRange.start || undefined,
          endDate: dateRange.end || undefined
        }),
        getPartyInvoices(params.partyId as string, partyData?.party_type || 'supplier')
      ])
      setTransactions(ledgerData.transactions)
      setCurrentBalance(ledgerData.currentBalance)
      setInvoices(invoiceData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group transactions by reference_id for invoice-wise view
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, { invoice?: InvoiceSummary; transactions: any[] }> = {
      unlinked: { transactions: [] }
    }

    // Build a map of invoice ID -> invoice summary
    const invoiceMap = new Map<string, InvoiceSummary>()
    invoices.forEach(inv => invoiceMap.set(inv.id, inv))

    transactions.forEach(txn => {
      const refId = txn.reference_id
      if (refId && invoiceMap.has(refId)) {
        if (!groups[refId]) {
          groups[refId] = { invoice: invoiceMap.get(refId), transactions: [] }
        }
        groups[refId].transactions.push(txn)
      } else {
        groups['unlinked'].transactions.push(txn)
      }
    })

    // Remove unlinked group if empty
    if (groups['unlinked'].transactions.length === 0) {
      delete groups['unlinked']
    }

    return groups
  }, [transactions, invoices])

  // Calculate summary stats
  const summary = useMemo(() => {
    let totalDebits = 0
    let totalCredits = 0
    transactions.forEach(txn => {
      totalDebits += Number(txn.debit)
      totalCredits += Number(txn.credit)
    })
    return { totalDebits, totalCredits }
  }, [transactions])

  const isSupplier = party?.party_type === 'supplier'

  function toggleInvoice(id: string) {
    setExpandedInvoices(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/reports" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Party Ledger</h1>
          <p className="text-gray-500 text-sm mt-1 capitalize">{party?.name || 'Loading...'} • {party?.party_type}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Current Balance</p>
          <p className={`text-xl font-bold ${currentBalance > 0 ? 'text-green-600' : currentBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {currentBalance > 0 ? (isSupplier ? 'We owe ' : 'They owe ') : ''}{formatCurrency(Math.abs(currentBalance))}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex gap-4">
          <DatePicker value={dateRange.start} onChange={(v) => setDateRange(p => ({ ...p, start: v }))} className="bg-white" />
          <DatePicker value={dateRange.end} onChange={(v) => setDateRange(p => ({ ...p, end: v }))} className="bg-white" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {isSupplier ? 'Total Purchases' : 'Total Sales'}
          </p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {formatCurrency(isSupplier ? summary.totalDebits : summary.totalCredits)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {transactions.filter(t => isSupplier ? t.transaction_type === 'purchase' : t.transaction_type === 'sale').length} invoices
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {isSupplier ? 'Total Paid' : 'Total Received'}
          </p>
          <p className="text-xl font-bold text-green-600 mt-1">
            {formatCurrency(isSupplier ? summary.totalCredits : summary.totalDebits)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {transactions.filter(t => isSupplier ? t.transaction_type === 'payment' : t.transaction_type === 'receipt').length} payments
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-orange-500">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Balance</p>
          <p className={`text-xl font-bold mt-1 ${Math.abs(currentBalance) > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
            {formatCurrency(Math.abs(currentBalance))}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {currentBalance > 0 
              ? (isSupplier ? 'Outstanding payable' : 'Outstanding receivable')
              : currentBalance < 0 
                ? (isSupplier ? 'Overpaid (credit)' : 'Overpaid (debit)')
                : 'Settled'
            }
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-purple-500">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Invoices</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {invoices.filter(inv => inv.payment_status !== 'paid').length}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            out of {invoices.length} total
          </p>
        </div>
      </div>

      {/* Invoice-wise Grouped Ledger */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No transactions found for this period</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Invoice Groups */}
          {Object.entries(groupedTransactions).map(([refId, group]) => {
            if (refId === 'unlinked') return null // Handle unlinked separately
            const inv = group.invoice!
            const isExpanded = expandedInvoices.has(refId)
            const balanceDue = group.transactions.reduce((sum, t) => sum + Number(t.debit) - Number(t.credit), 0)

            return (
              <div key={refId} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Invoice Header */}
                <button
                  onClick={() => toggleInvoice(refId)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                  <Link href={inv.link} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 shrink-0">
                    <FileText className="w-4 h-4" />
                    {inv.invoice_number}
                  </Link>
                  <span className="text-xs text-gray-400 shrink-0">{formatDate(inv.invoice_date)}</span>
                  <div className="flex-1" />
                  <div className="hidden sm:flex items-center gap-4">
                    <span className="text-sm text-gray-600">Total: <span className="font-semibold">{formatCurrency(inv.total_amount)}</span></span>
                    <span className="text-sm text-green-600">Paid: <span className="font-semibold">{formatCurrency(inv.amount_paid)}</span></span>
                    {inv.balance_due > 0 && (
                      <span className="text-sm text-orange-600">Pending: <span className="font-semibold">{formatCurrency(inv.balance_due)}</span></span>
                    )}
                  </div>
                  <PaymentProgress paid={inv.amount_paid} total={inv.total_amount} />
                  <StatusBadge status={inv.payment_status} />
                  {inv.balance_due > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPaymentDialogInvoice(inv) }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition-colors border border-green-200 shrink-0"
                    >
                      <Banknote className="w-3.5 h-3.5" /> Pay
                    </button>
                  )}
                </button>

                {/* Expanded Transactions */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left bg-gray-50/80">
                          <th className="p-3 pl-5 text-xs font-medium text-gray-500">Date</th>
                          <th className="p-3 text-xs font-medium text-gray-500">Description</th>
                          <th className="p-3 text-xs font-medium text-gray-500">Type</th>
                          <th className="p-3 text-xs font-medium text-gray-500 text-right">Debit (₹)</th>
                          <th className="p-3 text-xs font-medium text-gray-500 text-right">Credit (₹)</th>
                          <th className="p-3 text-xs font-medium text-gray-500 text-right pr-5">Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.transactions.map((txn: any, i: number) => (
                          <tr key={txn.id} className={`${i < group.transactions.length - 1 ? 'border-b border-gray-50' : ''}`}>
                            <td className="p-3 pl-5 text-sm text-gray-600">{formatDate(txn.transaction_date)}</td>
                            <td className="p-3 text-sm text-gray-800">{txn.description || '-'}</td>
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                txn.transaction_type === 'purchase' ? 'bg-orange-50 text-orange-700' :
                                txn.transaction_type === 'payment' ? 'bg-green-50 text-green-700' :
                                txn.transaction_type === 'sale' ? 'bg-blue-50 text-blue-700' :
                                txn.transaction_type === 'receipt' ? 'bg-teal-50 text-teal-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {txn.transaction_type === 'purchase' && <ShoppingCart className="w-3 h-3" />}
                                {txn.transaction_type === 'payment' && <Banknote className="w-3 h-3" />}
                                {txn.transaction_type === 'sale' && <DollarSign className="w-3 h-3" />}
                                {txn.transaction_type === 'receipt' && <Banknote className="w-3 h-3" />}
                                {txn.transaction_type}
                              </span>
                            </td>
                            <td className="p-3 text-sm font-medium text-red-600 text-right">{txn.debit > 0 ? formatCurrency(txn.debit) : '-'}</td>
                            <td className="p-3 text-sm font-medium text-green-600 text-right">{txn.credit > 0 ? formatCurrency(txn.credit) : '-'}</td>
                            <td className="p-3 pr-5 text-sm font-medium text-right">{formatCurrency(txn.running_balance)}</td>
                          </tr>
                        ))}
                        {/* Summary row for this invoice */}
                        <tr className="bg-gray-50/50 border-t-2 border-gray-100">
                          <td colSpan={3} className="p-3 pl-5 text-sm font-semibold text-gray-700">Invoice Summary</td>
                          <td className="p-3 text-sm font-bold text-red-600 text-right">
                            {group.transactions.some(t => t.transaction_type === (isSupplier ? 'purchase' : 'sale')) 
                              ? formatCurrency(inv.total_amount) : '-'}
                          </td>
                          <td className="p-3 text-sm font-bold text-green-600 text-right">
                            {group.transactions.some(t => t.transaction_type === (isSupplier ? 'payment' : 'receipt'))
                              ? formatCurrency(inv.amount_paid) : '-'}
                          </td>
                          <td className="p-3 pr-5 text-sm font-bold text-right">
                            {inv.balance_due > 0 ? (
                              <span className="text-orange-600">{formatCurrency(inv.balance_due)}</span>
                            ) : (
                              <span className="text-green-600">Settled</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}

          {/* Unlinked Transactions */}
          {groupedTransactions['unlinked'] && groupedTransactions['unlinked'].transactions.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gray-50/80 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-700">Other Transactions</h3>
                  <span className="text-xs text-gray-400">({groupedTransactions['unlinked'].transactions.length})</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left bg-gray-50/50">
                      <th className="p-3 pl-5 text-xs font-medium text-gray-500">Date</th>
                      <th className="p-3 text-xs font-medium text-gray-500">Description</th>
                      <th className="p-3 text-xs font-medium text-gray-500">Type</th>
                      <th className="p-3 text-xs font-medium text-gray-500 text-right">Debit (₹)</th>
                      <th className="p-3 text-xs font-medium text-gray-500 text-right">Credit (₹)</th>
                      <th className="p-3 text-xs font-medium text-gray-500 text-right pr-5">Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedTransactions['unlinked'].transactions.map((txn: any, i: number) => (
                      <tr key={txn.id} className={i < groupedTransactions['unlinked'].transactions.length - 1 ? 'border-b border-gray-50' : ''}>
                        <td className="p-3 pl-5 text-sm text-gray-600">{formatDate(txn.transaction_date)}</td>
                        <td className="p-3 text-sm text-gray-800">{txn.description || '-'}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                            {txn.transaction_type}
                          </span>
                        </td>
                        <td className="p-3 text-sm font-medium text-red-600 text-right">{txn.debit > 0 ? formatCurrency(txn.debit) : '-'}</td>
                        <td className="p-3 text-sm font-medium text-green-600 text-right">{txn.credit > 0 ? formatCurrency(txn.credit) : '-'}</td>
                        <td className="p-3 pr-5 text-sm font-medium text-right">{formatCurrency(txn.running_balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Full Transaction Log (collapsible) */}
          <details className="bg-white rounded-xl shadow-sm overflow-hidden">
            <summary className="px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-gray-400" />
              Complete Transaction Log ({transactions.length} entries)
            </summary>
            <div className="overflow-x-auto border-t border-gray-100">
              <table className="w-full">
                <thead>
                  <tr className="text-left bg-gray-50/80">
                    <th className="p-3 pl-5 text-xs font-medium text-gray-500">Date</th>
                    <th className="p-3 text-xs font-medium text-gray-500">Description</th>
                    <th className="p-3 text-xs font-medium text-gray-500">Type</th>
                    <th className="p-3 text-xs font-medium text-gray-500 text-right">Debit (₹)</th>
                    <th className="p-3 text-xs font-medium text-gray-500 text-right">Credit (₹)</th>
                    <th className="p-3 text-xs font-medium text-gray-500 text-right pr-5">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn: any, i: number) => (
                    <tr key={txn.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-gray-100/50 transition-colors`}>
                      <td className="p-3 pl-5 text-sm">{formatDate(txn.transaction_date)}</td>
                      <td className="p-3 text-sm text-gray-800">{txn.description || '-'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                          txn.transaction_type === 'purchase' ? 'bg-orange-50 text-orange-700' :
                          txn.transaction_type === 'payment' ? 'bg-green-50 text-green-700' :
                          txn.transaction_type === 'sale' ? 'bg-blue-50 text-blue-700' :
                          txn.transaction_type === 'receipt' ? 'bg-teal-50 text-teal-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {txn.transaction_type}
                        </span>
                      </td>
                      <td className="p-3 text-sm font-medium text-red-600 text-right">{txn.debit > 0 ? formatCurrency(txn.debit) : '-'}</td>
                      <td className="p-3 text-sm font-medium text-green-600 text-right">{txn.credit > 0 ? formatCurrency(txn.credit) : '-'}</td>
                      <td className="p-3 pr-5 text-sm font-medium text-right">{formatCurrency(txn.running_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      {/* Record Payment Dialog */}
      {paymentDialogInvoice && (
        <RecordPaymentDialog
          invoice={paymentDialogInvoice}
          partyName={party?.name || ''}
          partyId={party?.id || ''}
          open={!!paymentDialogInvoice}
          onOpenChange={(open) => { if (!open) setPaymentDialogInvoice(null) }}
          onSuccess={() => fetchData()}
        />
      )}
    </div>
  )
}
