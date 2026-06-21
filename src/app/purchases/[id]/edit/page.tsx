'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import React from 'react'
import { supabase } from '@/lib/supabase'
import { updatePurchase } from '@/lib/api/purchases'
import { addMaterialReceipt } from '@/lib/api/villages'
import { toast } from 'sonner'
import { Plus, Trash2, Eye, Loader2, ChevronUp, ArrowLeft, Maximize2 } from 'lucide-react'
import { formatCurrency, UNITS, PAYMENT_MODES } from '@/lib/gst'
import type { Purchase } from '@/types/database'
import DatePicker from '@/components/ui/DatePicker'
import SupplierDropdown from '@/components/ui/SupplierDropdown'
import { VILLAGES } from '@/lib/village-constants'
import { genId, calcEntryTotal } from '@/lib/transaction-utils'
import Link from 'next/link'

interface TransactionItem {
  id: string
  material_name: string
  village_name: string
  quantity: number
  unit: string
  rate: number
  amount: number
}

interface TransactionEntry {
  id: string
  date: string
  supplier_name: string
  village_name: string
  payment_type: 'Purchase' | 'Payment'
  items: TransactionItem[]
  payment_mode: string
  payment_status: 'unpaid' | 'paid'
  amount_paid: number
  remarks: string
}

function emptyItem(): TransactionItem {
  return {
    id: genId(),
    material_name: '',
    village_name: '',
    quantity: 0,
    unit: 'Nos',
    rate: 0,
    amount: 0,
  }
}

