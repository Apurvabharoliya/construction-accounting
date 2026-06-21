'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createPurchase } from '@/lib/api/purchases'
import { addMaterialReceipt } from '@/lib/api/villages'
import { toast } from 'sonner'
import { Plus, Trash2, Upload, Loader2, Copy, FileSpreadsheet, Save, X } from 'lucide-react'
import { formatCurrency, UNITS, PAYMENT_MODES } from '@/lib/gst'
import DatePicker from '@/components/ui/DatePicker'
import SupplierDropdown from '@/components/ui/SupplierDropdown'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { VILLAGES } from '@/lib/village-constants'
import { parseExcelFile } from '@/lib/import'
import { genId, calcEntryTotal } from '@/lib/transaction-utils'

interface TransactionItem {
  id: string
  date: string
  material_name: string
  village_name: string
  quantity: number
  unit: string
  rate: number
  amount: number
}

interface TransactionEntry {
  id: string
  supplier_name: string
  supplier_invoice_number: string
  payment_mode: string
  payment_status: 'unpaid' | 'paid'
  amount_paid: number
  remarks: string
  items: TransactionItem[]
}

function emptyItem(): TransactionItem {
  return {
    id: genId(),
    date: new Date().toISOString().split('T')[0],
    material_name: '',
    village_name: '',
    quantity: 0,
    unit: 'Nos',
    rate: 0,
    amount: 0,
  }
}

function emptyEntry(): TransactionEntry {
  return {
    id: genId(),
    supplier_name: '',
    supplier_invoice_number: '',
    payment_mode: '',
    payment_status: 'unpaid',
    amount_paid: 0,
    remarks: '',
    items: [emptyItem()],
  }
}

