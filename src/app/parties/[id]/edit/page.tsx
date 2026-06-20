'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import React from 'react'
import { supabase } from '@/lib/supabase'
import { updateParty } from '@/lib/api/parties'
import { toast } from 'sonner'
import { Save, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface PartyEntry {
  name: string
  phone: string
  address: string
  party_type: 'supplier' | 'beneficiary'
  notes: string
}

export default function EditPartyPage() {
  const params = useParams()
  const router = useRouter()
  const partyId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [party, setParty] = useState<PartyEntry>({
    name: '',
    phone: '',
    address: '',
    party_type: 'supplier',
    notes: '',
  })

  useEffect(() => {
    loadParty()
  }, [partyId])

  async function loadParty() {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('*')
        .eq('id', partyId)
        .single()

      if (error) throw error

      if (data) {
        setParty({
          name: data.name || '',
          phone: data.phone || '',
          address: data.address || '',
          party_type: data.party_type || 'supplier',
          notes: data.notes || '',
        })
      }
    } catch (error: any) {
      toast.error('Failed to load party: ' + error.message)
      router.push('/parties')
    } finally {
      setLoading(false)
    }
  }

  function updateField(field: keyof PartyEntry, value: string) {
    setParty(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!party.name.trim()) {
      toast.error('Party name is required')
      return
    }

    setSaving(true)
    try {
      await updateParty(partyId, {
        name: party.name,
        phone: party.phone,
        address: party.address,
        party_type: party.party_type,
        notes: party.notes,
      })

      toast.success('Party updated successfully!')
      router.push('/parties')
    } catch (error: any) {
      toast.error('Failed to update party: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="max-w-[800px] mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/parties" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Party</h1>
            <p className="text-sm text-gray-500 mt-1">Update party details below</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Party Form as Spreadsheet */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 min-w-[120px]">Name *</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-36">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 min-w-[160px]">Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-36">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 min-w-[160px]">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={party.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter party name"
                    autoFocus
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="tel"
                    value={party.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Phone number"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={party.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Address"
                  />
                </td>
                <td className="px-4 py-3">
                  <select
                    value={party.party_type}
                    onChange={(e) => updateField('party_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="supplier">Supplier</option>
                    <option value="beneficiary">Beneficiary</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={party.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
