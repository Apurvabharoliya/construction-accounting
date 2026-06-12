'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createPurchase } from '@/lib/api/purchases'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronDown, ChevronRight, Copy, ShoppingCart } from 'lucide-react'
import { formatCurrency, UNITS, PAYMENT_MODES } from '@/lib/gst'
import DatePicker from '@/components/ui/DatePicker'

interface TransactionItem {
  material_name: string
  hsn_code: string
  quantity: number
  unit: string
  rate: number
  amount: number
  gst_rate: number
}

interface TransactionEntry {
  supplier_name: string
  invoice_date: string
  supplier_invoice_number: string
  payment_mode: string
  payment_status: 'paid' | 'unpaid'
  amount_paid: number
  remarks: string
  items: TransactionItem[]
}

function emptyItem(): TransactionItem {
  return { material_name: '', hsn_code: '', quantity: 0, unit: 'Nos', rate: 0, amount: 0, gst_rate: 18 }
}

function emptyEntry(): TransactionEntry {
  return {
    supplier_name: '',
    invoice_date: new Date().toISOString().split('T')[0],
    supplier_invoice_number: '',
    payment_mode: '',
    payment_status: 'unpaid',
    amount_paid: 0,
    remarks: '',
    items: [emptyItem()]
  }
}

export default function NewTransactionPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<TransactionEntry[]>([emptyEntry()])
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set([0]))
  const [isLoading, setIsLoading] = useState(false)

  function updateEntry(index: number, field: keyof TransactionEntry, value: any) {
    setEntries(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function updateItem(entryIdx: number, itemIdx: number, field: keyof TransactionItem, value: any) {
    setEntries(prev => {
      const next = [...prev]
      const items = [...next[entryIdx].items]
      items[itemIdx] = { ...items[itemIdx], [field]: value }
      next[entryIdx] = { ...next[entryIdx], items }
      return next
    })
  }

  function addItem(entryIdx: number) {
    setEntries(prev => {
      const next = [...prev]
      next[entryIdx] = { ...next[entryIdx], items: [...next[entryIdx].items, emptyItem()] }
      return next
    })
  }

  function removeItem(entryIdx: number, itemIdx: number) {
    setEntries(prev => {
      const next = [...prev]
      const items = next[entryIdx].items.filter((_, i) => i !== itemIdx)
      next[entryIdx] = { ...next[entryIdx], items }
      return next
    })
  }

  function addEntry() {
    setEntries(prev => [...prev, emptyEntry()])
    setExpandedEntries(prev => new Set([...prev, entries.length]))
  }

  function removeEntry(index: number) {
    if (entries.length <= 1) return
    setEntries(prev => prev.filter((_, i) => i !== index))
    setExpandedEntries(prev => {
      const next = new Set(prev)
      next.delete(index)
      return next
    })
  }

  function duplicateEntry(index: number) {
    const entry = entries[index]
    setEntries(prev => {
      const next = [...prev]
      next.splice(index + 1, 0, {
        ...entry,
        items: entry.items.map(item => ({ ...item }))
      })
      return next
    })
  }

  function toggleEntry(index: number) {
    setExpandedEntries(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function calcItemTotal(item: TransactionItem): number {
    const amt = item.amount > 0 ? item.amount : (item.quantity * item.rate)
    const gst = amt * item.gst_rate / 100
    return amt + gst
  }

  function calcEntryTotals(entry: TransactionEntry) {
    let subtotal = 0
    let totalGst = 0
    entry.items.forEach(item => {
      const amt = item.amount > 0 ? item.amount : (item.quantity * item.rate)
      const gst = amt * item.gst_rate / 100
      subtotal += amt
      totalGst += gst
    })
    return { subtotal, totalGst, total: subtotal + totalGst }
  }

  async function resolveOrCreateSupplier(name: string): Promise<string> {
    const { data: existing } = await supabase
      .from('parties')
      .select('id')
      .eq('name', name)
      .eq('party_type', 'supplier')
      .maybeSingle()
    if (existing) return existing.id
    const { data: created, error } = await supabase
      .from('parties')
      .insert([{ name, party_type: 'supplier' }])
      .select('id')
      .single()
    if (error) throw new Error(`Failed to create supplier: ${error.message}`)
    return created.id
  }

  async function handleSubmit() {
    // Validate
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (!entry.supplier_name.trim()) {
        toast.error(`Transaction ${i + 1}: Supplier name is required`)
        setExpandedEntries(prev => new Set([...prev, i]))
        return
      }
      if (!entry.invoice_date) {
        toast.error(`Transaction ${i + 1}: Invoice date is required`)
        setExpandedEntries(prev => new Set([...prev, i]))
        return
      }
      const validItems = entry.items.filter(item => item.material_name.trim())
      if (validItems.length === 0) {
        toast.error(`Transaction ${i + 1}: Add at least one item with a material name`)
        setExpandedEntries(prev => new Set([...prev, i]))
        return
      }
    }

    setIsLoading(true)
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < entries.length; i++) {
      try {
        const entry = entries[i]
        const validItems = entry.items.filter(item => item.material_name.trim())

        const itemsWithGst = validItems.map(item => {
          const amount = item.amount > 0 ? item.amount : (item.quantity * item.rate)
          const gstAmount = amount * item.gst_rate / 100
          return {
            material_name: item.material_name,
            hsn_code: item.hsn_code || undefined,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            amount,
            gst_rate: item.gst_rate,
            gst_amount: gstAmount
          }
        })

        const totalAmount = itemsWithGst.reduce((sum, item) => sum + item.amount, 0)
        const totalGstAmount = itemsWithGst.reduce((sum, item) => sum + item.gst_amount, 0)
        const totalWithGst = totalAmount + totalGstAmount

        const supplier_id = await resolveOrCreateSupplier(entry.supplier_name)

        await createPurchase({
          supplier_id,
          invoice_date: entry.invoice_date,
          supplier_invoice_number: entry.supplier_invoice_number || undefined,
          subtotal: totalAmount,
          gst_rate: 0,
          cgst_amount: totalGstAmount / 2,
          sgst_amount: totalGstAmount / 2,
          igst_amount: 0,
          total_amount: totalWithGst,
          payment_mode: entry.payment_mode || undefined,
          payment_status: entry.payment_status,
          amount_paid: entry.amount_paid,
          balance_due: totalWithGst - entry.amount_paid,
          remarks: entry.remarks || undefined
        }, itemsWithGst)

        successCount++
      } catch (error: any) {
        failCount++
        console.error(`Transaction ${i + 1} failed:`, error)
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} transaction${successCount > 1 ? 's' : ''} recorded successfully`)
      if (failCount === 0) {
        router.push('/purchases')
        router.refresh()
      }
    }
    if (failCount > 0) {
      toast.error(`${failCount} transaction${failCount > 1 ? 's' : ''} failed`)
    }
    setIsLoading(false)
  }

  const totalAllEntries = entries.reduce((sum, e) => {
    const { total } = calcEntryTotals(e)
    return sum + total
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Transaction</h1>
          <p className="text-gray-500 text-sm mt-1">
            Record {entries.length} purchase transaction{entries.length > 1 ? 's' : ''} at once
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={addEntry}
            className="flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add Another
          </button>
        </div>
      </div>

      {/* Transaction Entries */}
      <div className="space-y-4">
        {entries.map((entry, entryIdx) => {
          const { subtotal, totalGst, total } = calcEntryTotals(entry)
          const isExpanded = expandedEntries.has(entryIdx)
          const itemCount = entry.items.filter(i => i.material_name.trim()).length

          return (
            <div key={entryIdx} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Entry Header */}
              <button
                type="button"
                onClick={() => toggleEntry(entryIdx)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {entry.supplier_name || <span className="text-gray-400">Transaction {entryIdx + 1}</span>}
                  </p>
                  <p className="text-xs text-gray-400">
                    {itemCount} item{itemCount !== 1 ? 's' : ''} • {formatCurrency(total)}
                    {entry.payment_status === 'paid' ? ' • Paid' : ' • Unpaid'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">#{entryIdx + 1}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Expanded Form */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-5 space-y-5">
                  {/* Basic Details */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
                      <input
                        type="text"
                        value={entry.supplier_name}
                        onChange={(e) => updateEntry(entryIdx, 'supplier_name', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter supplier name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                      <DatePicker
                        value={entry.invoice_date}
                        onChange={(v) => updateEntry(entryIdx, 'invoice_date', v)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Inv No.</label>
                      <input
                        type="text"
                        value={entry.supplier_invoice_number}
                        onChange={(e) => updateEntry(entryIdx, 'supplier_invoice_number', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Items</label>
                      <button
                        type="button"
                        onClick={() => addItem(entryIdx)}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Item
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[550px]">
                        <thead>
                          <tr className="text-left text-gray-500 text-xs border-b">
                            <th className="pb-2 pr-2 font-medium">Material</th>
                            <th className="pb-2 pr-2 font-medium hidden sm:table-cell">HSN</th>
                            <th className="pb-2 pr-2 font-medium">Qty</th>
                            <th className="pb-2 pr-2 font-medium hidden sm:table-cell">Unit</th>
                            <th className="pb-2 pr-2 font-medium">Rate</th>
                            <th className="pb-2 pr-2 font-medium">Amount</th>
                            <th className="pb-2 pr-2 font-medium">GST%</th>
                            <th className="pb-2 pr-2 font-medium hidden md:table-cell">Total</th>
                            <th className="pb-2 font-medium"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.items.map((item, itemIdx) => (
                            <tr key={itemIdx} className="border-b">
                              <td className="py-1.5 pr-2">
                                <input
                                  type="text"
                                  value={item.material_name}
                                  onChange={(e) => updateItem(entryIdx, itemIdx, 'material_name', e.target.value)}
                                  className="w-24 md:w-28 px-1.5 py-1 border rounded text-xs md:text-sm"
                                  placeholder="Material"
                                />
                              </td>
                              <td className="py-1.5 pr-2 hidden sm:table-cell">
                                <input
                                  type="text"
                                  value={item.hsn_code}
                                  onChange={(e) => updateItem(entryIdx, itemIdx, 'hsn_code', e.target.value)}
                                  className="w-14 md:w-16 px-1.5 py-1 border rounded text-xs md:text-sm"
                                  placeholder="HSN"
                                />
                              </td>
                              <td className="py-1.5 pr-2">
                                <input
                                  type="number"
                                  step="0.001"
                                  value={item.quantity || ''}
                                  onChange={(e) => updateItem(entryIdx, itemIdx, 'quantity', Number(e.target.value))}
                                  className="w-14 md:w-16 px-1.5 py-1 border rounded text-xs md:text-sm"
                                  placeholder="0"
                                />
                              </td>
                              <td className="py-1.5 pr-2 hidden sm:table-cell">
                                <select
                                  value={item.unit}
                                  onChange={(e) => updateItem(entryIdx, itemIdx, 'unit', e.target.value)}
                                  className="w-14 md:w-16 px-1 py-1 border rounded text-xs md:text-sm"
                                >
                                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                              </td>
                              <td className="py-1.5 pr-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.rate || ''}
                                  onChange={(e) => updateItem(entryIdx, itemIdx, 'rate', Number(e.target.value))}
                                  className="w-16 md:w-20 px-1.5 py-1 border rounded text-xs md:text-sm"
                                  placeholder="0"
                                />
                              </td>
                              <td className="py-1.5 pr-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.amount || ''}
                                  onChange={(e) => updateItem(entryIdx, itemIdx, 'amount', Number(e.target.value))}
                                  className="w-16 md:w-20 px-1.5 py-1 border rounded text-xs md:text-sm"
                                  placeholder="Or enter"
                                />
                              </td>
                              <td className="py-1.5 pr-2">
                                <select
                                  value={item.gst_rate}
                                  onChange={(e) => updateItem(entryIdx, itemIdx, 'gst_rate', Number(e.target.value))}
                                  className="w-14 md:w-16 px-1 py-1 border rounded text-xs md:text-sm"
                                >
                                  {[0, 3, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                                </select>
                              </td>
                              <td className="py-1.5 pr-2 text-xs md:text-sm font-medium hidden md:table-cell">
                                {formatCurrency(calcItemTotal(item))}
                              </td>
                              <td className="py-1.5">
                                {entry.items.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeItem(entryIdx, itemIdx)}
                                    className="p-1 text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Summary & Payment */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">GST</span>
                        <span className="font-medium">{formatCurrency(totalGst)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold border-t pt-2">
                        <span>Total</span>
                        <span>{formatCurrency(total)}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Payment Status</label>
                          <select
                            value={entry.payment_status}
                            onChange={(e) => updateEntry(entryIdx, 'payment_status', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          >
                            <option value="unpaid">Unpaid</option>
                            <option value="paid">Paid</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Payment Mode</label>
                          <select
                            value={entry.payment_mode}
                            onChange={(e) => updateEntry(entryIdx, 'payment_mode', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          >
                            <option value="">Select</option>
                            {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>
                      {entry.payment_status === 'paid' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Amount Paid (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={entry.amount_paid || ''}
                            onChange={(e) => updateEntry(entryIdx, 'amount_paid', Number(e.target.value))}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                        <input
                          type="text"
                          value={entry.remarks}
                          onChange={(e) => updateEntry(entryIdx, 'remarks', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          placeholder="Optional notes"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Entry Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    {entries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEntry(entryIdx)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => duplicateEntry(entryIdx)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" /> Duplicate
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Grand Total Bar */}
      {entries.length > 1 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700">
              {entries.length} Transaction{entries.length > 1 ? 's' : ''}
            </span>
            <span className="text-lg font-bold text-blue-800">
              Grand Total: {formatCurrency(totalAllEntries)}
            </span>
          </div>
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addEntry}
          className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Add Another Transaction
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : `Save ${entries.length} Transaction${entries.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
