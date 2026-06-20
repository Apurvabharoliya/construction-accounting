'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createSale } from '@/lib/api/sales'
import { toast } from 'sonner'
import { Plus, Trash2, Upload, ChevronDown, ChevronUp, Copy, Loader2, FileSpreadsheet } from 'lucide-react'
import { formatCurrency, UNITS, PAYMENT_MODES } from '@/lib/gst'
import DatePicker from '@/components/ui/DatePicker'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { parseExcelFile } from '@/lib/import'
import { genId, calcEntryTotal } from '@/lib/transaction-utils'
import BeneficiaryDropdown from '@/components/ui/BeneficiaryDropdown'
import React from 'react'

interface SaleItem {
  item_name: string
  quantity: number
  unit: string
  rate: number
  amount: number
}

interface SaleEntry {
  id: string
  client_name: string
  invoice_date: string
  payment_mode: string
  payment_status: 'unpaid' | 'paid'
  amount_received: number
  remarks: string
  items: SaleItem[]
  expanded: boolean
}

function emptyItem(): SaleItem {
  return { item_name: '', quantity: 0, unit: 'Nos', rate: 0, amount: 0 }
}

function emptyEntry(): SaleEntry {
  return {
    id: genId(),
    client_name: '',
    invoice_date: new Date().toISOString().split('T')[0],
    payment_mode: '',
    payment_status: 'unpaid',
    amount_received: 0,
    remarks: '',
    items: [emptyItem()],
    expanded: false
  }
}

