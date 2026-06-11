'use client'

import { useState } from 'react'
import { getGstSummary } from '@/lib/api/ledger'
import { formatCurrency } from '@/lib/gst'
import { exportToExcel, exportToPDF, getGstExportData } from '@/lib/export'
import { ArrowLeft, Calculator, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import Link from 'next/link'
import { getMonthRange } from '@/lib/date'
import ExportButton from '@/components/ui/ExportButton'

export default function GstSummaryPage() {
  const range = getMonthRange()
  const [startDate, setStartDate] = useState(range.start)
  const [endDate, setEndDate] = useState(range.end)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function fetchGstSummary() {
    setLoading(true)
    try {
      const result = await getGstSummary(startDate, endDate)
      setData(result)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = async () => {
    const rows = await getGstExportData(startDate, endDate)
    await exportToExcel(rows, ['Invoice', 'Party', 'Type', 'Amount', 'CGST', 'SGST', 'IGST'], `GST_Summary_${startDate}_to_${endDate}`)
  }

  const handleExportPDF = async () => {
    const rows = await getGstExportData(startDate, endDate)
    await exportToPDF('GST Summary', ['Invoice', 'Party', 'Type', 'Amount', 'CGST', 'SGST', 'IGST'], rows, `GST_Summary_${startDate}_to_${endDate}`, {
      subtitle: `Period: ${startDate} to ${endDate}`
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reports" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">GST Summary</h1>
            <p className="text-gray-500 text-sm mt-0.5">GST payable/receivable for filing</p>
          </div>
        </div>
        {data && <ExportButton onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="w-full sm:w-auto"><label className="block text-sm font-medium text-gray-700 mb-1">From</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2.5 border rounded-lg bg-gray-50 text-sm" /></div>
          <div className="w-full sm:w-auto"><label className="block text-sm font-medium text-gray-700 mb-1">To</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-2.5 border rounded-lg bg-gray-50 text-sm" /></div>
          <button onClick={fetchGstSummary} className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm text-sm">{loading ? 'Loading...' : 'View Summary'}</button>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-green-100 rounded-lg"><ArrowUpCircle className="w-6 h-6 text-green-600" /></div>
              <h3 className="text-lg font-semibold">Output GST (Sales)</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between p-2 bg-gray-50 rounded"><span className="text-gray-600">CGST</span><span className="font-medium">{formatCurrency(data.outputGst.cgst)}</span></div>
              <div className="flex justify-between p-2 bg-gray-50 rounded"><span className="text-gray-600">SGST</span><span className="font-medium">{formatCurrency(data.outputGst.sgst)}</span></div>
              <div className="flex justify-between p-2 bg-gray-50 rounded"><span className="text-gray-600">IGST</span><span className="font-medium">{formatCurrency(data.outputGst.igst)}</span></div>
              <div className="flex justify-between border-t-2 pt-3 mt-3"><span className="font-bold text-gray-900">Total Output GST</span><span className="font-bold text-green-700">{formatCurrency(data.outputGst.total)}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-blue-100 rounded-lg"><ArrowDownCircle className="w-6 h-6 text-blue-600" /></div>
              <h3 className="text-lg font-semibold">Input GST (Purchases) [ITC]</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between p-2 bg-gray-50 rounded"><span className="text-gray-600">CGST</span><span className="font-medium">{formatCurrency(data.inputGst.cgst)}</span></div>
              <div className="flex justify-between p-2 bg-gray-50 rounded"><span className="text-gray-600">SGST</span><span className="font-medium">{formatCurrency(data.inputGst.sgst)}</span></div>
              <div className="flex justify-between p-2 bg-gray-50 rounded"><span className="text-gray-600">IGST</span><span className="font-medium">{formatCurrency(data.inputGst.igst)}</span></div>
              <div className="flex justify-between border-t-2 pt-3 mt-3"><span className="font-bold text-gray-900">Total Input GST (ITC)</span><span className="font-bold text-blue-700">{formatCurrency(data.inputGst.total)}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border md:col-span-2 hover:shadow-md transition-shadow">
            {(() => {
              const netGst = data.outputGst.total - data.inputGst.total
              return (
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-3">Net GST Payable</h3>
                  <p className={`text-4xl font-bold ${netGst >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(Math.abs(netGst))}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {netGst >= 0 ? 'Amount payable to government' : 'Excess ITC — carry forward to next period'}
                  </p>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
