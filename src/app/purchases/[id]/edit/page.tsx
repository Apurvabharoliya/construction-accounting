'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import React from 'react'
import { supabase } from '@/lib/supabase'
import { updatePurchase } from '@/lib/api/purchases'
import { toast } from 'sonner'
import { Plus, Trash2, Eye, Loader2, ChevronUp, ArrowLeft } from 'lucide-react'
import { formatCurrency, UNITS, PAYMENT_MODES } from '@/lib/gst'
import DatePicker from '@/components/ui/DatePicker'
import SupplierDropdown from '@/components/ui/SupplierDropdown'
import { VILLAGES } from '@/lib/village-constants'
import { genId, calcEntryTotal } from '@/lib/transaction-utils'
import Link from 'next/link'

interface TransactionItem {
  material_name: string
  quantity: number
  unit: string
  rate: number
  amount: number
}

interface TransactionEntry {
  id: string
  supplier_name: string
  invoice_date: string
  village_name: string
  invoice_number: string
  payment_type: 'Purchase' | 'Payment'
  items: TransactionItem[]
  payment_mode: string
  payment_status: 'unpaid' | 'paid'
  amount_paid: number
}

export default function EditPurchasePage() {
  const params = useParams()
  const router = useRouter()
  const purchaseId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [entries, setEntries] = useState<TransactionEntry[]>([])
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)

  useEffect(() => {
    loadPurchase()
  }, [purchaseId])

  async function loadPurchase() {
    try {
      const { data: purchase, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('id', purchaseId)
        .single()

      if (error) throw error

      if (purchase) {
        const items = purchase.items || []
        const entry: TransactionEntry = {
          id: genId(),
          supplier_name: purchase.supplier_name || '',
          invoice_date: purchase.invoice_date || new Date().toISOString().split('T')[0],
          village_name: purchase.village_name || '',
          invoice_number: purchase.invoice_number || '',
          payment_type: purchase.payment_type || 'Purchase',
          items: Array.isArray(items) ? items : [items],
          payment_mode: purchase.payment_mode || '',
          payment_status: purchase.payment_status || 'unpaid',
          amount_paid: purchase.amount_paid || 0,
        }
        setEntries([entry])
      }
    } catch (error: any) {
      toast.error('Failed to load purchase: ' + error.message)
      router.push('/purchases')
    } finally {
      setLoading(false)
    }
  }

  function updateEntry(id: string, field: keyof TransactionEntry, value: any) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  function updateItem(entryId: string, itemIdx: number, field: keyof TransactionItem, value: any) {
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e
      const newItems = [...e.items]
      newItems[itemIdx] = { ...newItems[itemIdx], [field]: value }
      if (field === 'quantity' || field === 'rate') {
        newItems[itemIdx].amount = newItems[itemIdx].quantity * newItems[itemIdx].rate
      }
      return { ...e, items: newItems }
    }))
  }

  function addItem(entryId: string) {
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e
      return {
        ...e,
        items: [...e.items, { material_name: '', quantity: 0, unit: 'PCS', rate: 0, amount: 0 }]
      }
    }))
  }

  function removeItem(entryId: string, itemIdx: number) {
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e
      const newItems = e.items.filter((_, i) => i !== itemIdx)
      return { ...e, items: newItems.length > 0 ? newItems : [{ material_name: '', quantity: 0, unit: 'PCS', rate: 0, amount: 0 }] }
    }))
  }

  async function handleSave() {
    if (entries.length === 0) return

    setSaving(true)
    try {
      const entry = entries[0]
      const total = calcEntryTotal(entry)

      const updateData: any = {
        supplier_name: entry.supplier_name,
        invoice_date: entry.invoice_date,
        village_name: entry.village_name,
        invoice_number: entry.invoice_number,
        payment_type: entry.payment_type,
        items: entry.items,
        payment_mode: entry.payment_mode,
        payment_status: entry.payment_status,
        amount_paid: entry.payment_status === 'paid' ? total : 0,
      }

      await updatePurchase(purchaseId, updateData)

      toast.success('Purchase updated successfully!')

      // Note: Village stock is NOT updated during edits to prevent double-counting.
      // Stock adjustments should be made directly on the village page.
      router.push('/purchases')
    } catch (error: any) {
      toast.error('Failed to update purchase: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/purchases" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Purchase</h1>
            <p className="text-sm text-gray-500 mt-1">Update transaction details below</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Spreadsheet Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200">
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 w-10">#</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 min-w-[160px]">Supplier</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 w-32">Date</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 w-36">Village</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 w-28">Inv No.</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 w-24">Type</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 min-w-[140px]">Material</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 w-20">Qty</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 w-20">Unit</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 w-24">Rate</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 w-28">Amount</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 w-28">Pay Mode</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, entryIdx) => {
                const total = calcEntryTotal(entry)
                const isPayment = entry.payment_type === 'Payment'
                const isExpanded = expandedEntry === entry.id

                return (
                  <React.Fragment key={entry.id}>
                    {/* Main Row */}
                    <tr className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${isExpanded ? 'bg-blue-50/50' : ''}`}>
                      <td className="px-3 py-2 text-gray-500 font-medium">{entryIdx + 1}</td>
                      <td className="px-3 py-2">
                        <SupplierDropdown
                          value={entry.supplier_name}
                          onChange={(val) => updateEntry(entry.id, 'supplier_name', val)}
                          placeholder="Search supplier..."
                        />
                      </td>
                      <td className="px-3 py-2">
                        <DatePicker
                          value={entry.invoice_date}
                          onChange={(val) => updateEntry(entry.id, 'invoice_date', val)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={entry.village_name}
                          onChange={(e) => updateEntry(entry.id, 'village_name', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                          <option value="">Select...</option>
                          {VILLAGES.map(v => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={entry.invoice_number}
                          onChange={(e) => updateEntry(entry.id, 'invoice_number', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="INV-001"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => updateEntry(entry.id, 'payment_type', isPayment ? 'Purchase' : 'Payment')}
                          className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                            isPayment
                              ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          {entry.payment_type}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        {isPayment ? (
                          <span className="text-gray-400 italic">—</span>
                        ) : (
                          <input
                            type="text"
                            value={entry.items[0]?.material_name || ''}
                            onChange={(e) => updateItem(entry.id, 0, 'material_name', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g. Sand, Cement"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isPayment ? (
                          <span className="text-gray-400 italic">—</span>
                        ) : (
                          <input
                            type="number"
                            value={entry.items[0]?.quantity || ''}
                            onChange={(e) => updateItem(entry.id, 0, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0"
                            min="0"
                            step="0.01"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isPayment ? (
                          <span className="text-gray-400 italic">—</span>
                        ) : (
                          <select
                            value={entry.items[0]?.unit || 'PCS'}
                            onChange={(e) => updateItem(entry.id, 0, 'unit', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          >
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isPayment ? (
                          <span className="text-gray-400 italic">—</span>
                        ) : (
                          <input
                            type="number"
                            value={entry.items[0]?.rate || ''}
                            onChange={(e) => updateItem(entry.id, 0, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0"
                            min="0"
                            step="0.01"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900 bg-gray-50">
                        {isPayment ? (
                          <input
                            type="number"
                            value={entry.amount_paid || ''}
                            onChange={(e) => updateEntry(entry.id, 'amount_paid', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm text-right font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0"
                            min="0"
                            step="0.01"
                          />
                        ) : (
                          formatCurrency(total)
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <select
                          value={entry.payment_mode}
                          onChange={(e) => updateEntry(entry.id, 'payment_mode', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                          <option value="">Mode</option>
                          {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                          className="p-1.5 hover:bg-blue-100 rounded-md text-blue-600 transition-colors"
                          title="View details"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {isExpanded && (
                      <tr className="bg-slate-50 border-b border-gray-200">
                        <td colSpan={13} className="px-4 py-4">
                          <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-gray-700">Line Items</h4>
                              <button
                                onClick={() => addItem(entry.id)}
                                className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-xs font-medium hover:bg-blue-600 flex items-center gap-1"
                              >
                                <Plus className="h-3 w-3" /> Add Item
                              </button>
                            </div>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="px-2 py-2 text-left text-gray-600">Material</th>
                                  <th className="px-2 py-2 text-right text-gray-600">Qty</th>
                                  <th className="px-2 py-2 text-left text-gray-600">Unit</th>
                                  <th className="px-2 py-2 text-right text-gray-600">Rate</th>
                                  <th className="px-2 py-2 text-right text-gray-600">Amount</th>
                                  <th className="px-2 py-2 text-center text-gray-600 w-10"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {entry.items.map((item, idx) => (
                                  <tr key={idx} className="border-b border-gray-100">
                                    <td className="px-2 py-1.5">
                                      <input
                                        type="text"
                                        value={item.material_name}
                                        onChange={(e) => updateItem(entry.id, idx, 'material_name', e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                        placeholder="Material name"
                                      />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <input
                                        type="number"
                                        value={item.quantity || ''}
                                        onChange={(e) => updateItem(entry.id, idx, 'quantity', parseFloat(e.target.value) || 0)}
                                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right focus:ring-1 focus:ring-blue-500"
                                        min="0"
                                        step="0.01"
                                      />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <select
                                        value={item.unit}
                                        onChange={(e) => updateItem(entry.id, idx, 'unit', e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500 bg-white"
                                      >
                                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                      </select>
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <input
                                        type="number"
                                        value={item.rate || ''}
                                        onChange={(e) => updateItem(entry.id, idx, 'rate', parseFloat(e.target.value) || 0)}
                                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right focus:ring-1 focus:ring-blue-500"
                                        min="0"
                                        step="0.01"
                                      />
                                    </td>
                                    <td className="px-2 py-1.5 text-right font-medium text-gray-900">
                                      {formatCurrency(item.amount)}
                                    </td>
                                    <td className="px-2 py-1.5 text-center">
                                      <button
                                        onClick={() => removeItem(entry.id, idx)}
                                        className="p-1 hover:bg-red-100 rounded text-red-500"
                                        title="Remove item"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="font-semibold text-gray-900 border-t-2 border-gray-300">
                                  <td colSpan={4} className="px-2 py-2 text-right">Total:</td>
                                  <td className="px-2 py-2 text-right">{formatCurrency(total)}</td>
                                  <td></td>
                                </tr>
                              </tfoot>
                            </table>
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

        {/* Grand Total Footer */}
        {entries.length > 0 && (
          <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-gray-200 flex justify-end">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600">Grand Total:</span>
              <span className="text-xl font-bold text-blue-600">
                {formatCurrency(entries.reduce((sum, e) => sum + calcEntryTotal(e), 0))}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
