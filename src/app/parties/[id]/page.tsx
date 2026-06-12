'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Party } from '@/types/database'
import { formatCurrency } from '@/lib/gst'
import { formatDate, formatDateTime } from '@/lib/date'
import { getPartyLedger, getPartyInvoices, type InvoiceSummary } from '@/lib/api/ledger'
import { ArrowLeft, Phone, Mail, MapPin, Edit3, Trash2, ExternalLink, ShoppingCart, DollarSign, Banknote, FileText, Receipt, Plus, ArrowDown, ArrowUp } from 'lucide-react'
import Link from 'next/link'
import { deleteParty } from '@/lib/api/parties'
import { toast } from 'sonner'
import RecordPaymentDialog from '@/components/payments/RecordPaymentDialog'

function PaymentProgress({ paid, total }: { paid: number; total: number }) {
  const percentage = total > 0 ? Math.min((paid / total) * 100, 100) : 0
  const roundedPct = Math.round(percentage)

  return (
    <div className="flex items-center gap-3 min-w-[160px]">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            roundedPct >= 100 ? 'bg-green-500' : roundedPct > 0 ? 'bg-yellow-400' : 'bg-red-400'
          }`}
          style={{ width: `${roundedPct}%` }}
        />
      </div>
      <span className={`text-xs font-semibold min-w-[36px] text-right ${
        roundedPct >= 100 ? 'text-green-600' : roundedPct > 0 ? 'text-yellow-600' : 'text-red-600'
      }`}>
        {roundedPct}%
      </span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    paid: 'bg-green-100 text-green-700 ring-green-600/20',
    unpaid: 'bg-red-100 text-red-700 ring-red-600/20',
  }
  const s = styles[status as keyof typeof styles] || styles.unpaid
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${s}`}>
      {status === 'paid' ? 'Paid' : 'Unpaid'}
    </span>
  )
}

