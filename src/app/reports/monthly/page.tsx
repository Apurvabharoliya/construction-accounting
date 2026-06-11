'use client'

import { useState } from 'react'
import { getMonthlySummary } from '@/lib/api/ledger'
import { formatCurrency } from '@/lib/gst'
import { exportToExcel, exportToPDF, getMonthlyExportData } from '@/lib/export'
import { ArrowLeft, TrendingUp, ShoppingCart, Calendar } from 'lucide-react'
import Link from 'next/link'
import ExportButton from '@/components/ui/ExportButton'

export default function MonthlySummaryPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']

  async function fetchSummary() {
    setLoading(true)
    try {
      const result = await getMonthlySummary(year, month)
      setData(result)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = async () => {
    const rows = await getMonthlyExportData(year, month)
    await exportToExcel(rows, ['Date', 'Invoice', 'Party', 'Type', 'Amount', 'Received/Paid', 'Status'], `Monthly_Summary_${year}_${month}`)
  }

  const handleExportPDF = async () => {
    if (!data) return
    const rows = await getMonthlyExportData(year, month)
    await exportToPDF('Monthly Summary', ['Date', 'Invoice', 'Party', 'Type', 'Amount', 'Received/Paid', 'Status'], rows, `Monthly_Summary_${year}_${month}`, {
      subtitle: `${monthNames[month - 1]} ${year} | Net Income: ${formatCurrency(data.netIncome)}`
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reports" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Monthly Summary</h1>
            <p className="text-gray-500 text-sm mt-0.5">Monthly profit/loss and transaction analysis</p>
          </div>
        </div>
        {data && <ExportButton onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full px-4 py-2.5 border rounded-lg bg-gray-50 text-sm">
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-full px-4 py-2.5 border rounded-lg bg-gray-50 text-sm">
              {monthNames.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
            </select>
          </div>
          <button onClick={fetchSummary} className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm text-sm">
            {loading ? 'Loading...' : 'View Summary'}
          </button>
        </div>
      </div>

      {data && (
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
              <div className="p-3 bg-orange-500 rounded-lg shadow-sm"><ShoppingCart className="w-6 h-6 text-white" /></div>                <div><p className="text-sm text-orange-700 font-medium">Total Purchases</p><p className="text-2xl font-bold text-orange-800">{formatCurrency(data.totalPurchases)}</p></div>
            </div>
          </div>
          <div className={`bg-gradient-to-br rounded-xl shadow-sm p-6 border ${data.netIncome >= 0 ? 'from-green-50 to-green-100 border-green-200' : 'from-red-50 to-red-100 border-red-200'}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg shadow-sm ${data.netIncome >= 0 ? 'bg-green-500' : 'bg-red-500'}`}><TrendingUp className="w-6 h-6 text-white" /></div>
              <div><p className="text-sm font-medium">Net Income</p><p className={`text-2xl font-bold ${data.netIncome >= 0 ? 'text-green-800' : 'text-red-800'}`}>{formatCurrency(data.netIncome)}</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
