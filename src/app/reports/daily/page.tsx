'use client'

import { useState } from 'react'
import { getDailySummary } from '@/lib/api/ledger'
import { formatCurrency } from '@/lib/gst'
import { exportToExcel, exportToPDF, getDailyExportData } from '@/lib/export'
import { ArrowLeft, TrendingUp, ShoppingCart, Calendar } from 'lucide-react'
import Link from 'next/link'
import { today } from '@/lib/date'
import ExportButton from '@/components/ui/ExportButton'

export default function DailySummaryPage() {
  const [date, setDate] = useState(today())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function fetchSummary() {
    setLoading(true)
    try {
      const result = await getDailySummary(date)
      setData(result)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = async () => {
    if (!date) return
    const rows = await getDailyExportData(date)
    await exportToExcel(rows, ['Date', 'Invoice', 'Party', 'Type', 'Amount', 'Received/Paid'], `Daily_Summary_${date}`)
  }

  const handleExportPDF = async () => {
    if (!date || !data) return
    const rows = await getDailyExportData(date)
    await exportToPDF('Daily Summary', ['Date', 'Invoice', 'Party', 'Type', 'Amount', 'Received/Paid'], rows, `Daily_Summary_${date}`, {
      subtitle: `Date: ${date} | Net Income: ${formatCurrency(data.netIncome)}`
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reports" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Daily Summary</h1>
            <p className="text-gray-500 text-sm mt-0.5">Transaction summary for a specific date</p>
          </div>
        </div>
        {data && <ExportButton onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50" />
          </div>
          <button onClick={fetchSummary}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm">
            {loading ? 'Loading...' : 'View Summary'}
          </button>
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-6 border border-green-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500 rounded-lg shadow-sm"><TrendingUp className="w-6 h-6 text-white" /></div>
                <div><p className="text-sm text-green-700 font-medium">Total Sales</p><p className="text-2xl font-bold text-green-800">{formatCurrency(data.totalSales)}</p></div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 border border-blue-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500 rounded-lg shadow-sm"><Calendar className="w-6 h-6 text-white" /></div>
                <div><p className="text-sm text-blue-700 font-medium">Amount Received</p><p className="text-2xl font-bold text-blue-800">{formatCurrency(data.totalReceived)}</p></div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm p-6 border border-orange-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500 rounded-lg shadow-sm"><ShoppingCart className="w-6 h-6 text-white" /></div>
                <div><p className="text-sm text-orange-700 font-medium">Total Vendor Purchases</p><p className="text-2xl font-bold text-orange-800">{formatCurrency(data.totalPurchases)}</p></div>
              </div>
            </div>
            <div className={`bg-gradient-to-br rounded-xl shadow-sm p-6 border ${data.netIncome >= 0 ? 'from-green-50 to-green-100 border-green-200' : 'from-red-50 to-red-100 border-red-200'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg shadow-sm ${data.netIncome >= 0 ? 'bg-green-500' : 'bg-red-500'}`}><TrendingUp className="w-6 h-6 text-white" /></div>
                <div><p className="text-sm font-medium">Net Income</p><p className={`text-2xl font-bold ${data.netIncome >= 0 ? 'text-green-800' : 'text-red-800'}`}>{formatCurrency(data.netIncome)}</p></div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
