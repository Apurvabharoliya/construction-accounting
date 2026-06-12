'use client'

import { useState, useEffect } from 'react'
import { useFieldArray, useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

import { formatCurrency, UNITS, PAYMENT_MODES } from '@/lib/gst'
import DatePicker from '@/components/ui/DatePicker'
import { Plus, Trash2 } from 'lucide-react'

const itemSchema = z.object({
  material_name: z.string().min(1, 'Required'),
  hsn_code: z.string().optional().or(z.literal('')),
  quantity: z.number().min(0, 'Qty cannot be negative'),
  unit: z.string().min(1, 'Required'),
  rate: z.number().min(0, 'Rate must be >= 0'),
  amount: z.number().min(0, 'Amount must be >= 0'),
  gst_rate: z.number().min(0, 'GST rate required')
})

const formSchema = z.object({
  supplier_name: z.string().min(1, 'Enter supplier name'),
  invoice_date: z.string().min(1, 'Date required'),
  supplier_invoice_number: z.string().optional().or(z.literal('')),
  payment_mode: z.string().optional().or(z.literal('')),
  payment_status: z.enum(['paid', 'unpaid']),
  amount_paid: z.number().min(0),
  remarks: z.string().optional().or(z.literal('')),
  items: z.array(itemSchema).min(1, 'Add at least one item')
})

type FormData = z.infer<typeof formSchema>

interface PurchaseFormProps {
  onSubmit: (data: FormData) => Promise<void>
  isLoading?: boolean
  isEditing?: boolean
  initialData?: {
    supplier_name: string
    invoice_date: string
    supplier_invoice_number?: string
    payment_mode?: string
    payment_status: 'paid' | 'unpaid'
    amount_paid: number
    remarks?: string
    items?: Array<{
      material_name: string
      hsn_code?: string
      quantity: number
      unit: string
      rate: number
      amount: number
      gst_rate: number
    }>
  }
}

export default function PurchaseForm({ onSubmit, isLoading, isEditing, initialData }: PurchaseFormProps) {
  const [calculations, setCalculations] = useState({ subtotal: 0, totalGst: 0, total: 0 })

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplier_name: initialData?.supplier_name || '',
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
        amount: i.amount || 0,
        gst_rate: i.gst_rate
      })) : [{ material_name: '', hsn_code: '', quantity: 0, unit: 'Nos', rate: 0, amount: 0, gst_rate: 18 }]
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchItems = watch('items')
  const watchPaymentStatus = watch('payment_status')
  const watchAmountPaid = watch('amount_paid')



  // Calculate totals on every render from watched items (robust approach)
  const calc = (watchItems || []).reduce((acc, item) => {
    const qty = Number(item?.quantity) || 0
    const rt = Number(item?.rate) || 0
    const directAmt = Number(item?.amount) || 0
    const gstRate = Number(item?.gst_rate) || 0
    // Use direct amount if provided, otherwise calculate from qty × rate
    const amt = directAmt > 0 ? directAmt : (qty * rt)
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
        <h3 className="text-lg font-semibold mb-4">Purchase Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
            <input type="text" {...register('supplier_name')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter supplier name" />
            {errors.supplier_name && <p className="text-red-500 text-sm mt-1">{errors.supplier_name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date *</label>
            <Controller
              name="invoice_date"
              control={control}
              render={({ field }) => (
                <DatePicker value={field.value} onChange={field.onChange} />
              )}
            />
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
          <button type="button" onClick={() => append({ material_name: '', hsn_code: '', quantity: 0, unit: 'Nos', rate: 0, amount: 0, gst_rate: 18 })} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>

        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full px-4 md:px-0">
            <table className="w-full min-w-[500px] md:min-w-0">
              <thead>
                <tr className="text-left text-gray-500 text-xs md:text-sm border-b">
                  <th className="pb-2 md:pb-3 pr-1 md:pr-2 font-medium whitespace-nowrap">Material</th>
                  <th className="pb-2 md:pb-3 pr-1 md:pr-2 font-medium whitespace-nowrap hidden sm:table-cell">HSN</th>
                  <th className="pb-2 md:pb-3 pr-1 md:pr-2 font-medium whitespace-nowrap">Qty</th>
                  <th className="pb-2 md:pb-3 pr-1 md:pr-2 font-medium whitespace-nowrap hidden sm:table-cell">Unit</th>
                  <th className="pb-2 md:pb-3 pr-1 md:pr-2 font-medium whitespace-nowrap">Rate (₹)</th>
                  <th className="pb-2 md:pb-3 pr-1 md:pr-2 font-medium whitespace-nowrap">Amount (₹)</th>
                  <th className="pb-2 md:pb-3 pr-1 md:pr-2 font-medium whitespace-nowrap">GST %</th>
                  <th className="pb-2 md:pb-3 pr-1 md:pr-2 font-medium whitespace-nowrap hidden md:table-cell">Total</th>
                  <th className="pb-2 md:pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const item = watchItems?.[index]
                  const directAmt = Number(item?.amount) || 0
                  const amount = directAmt > 0 ? directAmt : ((item?.quantity || 0) * (item?.rate || 0))
                  const gstAmount = amount * (item?.gst_rate || 0) / 100
                  return (
                    <tr key={field.id} className="border-b">
                      <td className="py-1.5 md:py-2 pr-1 md:pr-2"><input {...register(`items.${index}.material_name`)} className="w-20 md:w-28 px-1.5 md:px-2 py-1 border rounded text-xs md:text-sm" placeholder="Matrl" /></td>
                      <td className="py-1.5 md:py-2 pr-1 md:pr-2 hidden sm:table-cell"><input {...register(`items.${index}.hsn_code`)} className="w-14 md:w-16 px-1.5 md:px-2 py-1 border rounded text-xs md:text-sm" placeholder="HSN" /></td>
                      <td className="py-1.5 md:py-2 pr-1 md:pr-2"><input type="number" step="0.001" {...register(`items.${index}.quantity`, { valueAsNumber: true })} className="w-14 md:w-16 px-1.5 md:px-2 py-1 border rounded text-xs md:text-sm" placeholder="0" /></td>
                      <td className="py-1.5 md:py-2 pr-1 md:pr-2 hidden sm:table-cell">
                        <select {...register(`items.${index}.unit`)} className="w-14 md:w-16 px-1.5 md:px-2 py-1 border rounded text-xs md:text-sm">
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      <td className="py-1.5 md:py-2 pr-1 md:pr-2"><input type="number" step="0.01" {...register(`items.${index}.rate`, { valueAsNumber: true })} className="w-16 md:w-20 px-1.5 md:px-2 py-1 border rounded text-xs md:text-sm" placeholder="0" /></td>
                      <td className="py-1.5 md:py-2 pr-1 md:pr-2"><input type="number" step="0.01" {...register(`items.${index}.amount`, { valueAsNumber: true })} className="w-16 md:w-20 px-1.5 md:px-2 py-1 border rounded text-xs md:text-sm" placeholder="Or enter" /></td>
                      <td className="py-1.5 md:py-2 pr-1 md:pr-2">
                        <select {...register(`items.${index}.gst_rate`, { valueAsNumber: true })} className="w-14 md:w-16 px-1.5 md:px-2 py-1 border rounded text-xs md:text-sm">
                          {[0, 3, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                        </select>
                      </td>
                      <td className="py-1.5 md:py-2 pr-1 md:pr-2 text-xs md:text-sm font-medium hidden md:table-cell">{formatCurrency(amount + gstAmount)}</td>
                      <td className="py-1.5 md:py-2">
                        {fields.length > 1 && <button type="button" onClick={() => remove(index)} className="p-1.5 md:p-0 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 md:bg-transparent transition-colors"><Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
                <option value="paid">Paid</option>
              </select>
            </div>
            {(watchPaymentStatus === 'paid') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (₹)</label>
                <input type="number" step="0.01" {...register('amount_paid', { valueAsNumber: true })} className="w-full px-4 py-2 border rounded-lg" />
              </div>
            )}
            {(watchPaymentStatus === 'unpaid') && (
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
          {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Purchase'}
        </button>
      </div>
    </form>
  )
}
