'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import React from 'react'
import { supabase } from '@/lib/supabase'
import { updateSale } from '@/lib/api/sales'
import { toast } from 'sonner'
import { Plus, Trash2, Eye, Loader2, ChevronUp, ArrowLeft } from 'lucide-react'
import { formatCurrency, UNITS, PAYMENT_MODES } from '@/lib/gst'
import DatePicker from '@/components/ui/DatePicker'
import BeneficiaryDropdown from '@/components/ui/BeneficiaryDropdown'
import { genId, calcEntryTotal } from '@/lib/transaction-utils'
import Link from 'next/link'

interface SaleItem {
  item_name: string
  quantity: number
  unit: string
  rate: number
  amount: number
}

interface SaleEntry {
  id: string
  client_id: string
  client_name: string
  invoice_date: string
  payment_mode: string
  payment_status: 'unpaid' | 'paid'
  amount_received: number
  items: SaleItem[]
}

export default function EditSalePage() {
  const params = useParams()
  const router = useRouter()
  const saleId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [entries, setEntries] = useState<SaleEntry[]>([])
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)

  useEffect(() => {
    loadSale()
  }, [saleId])

  async function loadSale() {
    try {
      const { data: sale, error } = await supabase
        .from('sales')
        .select('*')
        .eq('id', saleId)
        .single()

      if (error) throw error

      if (sale) {
        const items = sale.items || []
        // Fetch client name from parties table
        let clientName = ''
        if (sale.client_id) {
          const { data: party } = await supabase
            .from('parties')
            .select('name')
            .eq('id', sale.client_id)
            .single()
          clientName = party?.name || ''
        }
        const entry: SaleEntry = {
          id: genId(),
          client_id: sale.client_id || '',
          client_name: clientName,
          invoice_date: sale.invoice_date || new Date().toISOString().split('T')[0],
          payment_mode: sale.payment_mode || '',
          payment_status: sale.payment_status || 'unpaid',
          amount_received: sale.amount_received || 0,
          items: Array.isArray(items) ? items : [items],
        }
        setEntries([entry])
      }
    } catch (error: any) {
      toast.error('Failed to load sale: ' + error.message)
      router.push('/sales')
    } finally {
      setLoading(false)
    }
  }

  function updateEntry(id: string, field: keyof SaleEntry, value: any) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  function updateItem(entryId: string, itemIdx: number, field: keyof SaleItem, value: any) {
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
        items: [...e.items, { item_name: '', quantity: 0, unit: 'PCS', rate: 0, amount: 0 }]
      }
    }))
  }

  function removeItem(entryId: string, itemIdx: number) {
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e
      const newItems = e.items.filter((_, i) => i !== itemIdx)
      return { ...e, items: newItems.length > 0 ? newItems : [{ item_name: '', quantity: 0, unit: 'PCS', rate: 0, amount: 0 }] }
    }))
  }

  async function handleSave() {
    if (entries.length === 0) return

    setSaving(true)
    try {
      const entry = entries[0]
      const total = calcEntryTotal(entry)

      await updateSale(saleId, {
        client_id: entry.client_id,
        invoice_date: entry.invoice_date,
        payment_mode: entry.payment_mode,
        payment_status: entry.payment_status,
        total_amount: total,
        subtotal: total,
        amount_received: entry.payment_status === 'paid' ? total : 0,
      })

      // Delete and recreate items
      await supabase.from('sale_items').delete().eq('sale_id', saleId)
      if (entry.items.length > 0) {
        const itemsToInsert = entry.items.map(item => ({
          sale_id: saleId,
          item_name: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount,
          gst_rate: 0,
          gst_amount: 0,
        }))
        await supabase.from('sale_items').insert(itemsToInsert)
      }

      toast.success('Sale updated successfully!')
      router.push('/sales')
    } catch (error: any) {
      toast.error('Failed to update sale: ' + error.message)
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
    <div className="max-w-[1200px] mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/sales" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Sale</h1>
            <p className="text-sm text-gray-500 mt-1">Update sale details below</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
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
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 min-w-[180px]">Beneficiary</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 w-32">Date</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 min-w-[140px]">Item</th>
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
                const isExpanded = expandedEntry === entry.id

                return (
                  <React.Fragment key={entry.id}>
                    {/* Main Row */}
                    <tr className={`border-b border-gray-100 hover:bg-green-50/30 transition-colors ${isExpanded ? 'bg-green-50/50' : ''}`}>
                      <td className="px-3 py-2 text-gray-500 font-medium">{entryIdx + 1}</td>
                      <td className="px-3 py-2">
                        <BeneficiaryDropdown
                          value={entry.client_name}
                          onChange={(val: string, id?: string) => {
                            setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, client_name: val, client_id: id || e.client_id } : e))
                          }}
                          placeholder="Search beneficiary..."
                        />
                      </td>
                      <td className="px-3 py-2">
                        <DatePicker
                          value={entry.invoice_date}
                          onChange={(val) => updateEntry(entry.id, 'invoice_date', val)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={entry.items[0]?.item_name || ''}
                          onChange={(e) => updateItem(entry.id, 0, 'item_name', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="e.g. Bricks, Sand"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={entry.items[0]?.quantity || ''}
                          onChange={(e) => updateItem(entry.id, 0, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm text-right focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={entry.items[0]?.unit || 'PCS'}
                          onChange={(e) => updateItem(entry.id, 0, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                        >
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={entry.items[0]?.rate || ''}
                          onChange={(e) => updateItem(entry.id, 0, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm text-right focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900 bg-gray-50">
                        {formatCurrency(total)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <select
                          value={entry.payment_mode}
                          onChange={(e) => updateEntry(entry.id, 'payment_mode', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs font-medium focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                        >
                          <option value="">Mode</option>
                          {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                          className="p-1.5 hover:bg-green-100 rounded-md text-green-600 transition-colors"
                          title="View details"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {isExpanded && (
                      <tr className="bg-slate-50 border-b border-gray-200">
                        <td colSpan={10} className="px-4 py-4">
                          <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-gray-700">Line Items</h4>
                              <button
                                onClick={() => addItem(entry.id)}
                                className="px-3 py-1.5 bg-green-500 text-white rounded-md text-xs font-medium hover:bg-green-600 flex items-center gap-1"
                              >
                                <Plus className="h-3 w-3" /> Add Item
                              </button>
                            </div>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="px-2 py-2 text-left text-gray-600">Item Name</th>
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
                                        value={item.item_name}
                                        onChange={(e) => updateItem(entry.id, idx, 'item_name', e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-green-500"
                                        placeholder="Item name"
                                      />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <input
                                        type="number"
                                        value={item.quantity || ''}
                                        onChange={(e) => updateItem(entry.id, idx, 'quantity', parseFloat(e.target.value) || 0)}
                                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right focus:ring-1 focus:ring-green-500"
                                        min="0"
                                        step="0.01"
                                      />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <select
                                        value={item.unit}
                                        onChange={(e) => updateItem(entry.id, idx, 'unit', e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-green-500 bg-white"
                                      >
                                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                      </select>
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <input
                                        type="number"
                                        value={item.rate || ''}
                                        onChange={(e) => updateItem(entry.id, idx, 'rate', parseFloat(e.target.value) || 0)}
                                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right focus:ring-1 focus:ring-green-500"
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
              <span className="text-xl font-bold text-green-600">
                {formatCurrency(entries.reduce((sum, e) => sum + calcEntryTotal(e), 0))}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
