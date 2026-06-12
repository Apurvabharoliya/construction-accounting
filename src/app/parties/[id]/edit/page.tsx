'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { updateParty } from '@/lib/api/parties'
import { toast } from 'sonner'
import PartyForm from '@/components/parties/PartyForm'
import type { Party } from '@/types/database'

export default function EditPartyPage() {
  const params = useParams()
  const router = useRouter()
  const [party, setParty] = useState<Party | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (params.id) fetchParty()
  }, [params.id])

  async function fetchParty() {
    try {
      const { data, error } = await supabase.from('parties').select('*').eq('id', params.id).single()
      if (error) throw error
      setParty(data)
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
      await updateParty(params.id as string, {
        name: data.name,
        phone: data.phone || undefined,
        email: data.email || undefined,
        gstin: data.gstin || undefined,
        pan: data.pan || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        pin_code: data.pin_code || undefined,
        party_type: data.party_type,
        opening_balance: Number(data.opening_balance) || 0,
        gst_registered: data.gst_registered || false,
        bank_name: data.bank_name || undefined,
        bank_account: data.bank_account || undefined,
        ifsc_code: data.ifsc_code || undefined,
        notes: data.notes || undefined
      })



      toast.success('Party updated successfully')
      router.push(`/parties/${params.id}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update party')
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingData) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  }

  if (!party) {
    return <div className="text-center py-12"><p className="text-gray-500">Party not found</p></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Vendor</h1>
        <p className="text-gray-500 text-sm mt-1">Update details for {party.name}</p>
      </div>
      <PartyForm initialData={party} onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
