'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import React from 'react'
import { supabase } from '@/lib/supabase'
import { createBeneficiary } from '@/lib/api/beneficiaries'
import { toast } from 'sonner'
import { Save, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface BeneficiaryEntry {
  beneficiary_name: string
  phone: string
  address: string
  beneficiary_type: 'individual' | 'organization' | 'government'
  notes: string
  linked_party_id: string | null
}

export default function NewBeneficiaryPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [beneficiary, setBeneficiary] = useState<BeneficiaryEntry>({
    beneficiary_name: '',
    phone: '',
    address: '',
    beneficiary_type: 'individual',
    notes: '',
    linked_party_id: null,
  })

  useEffect(() => {
    checkExistingParty()
  }, [])

  async function checkExistingParty() {
    // Check URL params for linked party
    const params = new URLSearchParams(window.location.search)
    const partyId = params.get('partyId')
    if (partyId) {
      const { data } = await supabase
        .from('parties')
        .select('*')
        .eq('id', partyId)
        .single()

      if (data) {
        setBeneficiary(prev => ({
          ...prev,
          beneficiary_name: data.name || '',
          phone: data.phone || '',
          address: data.address || '',
          linked_party_id: partyId,
        }))
      }
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
      // createBeneficiary expects: partyData, beneficiaryData, existingPartyId?
      await createBeneficiary(
        {
          name: beneficiary.beneficiary_name,
          phone: beneficiary.phone,
          address: beneficiary.address,
          party_type: 'beneficiary',
          opening_balance: 0,
          gst_registered: false,
          notes: beneficiary.notes,
        },
        {
          subsidy_status: 'pending',
          construction_progress: 0,
          total_amount_received: 0,
          total_amount_due: 0,
          payment_installments: 0,
          notes: beneficiary.notes,
        },
        beneficiary.linked_party_id || undefined
      )

      toast.success('Beneficiary created successfully!')
      router.push('/beneficiaries')
    } catch (error: any) {
      toast.error('Failed to create beneficiary: ' + error.message)
    } finally {
      setSaving(false)
    }
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
            <h1 className="text-2xl font-bold text-gray-900">New Beneficiary</h1>
            <p className="text-sm text-gray-500 mt-1">Add a new beneficiary</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Beneficiary'}
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
