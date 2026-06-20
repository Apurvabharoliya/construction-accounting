'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import React from 'react'
import { createParty } from '@/lib/api/parties'
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

export default function NewPartyPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [party, setParty] = useState<PartyEntry>({
    name: '',
    phone: '',
    address: '',
    party_type: 'supplier',
    notes: '',
  })

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
    await createParty({
      name: party.name,
      phone: party.phone,
      address: party.address,
      party_type: party.party_type,
      opening_balance: 0,
      gst_registered: false,
      notes: party.notes,
    })

      toast.success('Party created successfully!')
      router.push('/parties')
    } catch (error: any) {
      toast.error('Failed to create party: ' + error.message)
    } finally {
      setSaving(false)
    }
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
            <h1 className="text-2xl font-bold text-gray-900">New Party</h1>
            <p className="text-sm text-gray-500 mt-1">Add a new party (contractor, supplier, or other)</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Party'}
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
