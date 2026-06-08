'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBeneficiary } from '@/lib/api/beneficiaries'
import { toast } from 'sonner'
import BeneficiaryForm from '@/components/beneficiaries/BeneficiaryForm'

export default function NewBeneficiaryPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(data: any) {
    setIsLoading(true)
    try {
      await createBeneficiary(
        {
          name: data.name,
          phone: data.phone || undefined,
          address: data.address || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          party_type: 'beneficiary',
          opening_balance: 0,
          gst_registered: false,
          notes: data.notes || undefined
        },
        {
          aadhaar_number: data.aadhaar_number || undefined,
          property_address: data.property_address || undefined,
          subsidy_scheme: data.subsidy_scheme || undefined,
          subsidy_amount_sanctioned: Number(data.subsidy_amount_sanctioned) || 0,
          subsidy_status: data.subsidy_status || 'pending',
          subsidy_disbursement_date: undefined,
          construction_progress: Number(data.construction_progress) || 0,
          total_amount_received: 0,
          total_amount_due: Number(data.subsidy_amount_sanctioned) || 0,
          payment_installments: Number(data.payment_installments) || 1,
          notes: data.notes || undefined
        }
      )
      toast.success('Beneficiary added successfully')
      router.push('/beneficiaries')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add beneficiary')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Beneficiary</h1>
        <p className="text-gray-500 text-sm mt-1">Register a new beneficiary for subsidy tracking</p>
      </div>
      <BeneficiaryForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
