'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PARTY_TYPES } from '@/lib/gst'

const partySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().optional().or(z.literal('')),
  gstin: z.string().optional().or(z.literal('')),
  pan: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  pin_code: z.string().optional().or(z.literal('')),
  party_type: z.enum(['supplier', 'client', 'beneficiary']),
  opening_balance: z.string().optional().or(z.literal('')),
  gst_registered: z.boolean(),
  bank_name: z.string().optional().or(z.literal('')),
  bank_account: z.string().optional().or(z.literal('')),
  ifsc_code: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal(''))
})

export type PartyFormData = z.infer<typeof partySchema>

interface PartyFormProps {
  initialData?: {
    name?: string
    phone?: string | null
    email?: string | null
    gstin?: string | null
    pan?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    pin_code?: string | null
    party_type?: string
    opening_balance?: number | null
    gst_registered?: boolean | null
    bank_name?: string | null
    bank_account?: string | null
    ifsc_code?: string | null
    notes?: string | null
  }
  onSubmit: (data: PartyFormData) => Promise<void>
  isLoading?: boolean
}

export default function PartyForm({ initialData, onSubmit, isLoading }: PartyFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<PartyFormData>({
    resolver: zodResolver(partySchema),
    defaultValues: {
      name: initialData?.name || '',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
      gstin: initialData?.gstin || '',
      pan: initialData?.pan || '',
      address: initialData?.address || '',
      city: initialData?.city || '',
      state: initialData?.state || '',
      pin_code: initialData?.pin_code || '',
      party_type: (initialData?.party_type as any) || 'supplier',
      opening_balance: String(initialData?.opening_balance || ''),
      gst_registered: initialData?.gst_registered || false,
      bank_name: initialData?.bank_name || '',
      bank_account: initialData?.bank_account || '',
      ifsc_code: initialData?.ifsc_code || '',
      notes: initialData?.notes || ''
    }
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name *</label>
            <input type="text" {...register('name')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter party name" />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Type *</label>
            <select {...register('party_type')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
              {PARTY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input type="text" {...register('phone')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter phone number" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="text" {...register('email')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter email" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance (₹)</label>
            <input type="text" {...register('opening_balance')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0" />
          </div>
          <div className="flex items-center mt-6">
            <input type="checkbox" {...register('gst_registered')} id="gst_registered" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
            <label htmlFor="gst_registered" className="ml-2 text-sm text-gray-700">GST Registered</label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">GST &amp; PAN Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
            <input type="text" {...register('gstin')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="22AAAAA0000A1Z5" maxLength={15} />
            {errors.gstin && <p className="text-red-500 text-sm mt-1">{errors.gstin.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
            <input type="text" {...register('pan')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="AAAAA0000A" maxLength={10} />
            {errors.pan && <p className="text-red-500 text-sm mt-1">{errors.pan.message}</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Address</h3>
        <div className="space-y-4">
          <textarea {...register('address')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Enter full address" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input type="text" {...register('city')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter city" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input type="text" {...register('state')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter state" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pin Code</label>
              <input type="text" {...register('pin_code')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter pin code" maxLength={6} />
              {errors.pin_code && <p className="text-red-500 text-sm mt-1">{errors.pin_code.message}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Bank Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
            <input type="text" {...register('bank_name')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter bank name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
            <input type="text" {...register('bank_account')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter account number" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
            <input type="text" {...register('ifsc_code')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter IFSC code" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Notes</h3>
        <textarea {...register('notes')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Any additional notes..." />
      </div>

      <div className="flex justify-end gap-4">
        <button type="button" onClick={() => window.history.back()} className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
        <button type="submit" disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
          {isLoading ? 'Saving...' : initialData ? 'Update Vendor' : 'Create Vendor'}
        </button>
      </div>
    </form>
  )
}
