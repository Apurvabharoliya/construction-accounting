'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createParty } from '@/lib/api/parties'
import { toast } from 'sonner'
import PartyForm from '@/components/parties/PartyForm'

export default function NewPartyPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(data: any) {
    setIsLoading(true)
    try {
      const party = await createParty({
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



      toast.success('Party created successfully')
      router.push('/parties')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create party')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add New Vendor</h1>
        <p className="text-gray-500 text-sm mt-1">Add a new supplier or vendor</p>
      </div>
      <PartyForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
