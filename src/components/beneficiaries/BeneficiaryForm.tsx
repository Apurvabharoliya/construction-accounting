'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional().or(z.literal('')),
  aadhaar_number: z.string().length(12, 'Aadhaar must be 12 digits').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  property_address: z.string().optional().or(z.literal('')),
  subsidy_scheme: z.string().optional().or(z.literal('')),
  subsidy_amount_sanctioned: z.string().optional().or(z.literal('')),
  subsidy_status: z.enum(['pending', 'approved', 'disbursed', 'received']),
  construction_progress: z.string().optional().or(z.literal('')),
  payment_installments: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal(''))
})

export type BeneficiaryFormData = z.infer<typeof formSchema>

interface BeneficiaryFormProps {
  onSubmit: (data: BeneficiaryFormData) => Promise<void>
  isLoading?: boolean
}

export default function BeneficiaryForm({ onSubmit, isLoading }: BeneficiaryFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<BeneficiaryFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subsidy_status: 'pending',
      construction_progress: '0',
      payment_installments: '1',
      subsidy_amount_sanctioned: '0'
    }
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary Name *</label>
            <input type="text" {...register('name')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter name" />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input type="tel" {...register('phone')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter phone" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number</label>
            <input type="text" {...register('aadhaar_number')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="12-digit Aadhaar" maxLength={12} />
            {errors.aadhaar_number && <p className="text-red-500 text-sm mt-1">{errors.aadhaar_number.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subsidy Scheme</label>
            <input type="text" {...register('subsidy_scheme')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g., PMAY" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Address Details</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary Address</label>
            <textarea {...register('address')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" rows={2} placeholder="Enter address" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property/Construction Address</label>
            <textarea {...register('property_address')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" rows={2} placeholder="Construction site address" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input type="text" {...register('city')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input type="text" {...register('state')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Subsidy & Construction Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subsidy Amount Sanctioned (₹)</label>
            <input type="text" {...register('subsidy_amount_sanctioned')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subsidy Status</label>
            <select {...register('subsidy_status')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="disbursed">Disbursed</option>
              <option value="received">Received</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Construction Progress (%)</label>
            <input type="text" {...register('construction_progress')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Installments</label>
            <input type="text" {...register('payment_installments')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="1" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Notes</h3>
        <textarea {...register('notes')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Any additional notes..." />
      </div>

      <div className="flex justify-end gap-4">
        <button type="button" onClick={() => window.history.back()} className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {isLoading ? 'Saving...' : 'Add Beneficiary'}
        </button>
      </div>
    </form>
  )
}
