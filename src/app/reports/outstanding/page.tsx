'use client'

import { useEffect, useState } from 'react'
import { getOutstandingReport, type OutstandingParty, type OutstandingInvoice } from '@/lib/api/ledger'
import { formatCurrency } from '@/lib/gst'
import { formatDate, formatDateTime } from '@/lib/date'
import { exportToExcel, exportToPDF, getOutstandingExportData } from '@/lib/export'
import { ArrowLeft, IndianRupee, Users, ChevronDown, ChevronRight, ShoppingCart, DollarSign, FileText, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import ExportButton from '@/components/ui/ExportButton'

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

export default function OutstandingReportPage() {
  const [data, setData] = useState<OutstandingParty[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedParties, setExpandedParties] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const report = await getOutstandingReport()
      setData(report)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  function toggleParty(partyId: string) {
    setExpandedParties(prev => {
      const next = new Set(prev)
      if (next.has(partyId)) next.delete(partyId)
      else next.add(partyId)
      return next
    })
  }

  const totalReceivable = data.reduce((sum, d) => sum + d.receivable, 0)
  const totalPayable = data.reduce((sum, d) => sum + d.payable, 0)
  const totalInvoiceCount = data.reduce((sum, d) => sum + d.invoices.length, 0)

  const handleExportExcel = async () => {
    const rows = await getOutstandingExportData()
    await exportToExcel(rows, ['Party', 'Invoice', 'Receivable', 'Payable', 'Type'], `Outstanding_${new Date().toISOString().split('T')[0]}`)
  }

  const handleExportPDF = async () => {
    const rows = await getOutstandingExportData()
    await exportToPDF('Outstanding Report', ['Party', 'Invoice', 'Receivable', 'Payable', 'Type'], rows, `Outstanding_${new Date().toISOString().split('T')[0]}`, {
      subtitle: `Total Receivable: ${formatCurrency(totalReceivable)} | Total Payable: ${formatCurrency(totalPayable)}`
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reports" className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Outstanding Report</h1>
            <p className="text-gray-500 text-sm mt-0.5">Pending payments from debtors and to creditors</p>
          </div>
        </div>
        <ExportButton onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-5 border border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-500 rounded-lg shadow-sm">
              <IndianRupee className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-green-700 font-medium uppercase tracking-wider">Total Receivable</p>
              <p className="text-xl font-bold text-green-800 mt-0.5">{formatCurrency(totalReceivable)}</p>
              <p className="text-xs text-green-600 mt-0.5">Amount owed to you</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm p-5 border border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500 rounded-lg shadow-sm">
              <IndianRupee className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-red-700 font-medium uppercase tracking-wider">Total Payable</p>
              <p className="text-xl font-bold text-red-800 mt-0.5">{formatCurrency(totalPayable)}</p>
              <p className="text-xs text-red-600 mt-0.5">Amount you owe</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm p-5 border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500 rounded-lg shadow-sm">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-purple-700 font-medium uppercase tracking-wider">Pending Invoices</p>
              <p className="text-xl font-bold text-purple-800 mt-0.5">{totalInvoiceCount}</p>
              <p className="text-xs text-purple-600 mt-0.5">Invoices with balance due</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-3 text-sm">Loading report...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No outstanding amounts</p>
            <p className="text-gray-400 text-sm mt-1">All parties are settled up</p>
          </div>
        ) : (
          <div>
            {/* Party-level rows */}
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <th className="p-4 w-8" />
                  <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Party</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoices</th>
                  <th className="p-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Receivable</th>
                  <th className="p-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Payable</th>
                  <th className="p-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Net</th>
                  <th className="p-4 w-20" />
                </tr>
              </thead>
              <tbody>
                {data.map((party) => {
                  const isExpanded = expandedParties.has(party.partyId)
                  const netAmount = party.receivable - party.payable

                  return (
                    <tr key={party.partyId} className="group">
                      <td colSpan={8} className="p-0">
                        <div className={`border-t ${isExpanded ? 'border-blue-200' : 'border-gray-100'}`}>
                          {/* Party summary row */}
                          <button
                            onClick={() => toggleParty(party.partyId)}
                            className={`w-full flex items-center px-4 py-3.5 hover:bg-blue-50/50 transition-colors text-left ${
                              isExpanded ? 'bg-blue-50/30' : ''
                            }`}
                          >
                            <div className="w-8 shrink-0">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-blue-500" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                              )}
                            </div>
                            <div className="flex-1 flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                netAmount > 0 ? 'bg-green-100 text-green-700' : netAmount < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {party.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{party.name}</p>
                              </div>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">{party.phone || '—'}</span>
                            </div>
                            <div className="flex items-center gap-6">
                              <span className="text-xs text-gray-500 min-w-[40px] text-right">{party.invoices.length} invoice{party.invoices.length !== 1 ? 's' : ''}</span>
                              <span className="text-sm font-semibold text-green-600 min-w-[90px] text-right">{party.receivable > 0 ? formatCurrency(party.receivable) : '—'}</span>
                              <span className="text-sm font-semibold text-red-600 min-w-[90px] text-right">{party.payable > 0 ? formatCurrency(party.payable) : '—'}</span>
                              <span className={`text-sm font-bold min-w-[90px] text-right ${
                                netAmount > 0 ? 'text-green-700' : netAmount < 0 ? 'text-red-700' : 'text-gray-500'
                              }`}>
                                {formatCurrency(Math.abs(netAmount))}
                              </span>
                            </div>
                          </button>

                          {/* Expanded invoice details */}
                          {isExpanded && (
                            <div className="border-t border-blue-100 bg-blue-50/20">
                              {/* Column headers for invoice sub-table */}
                              <div className="px-4 py-2 bg-blue-50/50 border-b border-blue-100">
                                <div className="flex items-center gap-3 pl-8 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  <span className="w-[170px]">Invoice</span>
                                  <span className="w-[120px]">Date</span>
                                  <span className="w-[80px]">Type</span>
                                  <span className="w-[90px] text-right">Total</span>
                                  <span className="w-[110px]">Progress</span>
                                  <span className="w-[90px] text-right">Paid</span>
                                  <span className="w-[100px] text-right">Balance Due</span>
                                  <span className="w-[100px] text-center">Last Payment</span>
                                  <span className="w-[70px] text-center">Status</span>
                                </div>
                              </div>
                              {party.invoices.map((inv) => (
                                <div key={inv.invoice_id} className="px-4 py-2.5 border-b border-blue-50 hover:bg-blue-50/50 transition-colors">
                                  <div className="flex items-center gap-4 pl-8">
                                    {/* Invoice Number */}
                                    <Link
                                      href={`/${inv.type === 'purchase' ? 'purchases' : 'sales'}/${inv.invoice_id}`}
                                      className="w-[170px] flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 shrink-0"
                                    >
                                      <FileText className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate">{inv.invoice_number}</span>
                                      <ExternalLink className="w-3 h-3 text-blue-400 shrink-0 opacity-0 hover:opacity-100 transition-opacity" />
                                    </Link>

                                    {/* Date */}
                                    <span className="w-[120px] shrink-0">
                                      <div className="text-sm text-gray-500">{formatDate(inv.invoice_date)}</div>
                                      <div className="text-xs text-gray-400">{formatDateTime(inv.created_at)}</div>
                                    </span>

                                    {/* Type */}
                                    <span className={`w-[80px] inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                                      inv.type === 'purchase' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'
                                    }`}>
                                      {inv.type === 'purchase' ? <ShoppingCart className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                                      {inv.type === 'purchase' ? 'Purchase' : 'Sale'}
                                    </span>

                                    {/* Total */}
                                    <span className="w-[90px] text-sm font-medium text-gray-800 text-right shrink-0">{formatCurrency(inv.total_amount)}</span>

                                    {/* Progress */}
                                    <div className="w-[110px] shrink-0">
                                      <PaymentProgress paid={inv.amount_paid} total={inv.total_amount} />
                                    </div>

                                    {/* Paid */}
                                    <span className="w-[90px] text-sm font-semibold text-green-600 text-right shrink-0">{formatCurrency(inv.amount_paid)}</span>

                                    {/* Balance Due */}
                                    <span className="w-[100px] text-sm font-bold text-orange-600 text-right shrink-0">{formatCurrency(inv.balance_due)}</span>

                                    {/* Last Payment Date */}
                                    <span className="w-[100px] text-sm text-center shrink-0">
                                      {inv.last_payment_date ? (
                                        <span className="text-gray-500">{formatDate(inv.last_payment_date)}</span>
                                      ) : (
                                        <span className="text-gray-300">—</span>
                                      )}
                                    </span>

                                    {/* Status */}
                                    <div className="w-[70px] text-center shrink-0">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${
                                        inv.payment_status === 'paid' ? 'bg-green-100 text-green-700 ring-green-600/20' : 'bg-red-100 text-red-700 ring-red-600/20'
                                      }`}>
                                        {inv.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* Party summary footer */}
                              <div className="px-4 py-3 bg-blue-50/50 border-t border-blue-100">
                                <div className="flex items-center gap-3 pl-8">
                                  <span className="w-[170px] text-xs font-semibold text-gray-600">Party Total</span>
                                  <span className="w-[95px]" />
                                  <span className="w-[80px]" />
                                  <span className="w-[90px] text-right text-xs font-bold text-gray-700">
                                    {formatCurrency(party.invoices.reduce((s, i) => s + i.total_amount, 0))}
                                  </span>
                                  <span className="w-[110px]" />
                                  <span className="w-[90px] text-right text-xs font-bold text-green-700">
                                    {formatCurrency(party.invoices.reduce((s, i) => s + i.amount_paid, 0))}
                                  </span>
                                  <span className="w-[100px] text-right text-xs font-bold text-orange-700">
                                    {formatCurrency(party.payable + party.receivable)}
                                  </span>
                                  <span className="w-[100px]" />
                                  <span className="w-[70px]" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-200">
                  <td colSpan={3} className="p-4 font-bold text-gray-900">Total ({data.length} parties)</td>
                  <td className="p-4 text-right text-xs text-gray-500">{totalInvoiceCount} invoices</td>
                  <td className="p-4 text-right font-bold text-green-700">{formatCurrency(totalReceivable)}</td>
                  <td className="p-4 text-right font-bold text-red-700">{formatCurrency(totalPayable)}</td>
                  <td className="p-4 text-right font-bold">{formatCurrency(totalReceivable - totalPayable)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