export default function NewTransactionPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<TransactionEntry[]>([emptyEntry()])
  const [isLoading, setIsLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut: Ctrl+Enter to save
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [entries])

  function updateEntry(id: string, field: keyof TransactionEntry, value: any) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  function updateItem(entryId: string, itemId: string, field: keyof TransactionItem, value: any) {
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e
      const items = e.items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
      return { ...e, items }
    }))
  }

  function addItem(entryId: string) {
    setEntries(prev => prev.map(e =>
      e.id === entryId ? { ...e, items: [...e.items, emptyItem()] } : e
    ))
  }

  function removeItem(entryId: string, itemId: string) {
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e
      const items = e.items.filter(it => it.id !== itemId)
      return { ...e, items: items.length > 0 ? items : [emptyItem()] }
    }))
  }

  function addRow() {
    setEntries(prev => [...prev, emptyEntry()])
  }

  function deleteRow(id: string) {
    setEntries(prev => {
      if (prev.length <= 1) return prev
      return prev.filter(e => e.id !== id)
    })
  }

  function duplicateRow(id: string) {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === id)
      if (idx === -1) return prev
      const copy = {
        ...prev[idx],
        id: genId(),
        items: prev[idx].items.map(i => ({ ...i, id: genId() }))
      }
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
  }

  // --- Excel Upload ---
  async function handleFileUpload(file: File) {
    setUploading(true)
    try {
      const buffer = await file.arrayBuffer()
      const { headers, rows } = await parseExcelFile(buffer)

      if (rows.length === 0) {
        toast.error('No data rows found in the file')
        return
      }

      const lowerHeaders = headers.map(h => h.toLowerCase().trim())
      const findCol = (keywords: string[]) => lowerHeaders.findIndex(h => keywords.some(kw => h.includes(kw)))
      const getVal = (row: Record<string, string>, colIdx: number) => colIdx >= 0 ? (row[headers[colIdx]] || '') : ''

      const supplierCol = findCol(['supplier', 'vendor', 'party'])
      const dateCol = findCol(['date', 'invoice date'])
      const villageCol = findCol(['village', 'site', 'location'])
      const invoiceCol = findCol(['invoice no', 'invoice number', 'bill no'])
      const materialCol = findCol(['material', 'item', 'product'])
      const qtyCol = findCol(['quantity', 'qty'])
      const unitCol = findCol(['unit', 'uom'])
      const rateCol = findCol(['rate', 'price'])
      const amountCol = findCol(['amount', 'total', 'value'])
      const paymentCol = findCol(['payment status', 'status', 'type'])

      function parseDate(val: string): string {
        if (/^\d{2}-\d{2}-\d{4}$/.test(val)) {
          const [d, m, y] = val.split('-')
          return `${y}-${m}-${d}`
        }
        if (/^\d{4,5}$/.test(val) && !isNaN(Number(val))) {
          const d = new Date((Number(val) - 25569) * 86400 * 1000)
          if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
        }
        return val || new Date().toISOString().split('T')[0]
      }

      const newEntries: TransactionEntry[] = rows.map((row) => {
        const paymentVal = getVal(row, paymentCol).toLowerCase()
        const isPayment = paymentVal === 'paid' || paymentVal === 'payment'
        const amount = parseFloat(getVal(row, amountCol).replace(/[,₹]/g, '')) || 0
        const qty = parseFloat(getVal(row, qtyCol).replace(/[,]/g, '')) || 0
        const rate = parseFloat(getVal(row, rateCol).replace(/[,₹]/g, '')) || 0

        const items: TransactionItem[] = []
        if (!isPayment && materialCol >= 0) {
          const material = getVal(row, materialCol)
          if (material) {
            // Use per-item village if available, otherwise fall back to entry-level village
            const perItemVillage = getVal(row, villageCol) || ''
            items.push({
              id: genId(),
              date: parseDate(getVal(row, dateCol)),
              material_name: material,
              village_name: perItemVillage,
              quantity: qty,
              unit: getVal(row, unitCol) || 'Nos',
              rate,
              amount: amount > 0 && qty > 0 ? amount : 0
            })
          }
        }

        return {
          id: genId(),
          supplier_name: getVal(row, supplierCol),
          supplier_invoice_number: getVal(row, invoiceCol),
          payment_mode: '',
          payment_status: (isPayment ? 'paid' : 'unpaid') as 'paid' | 'unpaid',
          amount_paid: isPayment ? amount : 0,
          remarks: '',
          items: items.length > 0 ? items : [emptyItem()],
        }
      }).filter(e => e.supplier_name || e.items.some(i => i.material_name))

      if (newEntries.length === 0) {
        toast.error('No valid entries found in the uploaded file')
        return
      }

      setEntries(prev => {
        const manualRows = prev.filter(e => e.supplier_name || e.items.some(i => i.material_name))
        return manualRows.length > 0 ? [...manualRows, ...newEntries] : newEntries
      })

      toast.success(`${newEntries.length} entries imported from Excel`)
    } catch (err: any) {
      console.error('Upload error:', err)
      toast.error(err.message || 'Failed to parse Excel file')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // --- Save ---
  async function handleSubmit() {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (!entry.supplier_name.trim()) {
        toast.error(`Row ${i + 1}: Supplier name is required`)
        return
      }
      if (entry.payment_status === 'unpaid') {
        const validItems = entry.items.filter(it => it.material_name.trim())
        if (validItems.length === 0) {
          toast.error(`Row ${i + 1}: Add at least one item with a material name`)
          return
        }
      }
    }

    setIsLoading(true)
    let successCount = 0
    let failCount = 0

    for (const entry of entries) {
      try {
        const { data: existing } = await supabase
          .from('parties')
          .select('id')
          .eq('name', entry.supplier_name.trim())
          .eq('party_type', 'supplier')
          .maybeSingle()

        let supplierId: string
        if (existing) {
          supplierId = existing.id
        } else {
          const { data: created, error } = await supabase
            .from('parties')
            .insert([{ name: entry.supplier_name.trim(), party_type: 'supplier' }])
            .select('id')
            .single()
          if (error) throw error
          supplierId = created.id
        }

        const validItems = entry.items.filter(it => it.material_name.trim())
        const itemsWithGst = validItems.map(item => ({
          material_name: item.material_name,
          hsn_code: undefined,
          village_name: item.village_name || undefined,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount > 0 ? item.amount : (item.quantity * item.rate),
          gst_rate: 0,
          gst_amount: 0
        }))

        // Use the earliest item date as the invoice date for the row
        const invoiceDate = validItems.length > 0
          ? validItems.reduce((earliest, item) => item.date < earliest ? item.date : earliest, validItems[0].date)
          : new Date().toISOString().split('T')[0]

        const totalAmount = entry.payment_status === 'paid'
          ? (entry.amount_paid || 0)
          : itemsWithGst.reduce((sum, item) => sum + item.amount, 0)

        const purchaseData = await createPurchase({
          supplier_id: supplierId,
          invoice_date: invoiceDate,
          supplier_invoice_number: entry.supplier_invoice_number || undefined,
          subtotal: totalAmount,
          gst_rate: 0,
          cgst_amount: 0,
          sgst_amount: 0,
          igst_amount: 0,
          total_amount: totalAmount,
          payment_mode: entry.payment_mode || undefined,
          payment_status: entry.payment_status,
          amount_paid: entry.amount_paid,
          balance_due: totalAmount - entry.amount_paid,
          remarks: entry.remarks || undefined
        }, itemsWithGst)

        // Update village stock per item - each item can go to a different village
        let villageStockSuccess = 0
        let villageStockFail = 0
        const villageFailures: string[] = []
        for (const item of validItems) {
          const targetVillage = item.village_name
          if (targetVillage && item.material_name.trim() && item.quantity > 0) {
            try {
              await addMaterialReceipt({
                village_name: targetVillage,
                material_name: item.material_name,
                quantity: item.quantity,
                contractor_name: entry.supplier_name,
                reference_purchase_id: purchaseData.id,
                notes: `Purchase ${purchaseData.purchase_number}`,
                transaction_date: item.date
              })
              villageStockSuccess++
            } catch (err) {
              villageStockFail++
              villageFailures.push(item.material_name)
              console.error(`Failed to update village stock for ${item.material_name} in ${targetVillage}:`, err)
            }
          }
        }
        if (villageStockFail > 0) {
          toast.error(`Failed to update village stock for ${villageStockFail} item(s): ${villageFailures.join(', ')}`)
        } else if (villageStockSuccess > 0) {
          toast.success(`Village stock updated for ${villageStockSuccess} material(s)`)
        }

        successCount++
      } catch (error: any) {
        failCount++
        console.error('Save failed:', error)
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} transaction${successCount > 1 ? 's' : ''} saved`)
      if (failCount === 0) router.push('/purchases')
    }
    if (failCount > 0) toast.error(`${failCount} transaction${failCount > 1 ? 's' : ''} failed`)
    setIsLoading(false)
  }

  const grandTotal = entries.reduce((sum, e) => sum + calcEntryTotal(e), 0)
  const purchaseCount = entries.filter(e => e.payment_status === 'unpaid').length
  const paymentCount = entries.filter(e => e.payment_status === 'paid').length

  const villageOptions = VILLAGES.map(v => ({ value: v, label: v }))
  const unitOptions = UNITS.map(u => ({ value: u, label: u }))
  const paymentModeOptions = PAYMENT_MODES.map(m => ({ value: m, label: m }))

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Keyboard shortcut hint */}
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-gray-900 text-white text-[11px] px-3 py-1.5 rounded-full shadow-lg font-medium opacity-60">
            Ctrl+Enter to save
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-sm">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">New Purchases</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Each item row can have its own date and amount
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.ods"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium shadow-sm"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload Excel
            </button>
            <button
              onClick={addRow}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm font-medium shadow-sm shadow-blue-200"
            >
              <Plus className="w-4 h-4" /> Add Supplier
            </button>
          </div>
        </div>

        {/* Transaction Cards */}
        <div className="space-y-4">
          {entries.map((entry, idx) => {
            const isPayment = entry.payment_status === 'paid'
            const total = calcEntryTotal(entry)

            return (
              <div
                key={entry.id}
                className={`bg-white rounded-2xl shadow-sm border transition-all ${
                  isPayment ? 'border-emerald-200' : 'border-gray-200'
                }`}
              >
                {/* Card Header — Supplier details */}
                <div className={`px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center gap-3 ${
                  isPayment ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-gray-100'
                }`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 text-xs font-bold text-gray-500 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider shrink-0">Supplier</p>
                        <div className="flex-1 min-w-0 max-w-[300px]">
                          <SupplierDropdown
                            value={entry.supplier_name}
                            onChange={(v) => updateEntry(entry.id, 'supplier_name', v)}
                            placeholder="Select or type supplier"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Type Toggle */}
                    <button
                      type="button"
                      onClick={() => updateEntry(entry.id, 'payment_status', isPayment ? 'unpaid' : 'paid')}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        isPayment
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      }`}
                    >
                      {isPayment ? '💰 Payment' : '📦 Purchase'}
                    </button>

                    {/* Row actions */}
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => duplicateRow(entry.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {entries.length > 1 && (
                        <button
                          onClick={() => deleteRow(entry.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Body — Material items with dates */}
                <div className="px-5 py-4">
                  {/* Supplier meta fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Invoice No.</label>
                      <input
                        type="text"
                        value={entry.supplier_invoice_number}
                        onChange={(e) => updateEntry(entry.id, 'supplier_invoice_number', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-300"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Payment Mode</label>
                      <SearchableSelect
                        value={entry.payment_mode}
                        onChange={(v) => updateEntry(entry.id, 'payment_mode', v)}
                        options={paymentModeOptions}
                        placeholder="—"
                        searchable={false}
                      />
                    </div>
                  </div>

                  {/* Items section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Material Items</h4>
                      {!isPayment && (
                        <button
                          onClick={() => addItem(entry.id)}
                          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Item
                        </button>
                      )}
                    </div>

                    {!isPayment ? (
                      <div className="space-y-3">
                        {/* Column headers */}
                        <div className="hidden sm:grid grid-cols-[110px_1fr_100px_80px_90px_90px_80px_36px] gap-2 px-2">
                          {['Village', 'Material *', 'Date', 'Qty', 'Unit', 'Rate', 'Amount', ''].map(h => (
                            <span key={h} className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{h}</span>
                          ))}
                        </div>
                        <div className="hidden sm:block text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">Each item can be assigned to a different village</div>

                        {entry.items.map((item) => (
                          <div
                            key={item.id}
                            className="grid grid-cols-1 sm:grid-cols-[110px_1fr_100px_80px_90px_90px_80px_36px] gap-2 sm:gap-2 bg-white rounded-xl p-3 border border-gray-200 shadow-sm hover:border-gray-300 transition-all"
                          >
                            {/* Village */}
                            <div>
                              <label className="sm:hidden text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Village</label>
                              <select
                                value={item.village_name}
                                onChange={(e) => updateItem(entry.id, item.id, 'village_name', e.target.value)}
                                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                              >
                                <option value="">Village...</option>
                                {VILLAGES.map(v => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                            </div>
                            {/* Material name */}
                            <div>
                              <label className="sm:hidden text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Material</label>
                              <input
                                type="text"
                                value={item.material_name}
                                onChange={(e) => updateItem(entry.id, item.id, 'material_name', e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-300"
                                placeholder="e.g. Cement"
                              />
                            </div>
                            {/* Date */}
                            <div>
                              <label className="sm:hidden text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Date</label>
                              <DatePicker
                                value={item.date}
                                onChange={(v) => updateItem(entry.id, item.id, 'date', v)}
                              />
                            </div>
                            {/* Qty */}
                            <div>
                              <label className="sm:hidden text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Qty</label>
                              <input
                                type="number"
                                step="0.001"
                                value={item.quantity || ''}
                                onChange={(e) => updateItem(entry.id, item.id, 'quantity', Number(e.target.value))}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-300"
                                placeholder="0"
                              />
                            </div>
                            {/* Unit */}
                            <div>
                              <label className="sm:hidden text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Unit</label>
                              <SearchableSelect
                                value={item.unit}
                                onChange={(v) => updateItem(entry.id, item.id, 'unit', v)}
                                options={unitOptions}
                                placeholder="Unit"
                                searchable={false}
                              />
                            </div>
                            {/* Rate */}
                            <div>
                              <label className="sm:hidden text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Rate</label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.rate || ''}
                                onChange={(e) => updateItem(entry.id, item.id, 'rate', Number(e.target.value))}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-300"
                                placeholder="0"
                              />
                            </div>
                            {/* Amount — EDITABLE */}
                            <div>
                              <label className="sm:hidden text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Amount</label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.amount || ''}
                                onChange={(e) => updateItem(entry.id, item.id, 'amount', Number(e.target.value))}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-right font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-300"
                                placeholder="0"
                              />
                            </div>
                            {/* Delete */}
                            {entry.items.length > 1 && (
                              <button
                                onClick={() => removeItem(entry.id, item.id)}
                                className="p-2 mt-0 sm:mt-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors self-end sm:self-center"
                                title="Remove item"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                        <p className="text-sm font-bold text-emerald-700">💲 Payment Entry</p>
                        <div className="mt-2 flex items-center gap-3">
                          <label className="text-xs font-semibold text-emerald-600">Amount Paid</label>
                          <input
                            type="number"
                            step="0.01"
                            value={entry.amount_paid || ''}
                            onChange={(e) => updateEntry(entry.id, 'amount_paid', Number(e.target.value))}
                            className="w-36 px-3 py-2 border border-emerald-300 rounded-lg text-sm text-right font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                            placeholder="0"
                          />
                          <span className="text-sm font-bold text-emerald-700">{formatCurrency(entry.amount_paid || 0)}</span>
                        </div>
                      </div>
                    )}

                    {/* Item total */}
                    {!isPayment && (
                      <div className="flex justify-end items-center gap-1 pt-1 pr-1">
                        <span className="text-xs text-gray-400">Item Total:</span>
                        <span className="text-sm font-bold text-gray-800 tabular-nums">{formatCurrency(total)}</span>
                      </div>
                    )}
                  </div>

                  {/* Remarks */}
                  <div className="mt-4">
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Remarks</label>
                    <textarea
                      value={entry.remarks}
                      onChange={(e) => updateEntry(entry.id, 'remarks', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={2}
                      placeholder="Notes about this transaction..."
                    />
                  </div>
                </div>

                {/* Card footer — row total */}
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {entry.items.length} item{entry.items.length !== 1 ? 's' : ''}
                    {entry.supplier_invoice_number && ` • Inv: ${entry.supplier_invoice_number}`}
                  </span>
                  <span className="text-base font-bold text-gray-900 tabular-nums">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Grand Total Bar */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
                <span className="font-bold text-gray-900">{entries.length}</span> Supplier{entries.length !== 1 ? 's' : ''}
              </span>
              {purchaseCount > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full font-medium">
                  📦 {purchaseCount} Purchase{purchaseCount !== 1 ? 's' : ''}
                </span>
              )}
              {paymentCount > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full font-medium">
                  💰 {paymentCount} Payment{paymentCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <span className="text-sm font-medium text-gray-500">Grand Total:</span>
              <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={addRow}
            className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add Another Supplier
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all text-sm font-medium bg-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || entries.length === 0}
              className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 text-sm font-semibold shadow-sm shadow-blue-200 flex items-center gap-2"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4" /> Save {entries.length} Transaction{entries.length !== 1 ? 's' : ''}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
