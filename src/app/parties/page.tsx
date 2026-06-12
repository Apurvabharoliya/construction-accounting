'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Party } from '@/types/database'
import { Search, Plus, Phone, Mail, MapPin, Eye, Edit3, Trash2, HandHeart } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/gst'
import { deleteParty } from '@/lib/api/parties'
import { toast } from 'sonner'
const partyTypeColors: Record<string, string> = {
  supplier: 'bg-blue-100 text-blue-800'
}

export default function PartiesPage() {
  const [parties, setParties] = useState<Party[]>([])
  const [balanceMap, setBalanceMap] = useState<Record<string, number>>({})
  const [beneficiaryPartyIds, setBeneficiaryPartyIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    fetchParties()
  }, [searchQuery, filterType])

  async function fetchParties() {
    setLoading(true)
    try {
      // Fetch beneficiary party IDs
      const { data: beneficiaries } = await supabase
        .from('beneficiaries')
        .select('party_id')
      const benSet = new Set<string>((beneficiaries || []).map(b => b.party_id))
      setBeneficiaryPartyIds(benSet)

      let query = supabase.from('parties').select('*').order('created_at', { ascending: false })

      // Only filter by party_type for valid types; 'paid'/'unpaid' are client-side filters
      if (filterType === 'supplier') {
        query = query.eq('party_type', filterType)
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,gstin.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query
      if (error) throw error
      const partiesData = data || []
      setParties(partiesData)

      // Fetch transaction balances to compute actual balance per party
      const partyIds = partiesData.map(p => p.id)
      if (partyIds.length > 0) {
        const { data: transactions } = await supabase
          .from('transactions')
          .select('party_id, debit, credit')
          .in('party_id', partyIds)

        // Compute net balance from transactions: sum(debit) - sum(credit)
        const txnBalanceMap: Record<string, number> = {}
        transactions?.forEach(txn => {
          txnBalanceMap[txn.party_id] = (txnBalanceMap[txn.party_id] || 0) + Number(txn.debit) - Number(txn.credit)
        })
        setBalanceMap(txnBalanceMap)
      } else {
        setBalanceMap({})
      }
    } catch (error) {
      console.error('Error fetching parties:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter parties by balance status
  const filteredParties = parties.filter(party => {
    if (filterType === 'paid') {
      const mainBalance = (party.opening_balance || 0) + (balanceMap[party.id] || 0)
      return mainBalance === 0
    }
    if (filterType === 'unpaid') {
      const mainBalance = (party.opening_balance || 0) + (balanceMap[party.id] || 0)
      return mainBalance !== 0
    }
    return true
  })

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return
    try {
      await deleteParty(id)
      toast.success('Party deleted')
      fetchParties()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-gray-500 text-sm mt-1">Manage suppliers and vendors</p>
        </div>
        <Link
          href="/parties/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Vendor
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, phone, GSTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'all', label: 'All' },
              { value: 'supplier', label: 'Supplier' },
              { value: 'paid', label: 'Settled' },
              { value: 'unpaid', label: 'Outstanding' }
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilterType(value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredParties.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">{parties.length > 0 ? 'No vendors match the selected filter' : 'No vendors found'}</p>
            <Link href="/parties/new" className="text-blue-600 hover:underline font-medium">Add your first vendor</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full responsive-table-card">
              <thead>
                <tr className="text-left bg-gray-50">
                  <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap">Name</th>
                  <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap">Type</th>
                  <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap hidden md:table-cell">Contact</th>
                  <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap hidden md:table-cell">Description</th>
                  <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap">Balance</th>
                  <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredParties.map((party) => {
                  const mainBalance = (party.opening_balance || 0) + (balanceMap[party.id] || 0)
                  return (
                  <tr key={party.id} className="border-t hover:bg-gray-50 transition-colors">
                    <td className="p-4" data-label="Name">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{party.name}</p>
                        {beneficiaryPartyIds.has(party.id) && (
                          <Link href={`/beneficiaries?search=${encodeURIComponent(party.name)}`} title="Also a beneficiary">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              <HandHeart className="w-3 h-3" />
                              Beneficiary
                            </span>
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="p-4" data-label="Type">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${partyTypeColors[party.party_type] || 'bg-gray-100 text-gray-800'}`}>
                        {party.party_type.charAt(0).toUpperCase() + party.party_type.slice(1)}
                      </span>
                    </td>
                    <td className="p-4 hidden md:table-cell" data-label="Contact">
                      {party.phone && (
                        <p className="text-sm flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {party.phone}
                        </p>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-500 max-w-xs truncate hidden md:table-cell" data-label="Description">
                      {party.notes || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="p-4" data-label="Balance">
                      <div className="relative group">
                        <span className={`font-medium cursor-help ${
                          (mainBalance || 0) > 0 ? 'text-green-600' : 
                          (mainBalance || 0) < 0 ? 'text-red-600' : ''
                        }`}>
                          {formatCurrency(mainBalance || 0)}
                        </span>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-0 mb-2 w-56 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                          <div className="bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 space-y-1.5">
                            <p className="font-semibold text-gray-300 text-[11px] uppercase tracking-wider">Balance Breakdown</p>
                            <div className="flex justify-between">
                              <span>Opening Balance</span>
                              <span>{formatCurrency(party.opening_balance || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Transaction Balance</span>
                              <span className={balanceMap[party.id] > 0 ? 'text-green-400' : balanceMap[party.id] < 0 ? 'text-red-400' : 'text-gray-400'}>
                                {formatCurrency(balanceMap[party.id] || 0)}
                              </span>
                            </div>
                            <div className="border-t border-gray-700 pt-1.5 flex justify-between font-semibold">
                              <span>Total</span>
                              <span className={mainBalance > 0 ? 'text-green-400' : mainBalance < 0 ? 'text-red-400' : ''}>
                                {formatCurrency(mainBalance || 0)}
                              </span>
                            </div>
                          </div>
                          <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1 ml-4"></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4" data-label="">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Link href={`/parties/${party.id}`} className="p-1.5 sm:p-0 sm:flex sm:items-center sm:gap-1 text-blue-600 hover:text-blue-700 rounded-lg sm:rounded-none hover:bg-blue-50 sm:hover:bg-transparent transition-colors" title="View">
                          <Eye className="w-4 h-4" /><span className="hidden sm:inline text-sm font-medium"> View</span>
                        </Link>
                        <Link href={`/parties/${party.id}/edit`} className="p-1.5 sm:p-0 sm:flex sm:items-center sm:gap-1 text-gray-600 hover:text-gray-700 rounded-lg sm:rounded-none hover:bg-gray-50 sm:hover:bg-transparent transition-colors" title="Edit">
                          <Edit3 className="w-4 h-4" /><span className="hidden sm:inline text-sm"> Edit</span>
                        </Link>
                        <button onClick={() => handleDelete(party.id, party.name)} className="p-1.5 sm:p-0 sm:flex sm:items-center sm:gap-1 text-red-600 hover:text-red-700 rounded-lg sm:rounded-none hover:bg-red-50 sm:hover:bg-transparent transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" /><span className="hidden sm:inline text-sm"> Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
