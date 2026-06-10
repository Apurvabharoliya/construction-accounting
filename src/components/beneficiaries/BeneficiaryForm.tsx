'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  aadhaar_number: z.string().length(12, 'Aadhaar must be 12 digits'),
  outstanding_amount: z.number().min(400000, 'Minimum outstanding amount is ₹4,00,000 (4 Lakhs)')
})

export type BeneficiaryFormData = z.infer<typeof formSchema>

interface BeneficiaryFormProps {
  initialData?: {
    name?: string
    aadhaar_number?: string | null
    outstanding_amount?: number
  }
  onSubmit: (data: BeneficiaryFormData) => Promise<void>
  isLoading?: boolean
}

export default function BeneficiaryForm({ initialData, onSubmit, isLoading }: BeneficiaryFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<BeneficiaryFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      aadhaar_number: initialData?.aadhaar_number || '',
      outstanding_amount: initialData?.outstanding_amount || 400000
    }
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Beneficiary Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary Name *</label>
            <input type="text" {...register('name')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter full name" />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number *</label>
            <input type="text" {...register('aadhaar_number')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="12-digit Aadhaar number" maxLength={12} />
            {errors.aadhaar_number && <p className="text-red-500 text-sm mt-1">{errors.aadhaar_number.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Outstanding Amount (₹) *</label>
            <input type="number" step="1000" {...register('outstanding_amount', { valueAsNumber: true })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Minimum ₹4,00,000" />
            {errors.outstanding_amount && <p className="text-red-500 text-sm mt-1">{errors.outstanding_amount.message}</p>}
            <p className="text-gray-400 text-xs mt-1">Minimum outstanding: ₹4,00,000 (4 Lakhs)</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button type="button" onClick={() => window.history.back()} className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {isLoading ? 'Saving...' : initialData ? 'Update Beneficiary' : 'Add Beneficiary'}
        </button>
      </div>
    </form>
  )
}
