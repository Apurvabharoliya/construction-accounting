'use client'

import { useState, useRef, useCallback } from 'react'
import { ArrowLeft, Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, XCircle, Loader2, Database, User } from 'lucide-react'
import Link from 'next/link'
import { importFromExcel, downloadTemplate, detectEntityType, buildColumnMapForType, getColumnDefs, type EntityType, type ImportResult } from '@/lib/import'

const entityTypeInfo: Record<EntityType, { label: string; description: string; bgClass: string; borderClass: string; textClass: string }> = {
  parties: { label: 'Vendors', description: 'Import vendors (suppliers, clients, beneficiaries)', bgClass: 'bg-purple-50', borderClass: 'border-purple-200', textClass: 'text-purple-600' },
  purchases: { label: 'Purchases', description: 'Import purchase invoices with items', bgClass: 'bg-blue-50', borderClass: 'border-blue-200', textClass: 'text-blue-600' },
  sales: { label: 'Sales', description: 'Import sale invoices with items', bgClass: 'bg-green-50', borderClass: 'border-green-200', textClass: 'text-green-600' },
  transactions: { label: 'Transactions', description: 'Import ledger/account statement with debits and credits', bgClass: 'bg-amber-50', borderClass: 'border-amber-200', textClass: 'text-amber-600' },
  unknown: { label: 'Unknown', description: 'Data type not detected', bgClass: 'bg-gray-50', borderClass: 'border-gray-200', textClass: 'text-gray-600' },
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [detectedType, setDetectedType] = useState<EntityType | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([])
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<{ dbField: string; fileHeader: string }[] | null>(null)
  const [defaultPartyName, setDefaultPartyName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Build column mapping display for a given type and headers
  function buildMappingDisplay(headers: string[], type: EntityType) {
    const colMap = buildColumnMapForType(headers, type)
    const entries: { dbField: string; fileHeader: string }[] = []
    for (const def of getColumnDefs(type)) {
      const matched = colMap.get(def.field)
      if (matched) entries.push({ dbField: def.field, fileHeader: matched })
    }
    setColumnMapping(entries)
  }

  const handleFile = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    setResult(null)

    try {
      const buffer = await selectedFile.arrayBuffer()
      const XLSX = await import('xlsx')
      // cellDates: true ensures dates are converted to Date objects (handles Mac/iOS 1904 date system)
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
      const sheetName = workbook.SheetNames[0]
      if (sheetName) {
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(sheet, { header: 1 })

        if (jsonData.length >= 2) {
          const headers = (jsonData[0] as any[]).map((h: any) => String(h || '').trim())
          setPreviewHeaders(headers)

          const rows: Record<string, string>[] = []
          for (let i = 1; i < Math.min(jsonData.length, 6); i++) {
            const row = jsonData[i] as any[]
            const record: Record<string, string> = {}
            headers.forEach((header: string, idx: number) => {
              const cell = row[idx]
              if (cell instanceof Date && !isNaN(cell.getTime())) {
                // Format Date objects as YYYY-MM-DD for preview
                record[header] = cell.toISOString().split('T')[0]
              } else if (cell !== undefined && cell !== null) {
                record[header] = String(cell).trim()
              } else {
                record[header] = ''
              }
            })
            rows.push(record)
          }
          setPreviewRows(rows)

          // Detect type using the shared smart detection from import.ts
          const detected = detectEntityType(headers)
          setDetectedType(detected)

          // Build and display column mapping
          if (detected !== 'unknown') {
            buildMappingDisplay(headers, detected)
          } else {
            setColumnMapping(null)
          }
        }
      }
    } catch (error) {
      console.error('Error reading file:', error)
      setDetectedType('unknown')
    }
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    const excelExtensions = ['.xlsx', '.xls', '.xlsb', '.xlsm', '.csv', '.ods']
    if (droppedFile && excelExtensions.some(ext => droppedFile.name.toLowerCase().endsWith(ext))) {
      handleFile(droppedFile)
    }
  }

  async function handleImport() {
    if (!file) return
    setImporting(true)
    try {
      const buffer = await file.arrayBuffer()
      const importResult = await importFromExcel(buffer, detectedType || undefined, defaultPartyName || undefined)
      setResult(importResult)
    } catch (error: any) {
      setResult({
        success: false,
        imported: 0,
        errors: [error.message || 'Import failed'],
        warnings: [],
        entityType: detectedType || 'unknown'
      })
    } finally {
      setImporting(false)
    }
  }

  async function handleDownloadTemplate(type: EntityType) {
    try {
      await downloadTemplate(type)
    } catch (error) {
      console.error('Failed to download template:', error)
    }
  }

  function resetImport() {
    setFile(null)
    setDetectedType(null)
    setResult(null)
    setPreviewRows([])
    setPreviewHeaders([])
    setColumnMapping(null)
    setDefaultPartyName('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const typeInfo = detectedType ? entityTypeInfo[detectedType] : null

  // Check if transactions file is missing a party column
  const missingPartyColumn = detectedType === 'transactions' && columnMapping !== null && !columnMapping.some(m => m.dbField === 'party')
  const isImportDisabled = importing || detectedType === 'unknown' || (missingPartyColumn && !defaultPartyName.trim())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/reports" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import from Excel</h1>
          <p className="text-gray-500 text-sm mt-0.5">Upload Excel files to import vendors, purchases, or sales</p>
        </div>
      </div>

      {/* Template Downloads */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Download Templates</h2>
        <p className="text-sm text-gray-500 mb-4">Download a template with the correct format for each data type, then fill it in and upload.</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => handleDownloadTemplate('parties')} className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 border border-purple-200 transition-colors text-sm font-medium">
            <Download className="w-4 h-4" /> Vendors Template
          </button>
          <button onClick={() => handleDownloadTemplate('purchases')} className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors text-sm font-medium">
            <Download className="w-4 h-4" /> Purchases Template
          </button>
          <button onClick={() => handleDownloadTemplate('sales')} className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 border border-green-200 transition-colors text-sm font-medium">
            <Download className="w-4 h-4" /> Sales Template
          </button>
        </div>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Upload Excel File</h2>

        {!file ? (
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
              dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-1">Drop your Excel file here, or click to browse</p>
            <p className="text-gray-400 text-sm">Supports .xlsx, .xls, .xlsb, .xlsm, .csv, .ods</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.xlsb,.xlsm,.csv,.ods"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button onClick={resetImport} className="text-sm text-gray-500 hover:text-gray-700 hover:underline">
                Remove
              </button>
            </div>

            {/* Detected type */}
            {typeInfo && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${typeInfo.bgClass} border ${typeInfo.borderClass}`}>
                <Database className={`w-5 h-5 ${typeInfo.textClass}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">
                    Detected: <span className={typeInfo.textClass}>{typeInfo.label}</span>
                  </p>
                  <p className="text-xs text-gray-500">{typeInfo.description}</p>
                  {columnMapping && columnMapping.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {columnMapping.map((m, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/70 rounded text-[11px] text-gray-600 border border-gray-200">
                          <span className="font-medium text-gray-800">{m.dbField}</span>
                          <span className="text-gray-400">←</span>
                          <span className="text-gray-500 truncate max-w-[120px]">{m.fileHeader}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {columnMapping && columnMapping.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">No columns could be mapped — import may not work correctly</p>
                  )}
                </div>
              </div>
            )}

            {/* Preview */}
            {previewHeaders.length > 0 && (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      {previewHeaders.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri} className="border-t hover:bg-gray-50">
                        {previewHeaders.map((h, ci) => (
                          <td key={ci} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                            {row[h.toLowerCase()] || row[h] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="px-3 py-2 text-xs text-gray-400 border-t bg-gray-50">
                  Showing first {Math.min(previewRows.length, 5)} of {file.name} rows
                </p>
              </div>
            )}

            {/* Manual type selector when unknown */}
            {detectedType === 'unknown' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800 mb-1">Could not detect data type automatically</p>
                    <p className="text-sm text-amber-700 mb-3">
                      The column headers in your file don't match known patterns.
                      You can manually select the data type below, or download a template to see the expected format.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <button onClick={() => { setDetectedType('parties'); buildMappingDisplay(previewHeaders, 'parties'); }} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-purple-300 bg-white text-purple-700 hover:bg-purple-50 transition-colors">
                        Import as Vendors
                      </button>
                      <button onClick={() => { setDetectedType('purchases'); buildMappingDisplay(previewHeaders, 'purchases'); }} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-blue-300 bg-white text-blue-700 hover:bg-blue-50 transition-colors">
                        Import as Purchases
                      </button>
                      <button onClick={() => { setDetectedType('sales'); buildMappingDisplay(previewHeaders, 'sales'); }} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-green-300 bg-white text-green-700 hover:bg-green-50 transition-colors">
                        Import as Sales
                      </button>
                      <button onClick={() => { setDetectedType('transactions'); buildMappingDisplay(previewHeaders, 'transactions'); }} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 transition-colors">
                        Import as Transactions
                      </button>
                    </div>
                    {previewHeaders.length > 0 && (
                      <p className="text-xs text-amber-600">
                        Detected headers: <span className="font-mono">{previewHeaders.join(', ')}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Default party name for transactions without party column */}
            {missingPartyColumn && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-800 mb-1">Party Name Required</p>
                    <p className="text-sm text-amber-700 mb-3">
                      Your file doesn&apos;t have a party/account column. Enter the party name to apply to all transactions:
                    </p>
                    <input
                      type="text"
                      value={defaultPartyName}
                      onChange={(e) => setDefaultPartyName(e.target.value)}
                      placeholder="e.g., ABC Constructions"
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    />
                    <p className="text-xs text-amber-600 mt-1.5">
                      A party with this name will be created (or reused if it already exists) and all rows will be linked to it.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Import Button */}
            <button
              onClick={handleImport}
              disabled={isImportDisabled}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                isImportDisabled
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {importing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Start Import
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className={`bg-white rounded-xl shadow-sm p-6 border-2 ${result.success ? 'border-green-200' : 'border-red-200'}`}>
          <div className="flex items-center gap-3 mb-4">
            {result.success ? (
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            ) : (
              <XCircle className="w-8 h-8 text-red-500" />
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {result.success ? 'Import Completed' : 'Import Completed with Errors'}
              </h2>
              <p className="text-sm text-gray-500">
                Imported {result.imported} {entityTypeInfo[result.entityType as EntityType]?.label || 'records'} successfully
                {result.errors.length > 0 ? `, ${result.errors.length} error(s)` : ''}
                {result.warnings.length > 0 ? `, ${result.warnings.length} warning(s)` : ''}
              </p>
            </div>
          </div>

          {result.warnings.length > 0 && (
            <div className="mb-4">
              <h3 className="flex items-center gap-2 text-sm font-medium text-yellow-700 mb-2">
                <AlertTriangle className="w-4 h-4" /> Warnings ({result.warnings.length})
              </h3>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1.5 rounded">{w}</p>
                ))}
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="mb-4">
              <h3 className="flex items-center gap-2 text-sm font-medium text-red-700 mb-2">
                <XCircle className="w-4 h-4" /> Errors ({result.errors.length})
              </h3>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded">{e}</p>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={resetImport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Import Another File
            </button>
            <Link
              href="/reports"
              className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Back to Reports
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
