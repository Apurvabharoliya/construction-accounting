'use client'

import { useState } from 'react'
import { getMonthlySummary } from '@/lib/api/ledger'
import { formatCurrency } from '@/lib/gst'
import { exportToExcel, exportToPDF } from '@/lib/export'
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
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
    const rows: any[][] = []
    // Add summary row
    if (data) {
      rows.push(['Total Sales', formatCurrency(data.totalSales)])
      rows.push(['Total Received', formatCurrency(data.totalReceived)])
      rows.push(['Total Purchases', formatCurrency(data.totalPurchases)])
      rows.push(['Total Paid', formatCurrency(data.totalPaid)])
      rows.push(['Net Income', formatCurrency(data.netIncome)])
    }
    await exportToExcel(rows, ['Metric', 'Amount'], `Monthly_Summary_${year}_${month}`)
  }

  const handleExportPDF = async () => {
    if (!data) return
    const rows = [
      ['Total Sales', formatCurrency(data.totalSales)],
      ['Total Received', formatCurrency(data.totalReceived)],
      ['Total Purchases', formatCurrency(data.totalPurchases)],
      ['Total Paid', formatCurrency(data.totalPaid)],
      ['Net Income', formatCurrency(data.netIncome)]
    ]
    await exportToPDF('Monthly Summary', ['Metric', 'Amount'], rows, `Monthly_Summary_${year}_${month}`, {
      subtitle: `${monthNames[month - 1]} ${year}`
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

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-4 py-2.5 border rounded-lg bg-gray-50">
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="px-4 py-2.5 border rounded-lg bg-gray-50">
              {monthNames.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
            </select>
          </div>
          <button onClick={fetchSummary} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm">
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
              <div className="p-3 bg-orange-500 rounded-lg shadow-sm"><ShoppingCart className="w-6 h-6 text-white" /></div>
              <div><p className="text-sm text-orange-700 font-medium">Total Purchases</p><p className="text-2xl font-bold text-orange-800">{formatCurrency(data.totalPurchases)}</p></div>
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
