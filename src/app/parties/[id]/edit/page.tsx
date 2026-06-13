'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { updateParty } from '@/lib/api/parties'
import { toast } from 'sonner'
import PartyForm from '@/components/parties/PartyForm'
import RecordPaymentDialog from '@/components/payments/RecordPaymentDialog'
import { getPartyLedger, getPartyInvoices, type InvoiceSummary } from '@/lib/api/ledger'
import { formatCurrency } from '@/lib/gst'
import { formatDate, formatDateTime } from '@/lib/date'
import type { Party } from '@/types/database'
import { Receipt, ShoppingCart, DollarSign, Banknote, FileText, Edit3, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function EditPartyPage() {
  const params = useParams()
  const router = useRouter()
  const [party, setParty] = useState<Party | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [ledger, setLedger] = useState<any[]>([])
  const [currentBalance, setCurrentBalance] = useState(0)
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [paymentDialogInvoice, setPaymentDialogInvoice] = useState<InvoiceSummary | null>(null)
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (params.id) fetchData()
  }, [params.id])

  async function fetchData() {
    try {
      const { data, error } = await supabase.from('parties').select('*').eq('id', params.id).single()
      if (error) throw error
      setParty(data)

      if (data) {
        const [ledgerData, invoiceData] = await Promise.all([
          getPartyLedger(params.id as string),
          getPartyInvoices(params.id as string, data.party_type)
        ])
        setLedger(ledgerData.transactions)
        setCurrentBalance(ledgerData.currentBalance)
        setInvoices(invoiceData)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoadingData(false)
    }
  }

  async function handleSubmit(data: any) {
    if (!params.id) return
    setIsLoading(true)
    try {
      await updateParty(params.id as string, {
        name: data.name,
        phone: data.phone || undefined,
        email: data.email || undefined,
        gstin: data.gstin || undefined,
        pan: data.pan || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        pin_code: data.pin_code || undefined,
        party_type: data.party_type,
        opening_balance: Number(data.opening_balance) || 0,
        gst_registered: data.gst_registered || false,
        bank_name: data.bank_name || undefined,
        bank_account: data.bank_account || undefined,
        ifsc_code: data.ifsc_code || undefined,
        notes: data.notes || undefined
      })

      toast.success('Party updated successfully')
      router.push(`/parties/${params.id}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update party')
    } finally {
      setIsLoading(false)
    }
  }

  function toggleInvoice(id: string) {
    setExpandedInvoices(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loadingData) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  }

  if (!party) {
    return <div className="text-center py-12"><p className="text-gray-500">Party not found</p></div>
  }

  const isSupplier = party.party_type === 'supplier'

  // Group transactions by reference_id for invoice-wise view
  const invoiceMap = new Map<string, InvoiceSummary>()
  invoices.forEach(inv => invoiceMap.set(inv.id, inv))

  const groups: Record<string, { invoice?: InvoiceSummary; transactions: any[] }> = {
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

  const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + inv.total_amount, 0)
  const totalPaidAmount = invoices.reduce((sum, inv) => sum + inv.amount_paid, 0)
  const totalBalanceDue = invoices.reduce((sum, inv) => sum + inv.balance_due, 0)

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/parties')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Vendor</h1>
          <p className="text-gray-500 text-sm mt-1">Update details for {party.name}</p>
        </div>
      </div>

      {/* Vendor Details Form */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <details open>
          <summary className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-gray-500" />
            Vendor Details
          </summary>
          <div className="mt-4">
            <PartyForm initialData={party} onSubmit={handleSubmit} isLoading={isLoading} />
          </div>
        </details>
      </div>

      {/* Transactions Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Vendor Transactions</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{invoices.length} invoices</span>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{isSupplier ? 'Total Purchases' : 'Total Sales'}</p>
            <p className="text-lg font-bold text-blue-700 mt-1">{formatCurrency(totalInvoiceAmount)}</p>
            <p className="text-xs text-gray-400 mt-1">{invoices.length} invoices</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{isSupplier ? 'Total Paid' : 'Total Received'}</p>
            <p className="text-lg font-bold text-green-600 mt-1">{formatCurrency(totalPaidAmount)}</p>
            <p className="text-xs text-gray-400 mt-1">{ledger.filter((t: any) => t.transaction_type === 'payment' || t.transaction_type === 'receipt').length} payments</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-orange-500">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Balance</p>
            <p className={`text-lg font-bold mt-1 ${totalBalanceDue > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{formatCurrency(totalBalanceDue)}</p>
            <p className="text-xs text-gray-400 mt-1">{invoices.filter(inv => inv.payment_status !== 'paid').length} pending invoices</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current Balance</p>
            <p className={`text-lg font-bold mt-1 ${currentBalance > 0 ? 'text-red-600' : currentBalance < 0 ? 'text-green-600' : 'text-gray-900'}`}>
              {currentBalance === 0 ? 'Settled' : formatCurrency(Math.abs(currentBalance))}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {currentBalance > 0 ? 'Payable' : currentBalance < 0 ? 'Overpaid' : 'Settled'}
            </p>
          </div>
        </div>

        {/* Invoice-wise Transaction Groups */}
        {Object.entries(groups).length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No transactions yet for this vendor</p>
            <p className="text-gray-400 text-sm mt-1">Record a purchase or sale to start tracking</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groups).map(([refId, group]) => {
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
              const isExpanded = expandedInvoices.has(refId)
              return (
                <div key={refId} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                  {/* Invoice Header */}
                  <button
                    onClick={() => toggleInvoice(refId)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                      {inv.invoice_number}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">{formatDate(inv.invoice_date)}</span>
                    <div className="flex-1" />
                    <div className="hidden md:flex items-center gap-3 text-xs">
                      <span className="text-gray-500">Total: <span className="font-semibold text-gray-700">{formatCurrency(inv.total_amount)}</span></span>
                      <span className="text-green-600">Paid: <span className="font-semibold">{formatCurrency(inv.amount_paid)}</span></span>
                      {inv.balance_due > 0 && (
                        <span className="text-orange-600 font-semibold">Pending: {formatCurrency(inv.balance_due)}</span>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${
                      inv.payment_status === 'paid' ? 'bg-green-100 text-green-700 ring-green-600/20' : 'bg-red-100 text-red-700 ring-red-600/20'
                    }`}>
                      {inv.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                    {inv.balance_due > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPaymentDialogInvoice(inv) }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition-colors border border-green-200 shrink-0"
                      >
                        <Banknote className="w-3.5 h-3.5" /> Pay
                      </button>
                    )}
                    <Link
                      href={inv.link + '/edit'}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors border border-blue-200 shrink-0"
                      title="Edit this transaction"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </Link>
                  </button>

                  {/* Expanded Transaction Details */}
                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left bg-gray-50/80">
                            <th className="p-2.5 pl-4 text-xs font-medium text-gray-500">Date</th>
                            <th className="p-2.5 text-xs font-medium text-gray-500">Description</th>
                            <th className="p-2.5 text-xs font-medium text-gray-500">Type</th>
                            <th className="p-2.5 text-xs font-medium text-gray-500 text-right">Debit (₹)</th>
                            <th className="p-2.5 text-xs font-medium text-gray-500 text-right">Credit (₹)</th>
                            <th className="p-2.5 text-xs font-medium text-gray-500 text-right pr-4">Balance (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {group.transactions.map((txn: any, i: number) => (
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
                              <td className="p-2.5 pr-4 text-sm font-medium text-right">
                                <span className={txn.running_balance > 0 ? 'text-red-600' : txn.running_balance < 0 ? 'text-green-600' : 'text-gray-400'}>
                                  {txn.running_balance === 0 ? '—' : <>{formatCurrency(Math.abs(txn.running_balance))}<span className="text-xs ml-0.5 font-normal">{txn.running_balance > 0 ? 'Dr' : 'Cr'}</span></>}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Record Payment Dialog */}
      {paymentDialogInvoice && party && (
        <RecordPaymentDialog
          invoice={paymentDialogInvoice}
          partyName={party.name}
          partyId={party.id}
          open={!!paymentDialogInvoice}
          onOpenChange={(open) => { if (!open) setPaymentDialogInvoice(null) }}
          onSuccess={() => fetchData()}
        />
      )}
    </div>
  )
}