export default function NewSalePage() {
  const router = useRouter()
  const [entries, setEntries] = useState<SaleEntry[]>([emptyEntry()])
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

  function updateEntry(id: string, field: keyof SaleEntry, value: any) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  function updateItem(entryId: string, itemIdx: number, field: keyof SaleItem, value: any) {
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e
      const items = [...e.items]
      items[itemIdx] = { ...items[itemIdx], [field]: value }
      return { ...e, items }
    }))
  }

  function addItem(entryId: string) {
    setEntries(prev => prev.map(e =>
      e.id === entryId ? { ...e, items: [...e.items, emptyItem()] } : e
    ))
  }

  function removeItem(entryId: string, itemIdx: number) {
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e
      const items = e.items.filter((_, i) => i !== itemIdx)
      return { ...e, items: items.length > 0 ? items : [emptyItem()] }
    }))
  }

  function addRow() {
    setEntries(prev => [...prev, emptyEntry()])
  }

  function deleteRow(id: string) {
    setEntries(prev => prev.length <= 1 ? prev : prev.filter(e => e.id !== id))
  }

  function duplicateRow(id: string) {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === id)
      if (idx === -1) return prev
      const copy = { ...prev[idx], id: genId(), items: prev[idx].items.map(i => ({ ...i })) }
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
  }

  function toggleExpand(id: string) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, expanded: !e.expanded } : e))
  }

  async function handleFileUpload(file: File) {
    setUploading(true)
    try {
      const buffer = await file.arrayBuffer()
      const { headers, rows } = await parseExcelFile(buffer)
      if (rows.length === 0) { toast.error('No data rows found'); return }

      const lh = headers.map(h => h.toLowerCase().trim())
      const findCol = (kw: string[]) => lh.findIndex(h => kw.some(k => h.includes(k)))
      const getVal = (row: Record<string, string>, ci: number) => ci >= 0 ? (row[headers[ci]] || '') : ''

      const clientCol = findCol(['client', 'customer', 'beneficiary', 'party'])
      const dateCol = findCol(['date', 'invoice date'])
      const itemCol = findCol(['item', 'material', 'service', 'work'])
      const qtyCol = findCol(['quantity', 'qty'])
      const unitCol = findCol(['unit'])
      const rateCol = findCol(['rate', 'price'])
      const amountCol = findCol(['amount', 'total'])
      const paymentCol = findCol(['payment status', 'status', 'type'])

      const newEntries: SaleEntry[] = rows.map(row => {
        const paymentVal = getVal(row, paymentCol).toLowerCase()
        const isPayment = paymentVal === 'paid' || paymentVal === 'payment'
        const amount = parseFloat(getVal(row, amountCol).replace(/[,₹]/g, '')) || 0

        let dateVal = getVal(row, dateCol)
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateVal)) {
          const [d, m, y] = dateVal.split('-')
          dateVal = `${y}-${m}-${d}`
        }

        const items: SaleItem[] = []
        if (!isPayment && itemCol >= 0) {
          const name = getVal(row, itemCol)
          if (name) {
            items.push({
              item_name: name,
              quantity: parseFloat(getVal(row, qtyCol)) || 0,
              unit: getVal(row, unitCol) || 'Nos',
              rate: parseFloat(getVal(row, rateCol).replace(/[,₹]/g, '')) || 0,
              amount
            })
          }
        }

        return {
          id: genId(),
          client_name: getVal(row, clientCol),
          invoice_date: dateVal || new Date().toISOString().split('T')[0],
          payment_mode: '',
          payment_status: (isPayment ? 'paid' : 'unpaid') as 'paid' | 'unpaid',
          amount_received: isPayment ? amount : 0,
          remarks: '',
          items: items.length > 0 ? items : [emptyItem()],
          expanded: false
        }
      }).filter(e => e.client_name || e.items.some(i => i.item_name))

      if (newEntries.length === 0) { toast.error('No valid entries found'); return }

      setEntries(prev => {
        const manual = prev.filter(e => e.client_name || e.items.some(i => i.item_name))
        return manual.length > 0 ? [...manual, ...newEntries] : newEntries
      })
      toast.success(`${newEntries.length} entries imported`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse file')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSubmit() {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]
      if (!e.client_name.trim()) { toast.error(`Row ${i + 1}: Beneficiary name is required`); return }
      if (e.payment_status === 'unpaid' && !e.items.some(it => it.item_name.trim())) {
        toast.error(`Row ${i + 1}: Add at least one item`); return
      }
    }

    setIsLoading(true)
    let success = 0, fail = 0

    for (const entry of entries) {
      try {
        const { data: existing } = await supabase.from('parties').select('id').eq('name', entry.client_name.trim()).eq('party_type', 'beneficiary').maybeSingle()
        let clientId: string
        if (existing) {
          clientId = existing.id
        } else {
          const { data: created, error } = await supabase.from('parties').insert([{ name: entry.client_name.trim(), party_type: 'beneficiary', opening_balance: 0, gst_registered: false }]).select('id').single()
          if (error) throw error
          clientId = created.id
        }

        const validItems = entry.items.filter(it => it.item_name.trim())
        const itemsWithGst = validItems.map(item => {
          const amount = item.amount > 0 ? item.amount : (item.quantity * item.rate)
          return { item_name: item.item_name, hsn_code: undefined, quantity: item.quantity, unit: item.unit, rate: item.rate, amount, gst_rate: 0, gst_amount: 0 }
        })

        const totalAmount = entry.payment_status === 'paid' ? (entry.amount_received || 0) : itemsWithGst.reduce((s, i) => s + i.amount, 0)

        await createSale({
          client_id: clientId,
          invoice_date: entry.invoice_date,
          subtotal: totalAmount,
          gst_rate: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0,
          total_amount: totalAmount,
          payment_mode: entry.payment_mode || undefined,
          payment_status: entry.payment_status,
          amount_received: entry.amount_received,
          balance_due: totalAmount - entry.amount_received,
          remarks: entry.remarks || undefined
        }, itemsWithGst)

        success++
      } catch (err: any) {
        fail++
        console.error('Save failed:', err)
      }
    }

    if (success > 0) { toast.success(`${success} sale(s) recorded`); if (fail === 0) router.push('/sales') }
    if (fail > 0) toast.error(`${fail} sale(s) failed`)
    setIsLoading(false)
  }

  const grandTotal = entries.reduce((s, e) => s + calcEntryTotal(e), 0)
  const saleCount = entries.filter(e => e.payment_status === 'unpaid').length
  const receiptCount = entries.filter(e => e.payment_status === 'paid').length

  const unitOptions = UNITS.map(u => ({ value: u, label: u }))
  const paymentModeOptions = PAYMENT_MODES.map(m => ({ value: m, label: m }))

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">New Sales</h1>
              <p className="text-gray-500 text-sm mt-0.5">Enter data in the table or upload an Excel file</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.ods" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium shadow-sm">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload Excel
            </button>
            <button onClick={addRow} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm font-medium shadow-sm shadow-blue-200">
              <Plus className="w-4 h-4" /> Add Row
            </button>
          </div>
        </div>

        {/* Spreadsheet */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-8">#</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider min-w-[180px]">Beneficiary *</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider min-w-[140px]">Date *</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider min-w-[100px]">Type</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider min-w-[140px]">Item</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-16">Qty</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-20">Unit</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-20">Rate</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-24">Amount ₹</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-28">Pay Mode</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((entry, idx) => {
                  const isPayment = entry.payment_status === 'paid'
                  const total = calcEntryTotal(entry)
                  return (
                    <React.Fragment key={entry.id}>
                      <tr className={`group transition-colors ${isPayment ? 'bg-emerald-50/30 hover:bg-emerald-50/60' : 'hover:bg-blue-50/20'}`}>
                        <td className="px-3 py-2.5 text-xs text-gray-400 font-mono">{idx + 1}</td>
                        <td className="px-2.5 py-2">
                          <BeneficiaryDropdown value={entry.client_name} onChange={(v) => updateEntry(entry.id, 'client_name', v)} className="w-full" placeholder="Select beneficiary" />
                        </td>
                        <td className="px-2.5 py-2">
                          <DatePicker value={entry.invoice_date} onChange={(v) => updateEntry(entry.id, 'invoice_date', v)} />
                        </td>
                        <td className="px-2.5 py-2 text-center">
                          <button type="button" onClick={() => updateEntry(entry.id, 'payment_status', isPayment ? 'unpaid' : 'paid')} className={`relative inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${isPayment ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-sm shadow-emerald-100' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 shadow-sm shadow-blue-100'}`}>
                            {isPayment ? '💰 Receipt' : '📦 Sale'}
                          </button>
                        </td>
                        <td className="px-2.5 py-2">
                          {isPayment ? <span className="text-xs text-gray-300 italic px-3">—</span> : (
                            <input type="text" value={entry.items[0]?.item_name || ''} onChange={(e) => updateItem(entry.id, 0, 'item_name', e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-300" placeholder="e.g. Service" />
                          )}
                        </td>
                        <td className="px-2.5 py-2">
                          {isPayment ? <span className="text-xs text-gray-300 px-3">—</span> : (
                            <input type="number" step="0.001" value={entry.items[0]?.quantity || ''} onChange={(e) => updateItem(entry.id, 0, 'quantity', Number(e.target.value))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-300" placeholder="0" />
                          )}
                        </td>
                        <td className="px-2.5 py-2">
                          {isPayment ? <span className="text-xs text-gray-300 px-3">—</span> : (
                            <SearchableSelect value={entry.items[0]?.unit || 'Nos'} onChange={(v) => updateItem(entry.id, 0, 'unit', v)} options={unitOptions} placeholder="Unit" searchable={false} />
                          )}
                        </td>
                        <td className="px-2.5 py-2">
                          {isPayment ? <span className="text-xs text-gray-300 px-3">—</span> : (
                            <input type="number" step="0.01" value={entry.items[0]?.rate || ''} onChange={(e) => updateItem(entry.id, 0, 'rate', Number(e.target.value))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-300" placeholder="0" />
                          )}
                        </td>
                        <td className="px-2.5 py-2">
                          {isPayment ? (
                            <input type="number" step="0.01" value={entry.amount_received || ''} onChange={(e) => updateEntry(entry.id, 'amount_received', Number(e.target.value))} className="w-full px-3 py-2.5 border border-emerald-200 rounded-lg text-sm text-right font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-emerald-50/50 transition-all placeholder:text-gray-300" placeholder="Amount" />
                          ) : (
                            <span className="block px-3 py-2.5 text-sm text-right font-bold text-gray-800 tabular-nums">{formatCurrency(total)}</span>
                          )}
                        </td>
                        <td className="px-2.5 py-2">
                          <SearchableSelect value={entry.payment_mode} onChange={(v) => updateEntry(entry.id, 'payment_mode', v)} options={paymentModeOptions} placeholder="—" searchable={false} />
                        </td>
                        <td className="px-2.5 py-2">
                          <div className="flex items-center justify-center gap-0.5">
                            <button onClick={() => toggleExpand(entry.id)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="View / Edit details">
                              {entry.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            <button onClick={() => duplicateRow(entry.id)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all" title="Duplicate row">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteRow(entry.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete row">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {entry.expanded && (
                        <tr className="bg-gray-50/80">
                          <td colSpan={11} className="px-8 py-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                              <div className="md:col-span-2 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Items</h4>
                                  {!isPayment && <button onClick={() => addItem(entry.id)} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"><Plus className="w-3 h-3" /> Add Item</button>}
                                </div>
                                {!isPayment ? (
                                  <div className="space-y-2">
                                    {entry.items.map((item, ii) => (
                                      <div key={ii} className="flex items-center gap-2 bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                                        <input type="text" value={item.item_name} onChange={(e) => updateItem(entry.id, ii, 'item_name', e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Item name" />
                                        <input type="number" step="0.001" value={item.quantity || ''} onChange={(e) => updateItem(entry.id, ii, 'quantity', Number(e.target.value))} className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Qty" />
                                        <select value={item.unit} onChange={(e) => updateItem(entry.id, ii, 'unit', e.target.value)} className="w-16 px-1 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select>
                                        <input type="number" step="0.01" value={item.rate || ''} onChange={(e) => updateItem(entry.id, ii, 'rate', Number(e.target.value))} className="w-20 px-2 py-2 border border-gray-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Rate" />
                                        <input type="number" step="0.01" value={item.amount || ''} onChange={(e) => updateItem(entry.id, ii, 'amount', Number(e.target.value))} className="w-20 px-2 py-2 border border-gray-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Amount" />
                                        {entry.items.length > 1 && <button onClick={() => removeItem(entry.id, ii)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                                    <p className="text-sm text-emerald-700"><span className="font-bold">Receipt entry</span> — No items needed.</p>
                                    <p className="text-sm text-emerald-600 mt-1">Amount: <span className="font-bold text-lg">{formatCurrency(entry.amount_received || 0)}</span></p>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Remarks</label>
                                  <textarea value={entry.remarks} onChange={(e) => updateEntry(entry.id, 'remarks', e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" rows={3} placeholder="Notes..." />
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grand Total Bar */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
                <span className="font-bold text-gray-900">{entries.length}</span> Row{entries.length !== 1 ? 's' : ''}
              </span>
              {saleCount > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-medium">
                  📦 {saleCount} Sale{saleCount !== 1 ? 's' : ''}
                </span>
              )}
              {receiptCount > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full font-medium">
                  💰 {receiptCount} Receipt{receiptCount !== 1 ? 's' : ''}
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
          <button onClick={addRow} className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all text-sm font-medium">
            <Plus className="w-4 h-4" /> Add Another Row
          </button>
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="px-6 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all text-sm font-medium bg-white">Cancel</button>
            <button onClick={handleSubmit} disabled={isLoading || entries.length === 0} className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 text-sm font-semibold shadow-sm shadow-blue-200">
              {isLoading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</span> : `Save ${entries.length} Sale${entries.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
