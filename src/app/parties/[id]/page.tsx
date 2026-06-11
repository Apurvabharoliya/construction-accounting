'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Party } from '@/types/database'
import { formatCurrency } from '@/lib/gst'
import { formatDate } from '@/lib/date'
import { getPartyLedger, getPartyInvoices, type InvoiceSummary } from '@/lib/api/ledger'
import { ArrowLeft, Phone, Mail, MapPin, Edit3, Trash2, ExternalLink, ShoppingCart, DollarSign, Banknote, FileText, Receipt, Plus } from 'lucide-react'
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
    partial: 'bg-yellow-100 text-yellow-700 ring-yellow-600/20',
    unpaid: 'bg-red-100 text-red-700 ring-red-600/20',
  }
  const s = styles[status as keyof typeof styles] || styles.unpaid
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${s}`}>
      {status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Unpaid'}
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
          <p className={`text-2xl font-bold ${currentBalance > 0 ? 'text-green-600' : currentBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {formatCurrency(currentBalance)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Current outstanding balance</p>
        </div>

        {/* Invoice Summary Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm p-6 border border-blue-100">
          <h3 className="text-sm font-medium text-blue-700 mb-2">
            {party.party_type === 'supplier' ? 'Purchase Summary' : 'Sale Summary'}
          </h3>
          <div className="space-y-1.5">
            <p className="text-xs text-blue-600">Total Invoices: <span className="font-bold">{invoices.length}</span></p>
            <p className="text-xs text-blue-600">Total Amount: <span className="font-bold">{formatCurrency(totalInvoiceAmount)}</span></p>
            <p className="text-xs text-green-600">Total Paid: <span className="font-bold">{formatCurrency(totalPaidAmount)}</span></p>
            <p className="text-xs text-orange-600">Balance Due: <span className="font-bold">{formatCurrency(totalBalanceDue)}</span></p>
          </div>
        </div>
      </div>

      {/* Invoices / Transactions Section */}
      {invoices.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-semibold">
                  {party.party_type === 'supplier' ? 'Purchase Invoices' : 'Sale Invoices'}
                </h2>
              </div>
              <span className="text-xs text-gray-400">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Progress</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid / Received</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance Due</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mode</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Pay</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-4 py-3">
                      <Link href={inv.link} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-[120px]">{inv.invoice_number}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(inv.invoice_date)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        inv.type === 'purchase'
                          ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20'
                          : 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20'
                      }`}>
                        {inv.type === 'purchase' ? <ShoppingCart className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                        {inv.type === 'purchase' ? 'Purchase' : 'Sale'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <PaymentProgress paid={inv.amount_paid} total={inv.total_amount} />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600 text-right whitespace-nowrap">
                      {formatCurrency(inv.amount_paid)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right whitespace-nowrap">
                      {inv.balance_due > 0 ? (
                        <span className="text-orange-600 font-bold">{formatCurrency(inv.balance_due)}</span>
                      ) : (
                        <span className="text-green-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.payment_status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {inv.payment_mode || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-gray-400 font-medium">{inv.items_count} item{inv.items_count !== 1 ? 's' : ''}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {inv.balance_due > 0 && (
                        <button
                          onClick={() => setPaymentDialogInvoice(inv)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Plus className="w-3 h-3" /> Pay
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={inv.link}
                        className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-all"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
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
                              <td className="p-2.5 pl-4 text-sm text-gray-600">{formatDate(txn.transaction_date)}</td>
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
                            <td className="p-2.5 pl-4 text-sm text-gray-600">{formatDate(txn.transaction_date)}</td>
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