export default function PartyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [party, setParty] = useState<Party | null>(null)
  const [ledger, setLedger] = useState<any[]>([])
  const [currentBalance, setCurrentBalance] = useState(0)
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentDialogInvoice, setPaymentDialogInvoice] = useState<InvoiceSummary | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchParty()
    }
  }, [params.id])

  async function fetchParty() {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      setParty(data)

      const [ledgerData, invoiceData] = await Promise.all([
        getPartyLedger(params.id as string),
        getPartyInvoices(params.id as string, data.party_type)
      ])
      setLedger(ledgerData.transactions)
      setCurrentBalance(ledgerData.currentBalance)
      setInvoices(invoiceData)
    } catch (error) {
      console.error('Error fetching party:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!party) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Vendor not found</p>
        <button onClick={() => router.push('/parties')} className="text-blue-600 hover:underline mt-2">Back to vendors</button>
      </div>
    )
  }

  const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + inv.total_amount, 0)
  const totalPaidAmount = invoices.reduce((sum, inv) => sum + inv.amount_paid, 0)
  const totalBalanceDue = invoices.reduce((sum, inv) => sum + inv.balance_due, 0)

  // Build a merged chronological statement from invoices AND payment transactions
  // This creates a bank-statement-style view where every entry (purchase, payment) is a visible row
  const invoiceById = new Map<string, InvoiceSummary>()
  invoices.forEach(inv => invoiceById.set(inv.id, inv))

  interface StatementRow {
    id: string
    type: 'invoice' | 'payment' | 'other'
    date: string
    createdAt?: string
    invoice?: InvoiceSummary
    transaction?: any
    debit: number
    credit: number
    runningBalance: number
    description: string
    link?: string
    paymentStatus?: string
  }

  const statementRows: StatementRow[] = []
  let runningBal = 0

  // Ledger is already sorted oldest-first from getPartyLedger
  ledger.forEach((txn: any) => {
    const isPurchase = txn.transaction_type === 'purchase' || txn.transaction_type === 'sale'
    const isPayment = txn.transaction_type === 'payment' || txn.transaction_type === 'receipt'

    if (isPurchase && txn.reference_id && invoiceById.has(txn.reference_id)) {
      const inv = invoiceById.get(txn.reference_id)!
      runningBal += inv.total_amount
      statementRows.push({
        id: `inv-${inv.id}`,
        type: 'invoice',
        date: txn.transaction_date,
        createdAt: txn.created_at,
        invoice: inv,
        debit: inv.total_amount,
        credit: 0,
        runningBalance: runningBal,
        description: inv.invoice_number,
        link: inv.link,
        paymentStatus: inv.payment_status
      })
    } else if (isPayment) {
      const amount = txn.credit || txn.debit || 0
      runningBal -= amount
      statementRows.push({
        id: `pay-${txn.id}`,
        type: 'payment',
        date: txn.transaction_date,
        createdAt: txn.created_at,
        transaction: txn,
        debit: 0,
        credit: amount,
        runningBalance: runningBal,
        description: txn.description || 'Payment'
      })
    } else {
      const netChange = (Number(txn.debit) || 0) - (Number(txn.credit) || 0)
      runningBal += netChange
      statementRows.push({
        id: `txn-${txn.id}`,
        type: 'other',
        date: txn.transaction_date,
        createdAt: txn.created_at,
        transaction: txn,
        debit: Number(txn.debit) || 0,
        credit: Number(txn.credit) || 0,
        runningBalance: runningBal,
        description: txn.description || txn.transaction_type
      })
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/parties')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{party.name}</h1>
          <p className="text-gray-500 text-sm capitalize">{party.party_type}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => {
            if (confirm(`Are you sure you want to delete ${party.name}?`)) {
              deleteParty(party.id).then(() => {
                toast.success('Party deleted')
                router.push('/parties')
              }).catch((e: any) => toast.error(e.message))
            }
          }} className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
          <Link href={`/parties/${party.id}/edit`} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
            <Edit3 className="w-4 h-4" /> Edit
          </Link>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h3>
          <div className="space-y-2">
            {party.phone && (
              <p className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                {party.phone}
              </p>
            )}
            {party.email && (
              <p className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                {party.email}
              </p>
            )}
            {(party.city || party.state) && (
              <p className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                {party.city}{party.state ? `, ${party.state}` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">GST Details</h3>
          <div className="space-y-2">
            <p className="text-sm">GSTIN: <span className="font-medium">{party.gstin || 'N/A'}</span></p>
            <p className="text-sm">PAN: <span className="font-medium">{party.pan || 'N/A'}</span></p>
            <p className="text-sm">Registered: <span className={`font-medium ${party.gst_registered ? 'text-green-600' : 'text-red-600'}`}>
              {party.gst_registered ? 'Yes' : 'No'}
            </span></p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Balance</h3>
          <p className={`text-2xl font-bold ${currentBalance === 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(currentBalance)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {currentBalance === 0 ? 'All settled — no outstanding amount' : 'Outstanding balance pending'}
          </p>
        </div>

        {/* Invoice Summary Card */}
        <div className={`rounded-xl shadow-sm p-6 border ${totalBalanceDue === 0 ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'}`}>
          <h3 className={`text-sm font-medium mb-2 ${totalBalanceDue === 0 ? 'text-green-700' : 'text-red-700'}`}>
            {party.party_type === 'supplier' ? 'Purchase Summary' : 'Sale Summary'}
          </h3>
          <div className="space-y-1.5">
            <p className="text-xs text-gray-600">Total Invoices: <span className="font-bold text-gray-800">{invoices.length}</span></p>
            <p className="text-xs text-gray-600">Total Amount: <span className="font-bold text-gray-800">{formatCurrency(totalInvoiceAmount)}</span></p>
            <p className="text-xs text-green-600">Total Paid: <span className="font-bold">{formatCurrency(totalPaidAmount)}</span></p>
            <p className={`text-xs ${totalBalanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
              Balance Due: <span className="font-bold">{totalBalanceDue > 0 ? formatCurrency(totalBalanceDue) : '✓ Settled'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Statement / Ledger View (Combines invoices + payments chronologically) */}
      {(statementRows.length > 0 || invoices.length > 0) && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-semibold">
                  {party.party_type === 'supplier' ? 'Ledger Statement' : 'Ledger Statement'}
                </h2>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-400">{statementRows.length} entries</span>
                <span className={`font-semibold ${currentBalance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Balance: {formatCurrency(currentBalance)}
                </span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Debit (₹)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Credit (₹)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Running Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {statementRows.map((row, idx) => {
                  const rowRunningBal = row.runningBalance

                  const isInvoiceRow = row.type === 'invoice'
                  const isPaymentRow = row.type === 'payment'

                  return (
                    <tr 
                      key={row.id} 
                      className={`transition-colors group ${
                        isPaymentRow 
                          ? 'bg-green-50/40 hover:bg-green-50/80' 
                          : isInvoiceRow 
                            ? 'hover:bg-gray-50/80' 
                            : 'hover:bg-gray-50/50'
                      }`}
                    >
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{idx + 1}</td>
                      
                      {/* Description */}
                      <td className="px-4 py-3">
                        {isInvoiceRow && row.invoice ? (
                          <Link href={row.link || '#'} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[160px]">{row.invoice.invoice_number}</span>
                          </Link>
                        ) : isPaymentRow ? (
                          <div className="flex items-center gap-1.5 text-sm text-gray-700">
                            <ArrowUp className="w-3.5 h-3.5 text-green-600 shrink-0" />
                            <span className="truncate max-w-[200px]">{row.description}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-700">{row.description || '-'}</span>
                        )}
                      </td>
                      
                      {/* Date */}
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(row.date)}
                        <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(row.createdAt || row.date)}</div>
                      </td>
                      
                      {/* Type */}
                      <td className="px-4 py-3">
                        {isInvoiceRow && row.invoice ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                            row.invoice.type === 'purchase'
                              ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20'
                              : 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20'
                          }`}>
                            {row.invoice.type === 'purchase' ? <ShoppingCart className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                            {row.invoice.type === 'purchase' ? 'Purchase' : 'Sale'}
                          </span>
                        ) : isPaymentRow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-600/20">
                            <Banknote className="w-3 h-3" />
                            {row.transaction?.transaction_type === 'receipt' ? 'Receipt' : 'Payment'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                            {row.transaction?.transaction_type || 'Other'}
                          </span>
                        )}
                      </td>
                      
                      {/* Debit */}
                      <td className="px-4 py-3 text-sm font-medium text-right whitespace-nowrap">
                        {row.debit > 0 ? (
                          <span className="text-red-600 font-semibold">{formatCurrency(row.debit)}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      
                      {/* Credit */}
                      <td className="px-4 py-3 text-sm font-medium text-right whitespace-nowrap">
                        {row.credit > 0 ? (
                          <span className="text-green-600 font-semibold">{formatCurrency(row.credit)}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      
                      {/* Running Balance */}
                      <td className="px-4 py-3 text-sm font-semibold text-right whitespace-nowrap border-l-2 border-gray-200">
                        <span className={rowRunningBal > 0 ? 'text-gray-900' : rowRunningBal < 0 ? 'text-red-600' : 'text-green-600'}>
                          {formatCurrency(rowRunningBal)}
                        </span>
                      </td>
                      
                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isInvoiceRow && row.invoice && row.invoice.balance_due > 0 && (
                            <button
                              onClick={() => setPaymentDialogInvoice(row.invoice!)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Plus className="w-3 h-3" /> Pay
                            </button>
                          )}
                          {isInvoiceRow && row.link && (
                            <Link
                              href={row.link}
                              className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-all ml-1"
                            >
                              View <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice-wise Ledger Sections */}
      {(() => {
        // Group transactions by reference_id
        const invoiceMap = new Map<string, any>()
        invoices.forEach(inv => invoiceMap.set(inv.id, inv))

        const groups: Record<string, { invoice?: any; transactions: any[] }> = {
          unlinked: { transactions: [] }
        }
        ledger.forEach((txn: any) => {
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
        if (groups['unlinked'].transactions.length === 0) delete groups['unlinked']

        const isSupplier = party?.party_type === 'supplier'
        const groupEntries = Object.entries(groups)

        if (groupEntries.length === 0) {
          return <div className="bg-white rounded-xl shadow-sm p-6"><p className="text-center text-gray-500 py-8">No transactions yet</p></div>
        }

        return (
          <div className="space-y-3">
            {/* Summary cards for the ledger */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-4 border border-blue-100">
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">{isSupplier ? 'Total Purchases' : 'Total Sales'}</p>
                <p className="text-lg font-bold text-blue-700 mt-1">
                  {formatCurrency(ledger.filter((t: any) => isSupplier ? t.transaction_type === 'purchase' : t.transaction_type === 'sale').reduce((s: number, t: any) => s + Number(t.debit || t.credit), 0))}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-4 border border-green-100">
                <p className="text-xs font-medium text-green-600 uppercase tracking-wider">{isSupplier ? 'Total Paid' : 'Total Received'}</p>
                <p className="text-lg font-bold text-green-700 mt-1">
                  {formatCurrency(ledger.filter((t: any) => isSupplier ? t.transaction_type === 'payment' : t.transaction_type === 'receipt').reduce((s: number, t: any) => s + Number(t.debit || t.credit), 0))}
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-lg p-4 border border-orange-100">
                <p className="text-xs font-medium text-orange-600 uppercase tracking-wider">Pending Balance</p>
                <p className="text-lg font-bold text-orange-700 mt-1">
                  {formatCurrency(Math.abs(currentBalance))}
                </p>
              </div>
            </div>

            {groupEntries.map(([refId, group]) => {
              if (refId === 'unlinked') {
                return (
                  <div key="unlinked" className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <h4 className="text-sm font-semibold text-gray-600">Other Transactions ({group.transactions.length})</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left bg-gray-50/50">
                            <th className="p-2.5 pl-4 text-xs font-medium text-gray-500">Date</th>
                            <th className="p-2.5 text-xs font-medium text-gray-500">Description</th>
                            <th className="p-2.5 text-xs font-medium text-gray-500">Type</th>
                            <th className="p-2.5 text-xs font-medium text-gray-500 text-right">Debit</th>
                            <th className="p-2.5 text-xs font-medium text-gray-500 text-right">Credit</th>
                            <th className="p-2.5 text-xs font-medium text-gray-500 text-right pr-4">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {group.transactions.map((txn: any) => (
                            <tr key={txn.id} className="hover:bg-gray-50/50">
                            <td className="p-2.5 pl-4 text-sm text-gray-600">
                              {formatDate(txn.transaction_date)}
                              <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(txn.created_at)}</div>
                            </td>
                            <td className="p-2.5 text-sm text-gray-800">{txn.description || '-'}</td>
                            <td className="p-2.5"><span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded capitalize">{txn.transaction_type}</span></td>
                              <td className="p-2.5 text-sm font-medium text-red-600 text-right">{txn.debit > 0 ? formatCurrency(txn.debit) : '-'}</td>
                              <td className="p-2.5 text-sm font-medium text-green-600 text-right">{txn.credit > 0 ? formatCurrency(txn.credit) : '-'}</td>
                              <td className="p-2.5 pr-4 text-sm font-medium text-right">{formatCurrency(txn.running_balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              }

              const inv = group.invoice!
              return (
                <div key={refId} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                  {/* Invoice Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Link href={inv.link} className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
                        <FileText className="w-3.5 h-3.5" />
                        {inv.invoice_number}
                      </Link>
                      <span className="text-xs text-gray-400">{formatDate(inv.invoice_date)}</span>
                  <span className="text-xs text-gray-400">—</span>
                  <span className="text-xs text-gray-500">Total: <span className="font-semibold text-gray-700">{formatCurrency(inv.total_amount)}</span></span>
                  <span className="text-xs text-green-600">Paid: <span className="font-semibold">{formatCurrency(inv.amount_paid)}</span></span>
                  {inv.balance_due > 0 && (
                    <span className="text-xs text-orange-600 font-semibold">Pending: {formatCurrency(inv.balance_due)}</span>
                  )}
                  <StatusBadge status={inv.payment_status} />
                  {inv.balance_due > 0 && (
                    <button
                      onClick={() => setPaymentDialogInvoice(inv)}
                      className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-lg transition-colors border border-green-200"
                    >
                      <Banknote className="w-3.5 h-3.5" /> Record Payment
                    </button>
                  )}
                    </div>
                  </div>

                  {/* Invoice Transactions */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left bg-gray-50/50">
                          <th className="p-2.5 pl-4 text-xs font-medium text-gray-500">Date</th>
                          <th className="p-2.5 text-xs font-medium text-gray-500">Description</th>
                          <th className="p-2.5 text-xs font-medium text-gray-500">Type</th>
                          <th className="p-2.5 text-xs font-medium text-gray-500 text-right">Debit</th>
                          <th className="p-2.5 text-xs font-medium text-gray-500 text-right">Credit</th>
                          <th className="p-2.5 text-xs font-medium text-gray-500 text-right pr-4">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {group.transactions.map((txn: any) => (
                          <tr key={txn.id} className="hover:bg-gray-50/50">
                            <td className="p-2.5 pl-4 text-sm text-gray-600">
                              {formatDate(txn.transaction_date)}
                              <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(txn.created_at)}</div>
                            </td>
                            <td className="p-2.5 text-sm text-gray-800">{txn.description || '-'}</td>
                            <td className="p-2.5">
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
                            <td className="p-2.5 text-sm font-medium text-red-600 text-right">{txn.debit > 0 ? formatCurrency(txn.debit) : '-'}</td>
                            <td className="p-2.5 text-sm font-medium text-green-600 text-right">{txn.credit > 0 ? formatCurrency(txn.credit) : '-'}</td>
                            <td className="p-2.5 pr-4 text-sm font-medium text-right">{formatCurrency(txn.running_balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* Record Payment Dialog */}
      {paymentDialogInvoice && (
        <RecordPaymentDialog
          invoice={paymentDialogInvoice}
          partyName={party?.name || ''}
          partyId={party?.id || ''}
          open={!!paymentDialogInvoice}
          onOpenChange={(open) => { if (!open) setPaymentDialogInvoice(null) }}
          onSuccess={() => fetchParty()}
        />
      )}
    </div>
  )
}
