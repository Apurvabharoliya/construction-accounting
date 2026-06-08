'use client'

import { useEffect, useState } from 'react'
import { getOutstandingReport } from '@/lib/api/ledger'
import { formatCurrency } from '@/lib/gst'
import { exportToExcel, exportToPDF, getOutstandingExportData } from '@/lib/export'
import { ArrowLeft, IndianRupee, Users } from 'lucide-react'
import Link from 'next/link'
import ExportButton from '@/components/ui/ExportButton'

export default function OutstandingReportPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getOutstandingReport().then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  const totalReceivable = data.reduce((sum, d) => sum + d.receivable, 0)
  const totalPayable = data.reduce((sum, d) => sum + d.payable, 0)

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-6 border border-green-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500 rounded-lg shadow-sm">
              <IndianRupee className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-green-700 font-medium">Total Receivable</p>
              <p className="text-2xl font-bold text-green-800 mt-0.5">{formatCurrency(totalReceivable)}</p>
              <p className="text-xs text-green-600 mt-0.5">Amount owed to you by debtors</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm p-6 border border-red-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500 rounded-lg shadow-sm">
              <IndianRupee className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-red-700 font-medium">Total Payable</p>
              <p className="text-2xl font-bold text-red-800 mt-0.5">{formatCurrency(totalPayable)}</p>
              <p className="text-xs text-red-600 mt-0.5">Amount you owe to creditors</p>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Party</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                  <th className="p-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Receivable</th>
                  <th className="p-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Payable</th>
                  <th className="p-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Net</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={item.partyId} className={`border-t hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="p-4 font-medium text-gray-900">{item.name}</td>
                    <td className="p-4 text-sm text-gray-500">{item.phone || '—'}</td>
                    <td className="p-4 text-right text-sm font-medium text-green-600">{item.receivable > 0 ? formatCurrency(item.receivable) : '—'}</td>
                    <td className="p-4 text-right text-sm font-medium text-red-600">{item.payable > 0 ? formatCurrency(item.payable) : '—'}</td>
                    <td className="p-4 text-right text-sm font-semibold">{formatCurrency(item.receivable - item.payable)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="p-4 font-bold text-gray-900" colSpan={2}>Total</td>
                  <td className="p-4 text-right font-bold text-green-700">{formatCurrency(totalReceivable)}</td>
                  <td className="p-4 text-right font-bold text-red-700">{formatCurrency(totalPayable)}</td>
                  <td className="p-4 text-right font-bold">{formatCurrency(totalReceivable - totalPayable)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
