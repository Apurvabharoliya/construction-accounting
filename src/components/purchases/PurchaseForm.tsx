'use client'

import { useState, useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

import { formatCurrency, UNITS, PAYMENT_MODES } from '@/lib/gst'
import { Plus, Trash2 } from 'lucide-react'

const itemSchema = z.object({
  material_name: z.string().min(1, 'Required'),
  hsn_code: z.string().optional().or(z.literal('')),
  quantity: z.number().min(0.001, 'Qty must be > 0'),
  unit: z.string().min(1, 'Required'),
  rate: z.number().min(0, 'Rate must be >= 0'),
  gst_rate: z.number().min(0, 'GST rate required')
})

const formSchema = z.object({
  supplier_id: z.string().min(1, 'Select a supplier'),
  invoice_date: z.string().min(1, 'Date required'),
  supplier_invoice_number: z.string().optional().or(z.literal('')),
  payment_mode: z.string().optional().or(z.literal('')),
  payment_status: z.enum(['paid', 'partial', 'unpaid']),
  amount_paid: z.number().min(0),
  remarks: z.string().optional().or(z.literal('')),
  items: z.array(itemSchema).min(1, 'Add at least one item')
})

type FormData = z.infer<typeof formSchema>

interface PurchaseFormProps {
  onSubmit: (data: FormData) => Promise<void>
  isLoading?: boolean
  initialData?: {
    supplier_id: string
    invoice_date: string
    supplier_invoice_number?: string
    payment_mode?: string
    payment_status: 'paid' | 'partial' | 'unpaid'
    amount_paid: number
    remarks?: string
    items?: Array<{
      material_name: string
      hsn_code?: string
      quantity: number
      unit: string
      rate: number
      gst_rate: number
    }>
  }
}

export default function PurchaseForm({ onSubmit, isLoading, initialData }: PurchaseFormProps) {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [calculations, setCalculations] = useState({ subtotal: 0, totalGst: 0, total: 0 })

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplier_id: initialData?.supplier_id || '',
      invoice_date: initialData?.invoice_date || new Date().toISOString().split('T')[0],
      supplier_invoice_number: initialData?.supplier_invoice_number || '',
      payment_mode: initialData?.payment_mode || '',
      payment_status: initialData?.payment_status || 'unpaid',
      amount_paid: initialData?.amount_paid || 0,
      remarks: initialData?.remarks || '',
      items: initialData?.items?.length ? initialData.items.map(i => ({
        material_name: i.material_name,
        hsn_code: i.hsn_code || '',
        quantity: i.quantity,
        unit: i.unit,
        rate: i.rate,
        gst_rate: i.gst_rate
      })) : [{ material_name: '', hsn_code: '', quantity: 0, unit: 'Nos', rate: 0, gst_rate: 18 }]
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchItems = watch('items')
  const watchPaymentStatus = watch('payment_status')
  const watchAmountPaid = watch('amount_paid')

  useEffect(() => {
    supabase.from('parties').select('id, name, phone').eq('party_type', 'supplier').order('name').then(({ data }) => setSuppliers(data || []))
  }, [])

  // Calculate totals on every render from watched items (robust approach)
  const calc = (watchItems || []).reduce((acc, item) => {
    const qty = Number(item?.quantity) || 0
    const rt = Number(item?.rate) || 0
    const gstRate = Number(item?.gst_rate) || 0
    const amt = qty * rt
    const gst = amt * gstRate / 100
    return { subtotal: acc.subtotal + amt, totalGst: acc.totalGst + gst, total: acc.total + amt + gst }
  }, { subtotal: 0, totalGst: 0, total: 0 })

  // Only update state when values differ (avoids infinite loop)
  useEffect(() => {
    setCalculations(calc)
  }, [calc.subtotal, calc.totalGst, calc.total])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Details */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Vendor Purchase Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
            <select {...register('supplier_id')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Select supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {errors.supplier_id && <p className="text-red-500 text-sm mt-1">{errors.supplier_id.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date *</label>
            <input type="date" {...register('invoice_date')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            {errors.invoice_date && <p className="text-red-500 text-sm mt-1">{errors.invoice_date.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Invoice No.</label>
            <input type="text" {...register('supplier_invoice_number')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter supplier's invoice number" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
            <select {...register('payment_mode')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Select</option>
              {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Items</h3>
          <button type="button" onClick={() => append({ material_name: '', hsn_code: '', quantity: 0, unit: 'Nos', rate: 0, gst_rate: 18 })} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-500 text-sm border-b">
                <th className="pb-3 font-medium">Material</th>
                <th className="pb-3 font-medium">HSN</th>
                <th className="pb-3 font-medium">Qty</th>
                <th className="pb-3 font-medium">Unit</th>
                <th className="pb-3 font-medium">Rate (₹)</th>
                <th className="pb-3 font-medium">GST %</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const item = watchItems?.[index]
                const amount = (item?.quantity || 0) * (item?.rate || 0)
                const gstAmount = amount * (item?.gst_rate || 0) / 100
                return (
                  <tr key={field.id} className="border-b">
                    <td className="py-2 pr-2"><input {...register(`items.${index}.material_name`)} className="w-28 px-2 py-1 border rounded text-sm" placeholder="Material" /></td>
                    <td className="py-2 pr-2"><input {...register(`items.${index}.hsn_code`)} className="w-16 px-2 py-1 border rounded text-sm" placeholder="HSN" /></td>
                    <td className="py-2 pr-2"><input type="number" step="0.001" {...register(`items.${index}.quantity`, { valueAsNumber: true })} className="w-16 px-2 py-1 border rounded text-sm" /></td>
                    <td className="py-2 pr-2">
                      <select {...register(`items.${index}.unit`)} className="w-16 px-2 py-1 border rounded text-sm">
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-2"><input type="number" step="0.01" {...register(`items.${index}.rate`, { valueAsNumber: true })} className="w-20 px-2 py-1 border rounded text-sm" /></td>
                    <td className="py-2 pr-2">
                      <select {...register(`items.${index}.gst_rate`, { valueAsNumber: true })} className="w-16 px-2 py-1 border rounded text-sm">
                        {[0, 3, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </td>
                    <td className="py-2 text-sm font-medium">{formatCurrency(amount + gstAmount)}</td>
                    <td className="py-2">
                      {fields.length > 1 && <button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {errors.items && <p className="text-red-500 text-sm mt-2">{errors.items.message || 'Add at least one item'}</p>}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-medium">{formatCurrency(calculations.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Total GST</span><span className="font-medium">{formatCurrency(calculations.totalGst)}</span></div>
            <div className="flex justify-between border-t pt-3"><span className="text-lg font-semibold">Total</span><span className="text-lg font-semibold">{formatCurrency(calculations.total)}</span></div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status *</label>
              <select {...register('payment_status')} className="w-full px-4 py-2 border rounded-lg">
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            {(watchPaymentStatus === 'partial' || watchPaymentStatus === 'paid') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (₹)</label>
                <input type="number" step="0.01" {...register('amount_paid', { valueAsNumber: true })} className="w-full px-4 py-2 border rounded-lg" />
              </div>
            )}
            {(watchPaymentStatus === 'partial' || watchPaymentStatus === 'unpaid') && (
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="flex justify-between"><span className="text-gray-600">Balance Due</span><span className="font-bold text-orange-600">{formatCurrency(calculations.total - (watchAmountPaid || 0))}</span></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Description</h3>
        <textarea {...register('remarks')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Enter purchase description..." />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <button type="button" onClick={() => window.history.back()} className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
        <button type="submit" disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
          {isLoading ? 'Saving...' : 'Create Vendor Purchase'}
        </button>
      </div>
    </form>
  )
}
