'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Search, UserPlus, Users, Check } from 'lucide-react'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  aadhaar_number: z.string().length(12, 'Aadhaar must be 12 digits'),
  outstanding_amount: z.number().min(400000, 'Minimum outstanding amount is ₹4,00,000 (4 Lakhs)')
})

export type BeneficiaryFormData = z.infer<typeof formSchema>

interface PartyResult {
  id: string
  name: string
  phone?: string
  party_type: string
}

interface BeneficiaryFormProps {
  initialData?: {
    name?: string
    aadhaar_number?: string | null
    outstanding_amount?: number
  }
  onSubmit: (data: BeneficiaryFormData & { existingPartyId?: string }) => Promise<void>
  isLoading?: boolean
}

export default function BeneficiaryForm({ initialData, onSubmit, isLoading }: BeneficiaryFormProps) {
  const [partySearch, setPartySearch] = useState('')
  const [partyResults, setPartyResults] = useState<PartyResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [selectedParty, setSelectedParty] = useState<PartyResult | null>(null)
  const [searching, setSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<BeneficiaryFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      aadhaar_number: initialData?.aadhaar_number || '',
      outstanding_amount: initialData?.outstanding_amount || 400000
    }
  })

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search parties with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (!partySearch || partySearch.length < 2) {
      setPartyResults([])
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await supabase
          .from('parties')
          .select('id, name, phone, party_type')
          .or(`name.ilike.%${partySearch}%,phone.ilike.%${partySearch}%`)
          .order('name')
          .limit(8)

        // Filter out parties already linked to a beneficiary
        const { data: beneficiaries } = await supabase
          .from('beneficiaries')
          .select('party_id')

        const benPartyIds = new Set((beneficiaries || []).map(b => b.party_id))
        const results = (data || []).filter(p => !benPartyIds.has(p.id))

        setPartyResults(results)
        if (results.length > 0) setShowResults(true)
      } catch (error) {
        console.error('Error searching parties:', error)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [partySearch])

  function handleSelectParty(party: PartyResult) {
    setSelectedParty(party)
    setValue('name', party.name)
    setShowResults(false)
    setPartySearch('')
  }

  function handleClearSelection() {
    setSelectedParty(null)
    setValue('name', '')
  }

  function onLocalSubmit(data: BeneficiaryFormData) {
    onSubmit({ ...data, existingPartyId: selectedParty?.id })
  }

  return (
    <form onSubmit={handleSubmit(onLocalSubmit)} className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Beneficiary Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Party Selection */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Existing Vendor/Client <span className="text-gray-400 font-normal">(optional — search by name or phone)</span>
            </label>
            <div ref={searchRef} className="relative">
              {selectedParty ? (
                <div className="flex items-center gap-3 px-4 py-2 border border-green-300 bg-green-50 rounded-lg">
                  <div className="p-1.5 bg-green-100 rounded-full">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{selectedParty.name}</p>
                    {selectedParty.phone && (
                      <p className="text-xs text-gray-500">{selectedParty.phone}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search vendors/clients by name or phone..."
                    value={partySearch}
                    onChange={(e) => setPartySearch(e.target.value)}
                    onFocus={() => { if (partyResults.length > 0) setShowResults(true) }}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm"
                  />
                  {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}

                  {/* Search Results Dropdown */}
                  {showResults && partyResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {partyResults.map((party) => (
                        <button
                          key={party.id}
                          type="button"
                          onClick={() => handleSelectParty(party)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left border-b last:border-b-0 border-gray-100 transition-colors"
                        >
                          <div className="p-1.5 bg-gray-100 rounded-full">
                            <Users className="w-4 h-4 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{party.name}</p>
                            <p className="text-xs text-gray-500">
                              {party.phone && <span>{party.phone} • </span>}
                              <span className="capitalize">{party.party_type}</span>
                            </p>
                          </div>
                          <div className="p-1 text-blue-600 shrink-0">
                            <UserPlus className="w-4 h-4" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {showResults && partyResults.length === 0 && partySearch.length >= 2 && !searching && (
                    <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg p-4 text-center">
                      <p className="text-sm text-gray-500">No existing vendors/clients found</p>
                      <p className="text-xs text-gray-400 mt-1">Fill in the name below to create a new one</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {selectedParty
                ? 'Creating beneficiary from existing vendor/client'
                : 'Search for an existing vendor/client or enter new details below'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary Name *</label>
            <input type="text" {...register('name')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter full name" readOnly={!!selectedParty} />
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
