'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'

interface ExportButtonProps {
  onExportExcel?: () => Promise<void>
  onExportPDF?: () => Promise<void>
  label?: string
}

export default function ExportButton({ onExportExcel, onExportPDF, label = 'Export' }: ExportButtonProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)

  const handleExport = async (type: 'excel' | 'pdf', handler?: () => Promise<void>) => {
    if (!handler) return
    setExporting(type)
    try {
      await handler()
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExporting(null)
      setShowMenu(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all text-sm font-medium text-gray-700 shadow-sm"
      >
        <Download className="w-4 h-4" />
        {label}
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border z-50 overflow-hidden">
            {onExportExcel && (
              <button
                onClick={() => handleExport('excel', onExportExcel)}
                disabled={exporting === 'excel'}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
              >
                {exporting === 'excel' ? (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">Export Excel</p>
                  <p className="text-xs text-gray-500">.xlsx format</p>
                </div>
              </button>
            )}
            {onExportPDF && (
              <button
                onClick={() => handleExport('pdf', onExportPDF)}
                disabled={exporting === 'pdf'}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors text-left border-t disabled:opacity-50"
              >
                {exporting === 'pdf' ? (
                  <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
                ) : (
                  <FileText className="w-5 h-5 text-red-600" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">Export PDF</p>
                  <p className="text-xs text-gray-500">.pdf format</p>
                </div>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