export default function EditPurchasePage() {
  const params = useParams()
  const router = useRouter()
  const purchaseId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [entries, setEntries] = useState<TransactionEntry[]>([])
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [formSize, setFormSize] = useState<'normal' | 'large' | 'xl'>('large')

  const sizeClass = formSize === 'normal' ? 'max-w-full 2xl:max-w-[1200px]' : formSize === 'large' ? 'max-w-full 2xl:max-w-[1800px]' : 'max-w-full 2xl:max-w-[2200px]'

  useEffect(() => {
    loadPurchase()
  }, [purchaseId])

  async function loadPurchase() {
    try {
      const { data: purchase, error } = await supabase
        .from('purchases')
        .select('*, supplier:parties!supplier_id(name), items:purchase_items(*)')
        .eq('id', purchaseId)
        .single()

      if (error) throw error

      if (purchase) {
        const items = (purchase.items || []).map((item: any) => ({
          id: item.id || genId(),
          material_name: item.material_name || '',
          village_name: item.village_name || '',
          quantity: Number(item.quantity) || 0,
          unit: item.unit || 'Nos',
          rate: Number(item.rate) || 0,
          amount: Number(item.amount) || 0,
        }))

        const entry: TransactionEntry = {
          id: genId(),
          date: purchase.invoice_date || new Date().toISOString().split('T')[0],
          supplier_name: purchase.supplier?.name || '',
          village_name: purchase.village_name || '',
          payment_type: purchase.payment_status === 'paid' ? 'Payment' : 'Purchase',
          items: items.length > 0 ? items : [emptyItem()],
          payment_mode: purchase.payment_mode || '',
          payment_status: purchase.payment_status || 'unpaid',
          amount_paid: Number(purchase.amount_paid) || 0,
          remarks: purchase.remarks || '',
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

  function updateItem(entryId: string, itemId: string, field: keyof TransactionItem, value: any) {
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e
      const newItems = e.items.map(item => {
        if (item.id !== itemId) return item
        const updated = { ...item, [field]: value }
        // Auto-calculate amount when quantity or rate changes
        if (field === 'quantity' || field === 'rate') {
          const qty = field === 'quantity' ? Number(value) : item.quantity
          const rate = field === 'rate' ? Number(value) : item.rate
          updated.amount = qty * rate
        }
        return updated
      })
      return { ...e, items: newItems }
    }))
  }

  function addItem(entryId: string) {
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e
      return { ...e, items: [...e.items, emptyItem()] }
    }))
  }

  function removeItem(entryId: string, itemId: string) {
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e
      const newItems = e.items.filter(it => it.id !== itemId)
      return { ...e, items: newItems.length > 0 ? newItems : [emptyItem()] }
    }))
  }

  async function handleSave() {
    if (entries.length === 0) return

    setSaving(true)
    try {
      const entry = entries[0]
      const isPayment = entry.payment_type === 'Payment'

      // Resolve supplier
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
        const { data: created, error: ce } = await supabase
          .from('parties')
          .insert([{ name: entry.supplier_name.trim(), party_type: 'supplier' }])
          .select('id')
          .single()
        if (ce) throw ce
        supplierId = created.id
      }

      const validItems = entry.items.filter(it => it.material_name.trim())
      const itemsWithGst = validItems.map(item => ({
        id: genId(),
        material_name: item.material_name,
        hsn_code: undefined as string | undefined,
        village_name: item.village_name || undefined,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        amount: item.amount > 0 ? item.amount : (item.quantity * item.rate),
        gst_rate: 0,
        gst_amount: 0
      }))

      const totalAmount = isPayment
        ? (entry.amount_paid || 0)
        : itemsWithGst.reduce((sum, item) => sum + item.amount, 0)

      const updateData: Partial<Purchase> = {
        supplier_id: supplierId,
        invoice_date: entry.date,
        village_name: entry.village_name || undefined,
        subtotal: totalAmount,
        gst_rate: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        total_amount: totalAmount,
        payment_mode: entry.payment_mode || undefined,
        payment_status: isPayment ? 'paid' : 'unpaid',
        amount_paid: isPayment ? totalAmount : 0,
        balance_due: isPayment ? 0 : totalAmount,
        remarks: entry.remarks || undefined
      }

      await updatePurchase(purchaseId, updateData, itemsWithGst)

      // After updating the purchase, re-sync village stock for the new items
      // Use entry.village_name as fallback for items without their own village
      const fallbackVillage = entry.village_name || validItems.find(i => i.village_name)?.village_name || ''
      for (const item of validItems) {
        const targetVillage = item.village_name || fallbackVillage
        if (targetVillage && item.material_name.trim() && item.quantity > 0) {
          try {
            const { data: p } = await supabase
              .from('purchases')
              .select('purchase_number')
              .eq('id', purchaseId)
              .single()
            await addMaterialReceipt({
              village_name: targetVillage,
              material_name: item.material_name,
              quantity: item.quantity,
              contractor_name: entry.supplier_name,
              reference_purchase_id: purchaseId,
              notes: `Purchase ${p?.purchase_number || ''}`,
              transaction_date: entry.date
            })
          } catch (err) {
            console.error(`Failed to update village stock for ${item.material_name}:`, err)
          }
        }
      }

      toast.success('Purchase updated successfully!')
      router.push(`/purchases/${purchaseId}`)
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
    <div className={`${sizeClass} mx-auto px-6 lg:px-10 xl:px-14 py-6 space-y-6 transition-all duration-300`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <Link href="/purchases" className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Edit Purchase</h1>
            <p className="text-sm text-gray-500 mt-1">Update transaction details below</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Form Size Selector */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <Maximize2 className="w-4 h-4 text-gray-400" />
            <select
              value={formSize}
              onChange={(e) => setFormSize(e.target.value as 'normal' | 'large' | 'xl')}
              className="bg-transparent text-xs font-medium text-gray-600 focus:outline-none cursor-pointer"
            >
              <option value="normal">Normal</option>
              <option value="large">Wide</option>
              <option value="xl">Extra Wide</option>
            </select>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>        {/* Spreadsheet Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">#</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[220px]">Supplier</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">Date</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">Village</th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Type</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">Material</th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Qty</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Unit</th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Rate</th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Amount</th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Pay Mode</th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">Actions</th>
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
                    <tr className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50/50' : ''}`}>
                      <td className="px-4 py-3 text-gray-500 font-medium w-10">{entryIdx + 1}</td>
                      <td className="px-4 py-3">
                        <SupplierDropdown
                          value={entry.supplier_name}
                          onChange={(val) => updateEntry(entry.id, 'supplier_name', val)}
                          placeholder="Search supplier..."
                        />
                      </td>
                      <td className="px-4 py-3">
                        <DatePicker
                          value={entry.date}
                          onChange={(val) => updateEntry(entry.id, 'date', val)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={entry.village_name}
                          onChange={(e) => updateEntry(entry.id, 'village_name', e.target.value)}
                          className="w-full px-3 py-3 border-0 bg-transparent text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select...</option>
                          {VILLAGES.map(v => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => updateEntry(entry.id, 'payment_type', isPayment ? 'Purchase' : 'Payment')}
                          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm ${
                            isPayment
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          {entry.payment_type}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {isPayment ? (
                          <span className="inline-flex items-center justify-center min-h-[44px] w-full text-sm text-gray-300 italic px-4">—</span>
                        ) : (
                          <input
                            type="text"
                            value={entry.items[0]?.material_name || ''}
                            onChange={(e) => updateItem(entry.id, entry.items[0]?.id, 'material_name', e.target.value)}
                            className="w-full px-4 py-3.5 border-0 bg-transparent text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g. Sand, Cement"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isPayment ? (
                          <span className="inline-flex items-center justify-center min-h-[44px] w-full text-sm text-gray-300 italic px-4">—</span>
                        ) : (
                          <input
                            type="number"
                            value={entry.items[0]?.quantity || ''}
                            onChange={(e) => updateItem(entry.id, entry.items[0]?.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-3.5 border-0 bg-transparent text-sm text-right focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                            min="0"
                            step="0.01"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isPayment ? (
                          <span className="inline-flex items-center justify-center min-h-[44px] w-full text-sm text-gray-300 italic px-4">—</span>
                        ) : (
                          <select
                            value={entry.items[0]?.unit || 'Nos'}
                            onChange={(e) => updateItem(entry.id, entry.items[0]?.id, 'unit', e.target.value)}
                            className="w-full px-3 py-3 border-0 bg-transparent text-sm focus:ring-2 focus:ring-blue-500"
                          >
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isPayment ? (
                          <span className="inline-flex items-center justify-center min-h-[44px] w-full text-sm text-gray-300 italic px-4">—</span>
                        ) : (
                          <input
                            type="number"
                            value={entry.items[0]?.rate || ''}
                            onChange={(e) => updateItem(entry.id, entry.items[0]?.id, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-3.5 border-0 bg-transparent text-sm text-right focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                            min="0"
                            step="0.01"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 bg-gray-50/50">
                        {isPayment ? (
                          <input
                            type="number"
                            value={entry.amount_paid || ''}
                            onChange={(e) => updateEntry(entry.id, 'amount_paid', parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-3.5 border-0 bg-transparent text-sm text-right font-semibold focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                            min="0"
                            step="0.01"
                          />
                        ) : (
                          <span className="inline-flex items-center justify-end min-h-[44px] text-base font-bold text-gray-900">{formatCurrency(total)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={entry.payment_mode}
                          onChange={(e) => updateEntry(entry.id, 'payment_mode', e.target.value)}
                          className="w-full px-3 py-3 border-0 bg-transparent text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Mode</option>
                          {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                          className="p-2.5 hover:bg-blue-100 rounded-xl text-blue-600 transition-colors"
                          title="View details"
                        >
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}                      {isExpanded && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={12} className="px-8 py-6">
                          <div className="bg-white rounded-xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Line Items</h4>
                              {!isPayment && (
                                <button
                                  onClick={() => addItem(entry.id)}
                                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center gap-1.5 transition-colors shadow-sm"
                                >
                                  <Plus className="h-4 w-4" /> Add Item
                                </button>
                              )}
                            </div>
                            {!isPayment ? (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr>
                                    <th className="px-3 py-2.5 text-left text-gray-500 font-semibold">Village</th>
                                    <th className="px-3 py-2.5 text-left text-gray-500 font-semibold">Material</th>
                                    <th className="px-3 py-2.5 text-right text-gray-500 font-semibold">Qty</th>
                                    <th className="px-3 py-2.5 text-left text-gray-500 font-semibold">Unit</th>
                                    <th className="px-3 py-2.5 text-right text-gray-500 font-semibold">Rate</th>
                                    <th className="px-3 py-2.5 text-right text-gray-500 font-semibold">Amount</th>
                                    <th className="px-3 py-2.5 text-center text-gray-500 font-semibold w-10"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {entry.items.map((item, idx) => (
                                    <tr key={item.id}>
                                      <td className="px-3 py-2.5">
                                        <select
                                          value={item.village_name}
                                          onChange={(e) => updateItem(entry.id, item.id, 'village_name', e.target.value)}
                                          className="w-full px-3 py-2.5 border-0 bg-transparent text-sm focus:ring-1 focus:ring-blue-500"
                                        >
                                          <option value="">Village...</option>
                                          {VILLAGES.map(v => (
                                            <option key={v} value={v}>{v}</option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="px-3 py-2.5">
                                        <input
                                          type="text"
                                          value={item.material_name}
                                          onChange={(e) => updateItem(entry.id, item.id, 'material_name', e.target.value)}
                                          className="w-full px-3 py-2.5 border-0 bg-transparent text-sm focus:ring-1 focus:ring-blue-500"
                                          placeholder="Material name"
                                        />
                                      </td>
                                      <td className="px-3 py-2.5">
                                        <input
                                          type="number"
                                          value={item.quantity || ''}
                                          onChange={(e) => updateItem(entry.id, item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                          className="w-full px-3 py-2.5 border-0 bg-transparent text-sm text-right focus:ring-1 focus:ring-blue-500"
                                          min="0"
                                          step="0.01"
                                        />
                                      </td>
                                      <td className="px-3 py-2.5">
                                        <select
                                          value={item.unit}
                                          onChange={(e) => updateItem(entry.id, item.id, 'unit', e.target.value)}
                                          className="w-full px-3 py-2.5 border-0 bg-transparent text-sm focus:ring-1 focus:ring-blue-500"
                                        >
                                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                      </td>
                                      <td className="px-3 py-2.5">
                                        <input
                                          type="number"
                                          value={item.rate || ''}
                                          onChange={(e) => updateItem(entry.id, item.id, 'rate', parseFloat(e.target.value) || 0)}
                                          className="w-full px-3 py-2.5 border-0 bg-transparent text-sm text-right focus:ring-1 focus:ring-blue-500"
                                          min="0"
                                          step="0.01"
                                        />
                                      </td>
                                      <td className="px-3 py-2.5 text-right font-semibold text-gray-900">
                                        {formatCurrency(item.amount)}
                                      </td>
                                      <td className="px-3 py-2.5 text-center">
                                        <button
                                          onClick={() => removeItem(entry.id, item.id)}
                                          className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 transition-colors"
                                          title="Remove item"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="font-semibold text-gray-900">
                                    <td colSpan={5} className="px-3 py-2.5 text-right">Total:</td>
                                    <td className="px-3 py-2.5 text-right">{formatCurrency(total)}</td>
                                    <td></td>
                                  </tr>
                                </tfoot>
                              </table>
                            ) : (
                              <div className="bg-emerald-50/50 rounded-xl p-5">
                                <p className="text-base text-emerald-700">
                                  <span className="font-bold">Payment entry</span> — No items needed.
                                </p>
                                <p className="text-base text-emerald-600 mt-2">
                                  Amount: <span className="font-bold text-xl">{formatCurrency(entry.amount_paid || 0)}</span>
                                </p>
                              </div>
                            )}
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
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 flex justify-end">
            <div className="flex items-center gap-5">
              <span className="text-sm font-medium text-gray-600">Grand Total:</span>
              <span className="text-xl font-bold text-blue-600">
                {formatCurrency(entries.reduce((sum, e) => sum + calcEntryTotal(e), 0))}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Remarks */}
      {entries.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Remarks</label>
          <textarea
            value={entries[0].remarks}
            onChange={(e) => updateEntry(entries[0].id, 'remarks', e.target.value)}
            className="w-full px-4 py-3.5 border-0 bg-transparent text-sm focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            placeholder="Notes about this transaction..."
          />
        </div>
      )}
    </div>
  )
}
