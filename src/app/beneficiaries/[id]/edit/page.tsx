'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { updateBeneficiary } from '@/lib/api/beneficiaries'
import { toast } from 'sonner'
import BeneficiaryForm from '@/components/beneficiaries/BeneficiaryForm'

export default function EditBeneficiaryPage() {
  const params = useParams()
  const router = useRouter()
  const [beneficiary, setBeneficiary] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (params.id) fetchBeneficiary()
  }, [params.id])

  async function fetchBeneficiary() {
    try {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*, party:parties(*)')
        .eq('id', params.id)
        .single()
      if (error) throw error
      setBeneficiary(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoadingData(false)
    }
  }

  async function handleSubmit(data: any) {
    if (!params.id) return
    setIsLoading(true)
    try {
      // Update party name
      if (beneficiary?.party) {
        const { error: partyError } = await supabase
          .from('parties')
          .update({ name: data.name, updated_at: new Date().toISOString() })
          .eq('id', beneficiary.party.id)
        if (partyError) throw partyError
      }

      // Update beneficiary aadhaar
      await updateBeneficiary(params.id as string, {
        aadhaar_number: data.aadhaar_number || undefined
      })

      toast.success('Beneficiary updated successfully')
      router.push(`/beneficiaries/${params.id}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update beneficiary')
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingData) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  }

  if (!beneficiary) {
    return <div className="text-center py-12"><p className="text-gray-500">Beneficiary not found</p></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Beneficiary</h1>
        <p className="text-gray-500 text-sm mt-1">Update details for {beneficiary.party?.name}</p>
      </div>
      <BeneficiaryForm
        initialData={{
          name: beneficiary.party?.name,
          aadhaar_number: beneficiary.aadhaar_number
        }}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
