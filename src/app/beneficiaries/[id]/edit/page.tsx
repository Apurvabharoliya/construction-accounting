'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import React from 'react'
import { supabase } from '@/lib/supabase'
import { updateBeneficiary } from '@/lib/api/beneficiaries'
import { toast } from 'sonner'
import { Save, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface BeneficiaryEntry {
  beneficiary_name: string
  phone: string
  address: string
  beneficiary_type: 'individual' | 'organization' | 'government'
  notes: string
  party_id: string | null
}

export default function EditBeneficiaryPage() {
  const params = useParams()
  const router = useRouter()
  const beneficiaryId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [beneficiary, setBeneficiary] = useState<BeneficiaryEntry>({
    beneficiary_name: '',
    phone: '',
    address: '',
    beneficiary_type: 'individual',
    notes: '',
    party_id: null,
  })

  useEffect(() => {
    loadBeneficiary()
  }, [beneficiaryId])

  async function loadBeneficiary() {
    try {
      // Beneficiary links to Party via party_id
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*, party:parties(*)')
        .eq('id', beneficiaryId)
        .single()

      if (error) throw error

      if (data) {
        const party = data.party as any
        setBeneficiary({
          beneficiary_name: party?.name || '',
          phone: party?.phone || '',
          address: party?.address || '',
          beneficiary_type: party?.party_type || 'beneficiary',
          notes: data.notes || party?.notes || '',
          party_id: data.party_id || null,
        })
      }
    } catch (error: any) {
      toast.error('Failed to load beneficiary: ' + error.message)
      router.push('/beneficiaries')
    } finally {
      setLoading(false)
    }
  }

  function updateField(field: keyof BeneficiaryEntry, value: string) {
    setBeneficiary(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!beneficiary.beneficiary_name.trim()) {
      toast.error('Beneficiary name is required')
      return
    }

    setSaving(true)
    try {
      // Update the linked party's name/phone/address
      if (beneficiary.party_id) {
        const { error: partyError } = await supabase
          .from('parties')
          .update({
            name: beneficiary.beneficiary_name,
            phone: beneficiary.phone,
            address: beneficiary.address,
            updated_at: new Date().toISOString(),
          })
          .eq('id', beneficiary.party_id)
        if (partyError) throw partyError
      }

      await updateBeneficiary(beneficiaryId, {
        notes: beneficiary.notes,
      })

      toast.success('Beneficiary updated successfully!')
      router.push('/beneficiaries')
    } catch (error: any) {
      toast.error('Failed to update beneficiary: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
            <div className="space-y-2">
              <div className="h-7 w-40 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-4 w-56 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[800px] mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/beneficiaries" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Beneficiary</h1>
            <p className="text-sm text-gray-500 mt-1">Update beneficiary details below</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Beneficiary Form as Spreadsheet */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 min-w-[140px]">Name *</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-36">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 min-w-[160px]">Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-36">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 min-w-[160px]">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 hover:bg-green-50/30 transition-colors">
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={beneficiary.beneficiary_name}
                    onChange={(e) => updateField('beneficiary_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter beneficiary name"
                    autoFocus
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="tel"
                    value={beneficiary.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Phone number"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={beneficiary.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Address"
                  />
                </td>
                <td className="px-4 py-3">
                  <select
                    value={beneficiary.beneficiary_type}
                    onChange={(e) => updateField('beneficiary_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                  >
                    <option value="individual">Individual</option>
                    <option value="organization">Organization</option>
                    <option value="government">Government</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={beneficiary.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Additional notes"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
