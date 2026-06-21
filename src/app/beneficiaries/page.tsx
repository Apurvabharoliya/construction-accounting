'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Eye, Edit3, Trash2, Save, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { deleteBeneficiary } from '@/lib/api/beneficiaries'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/gst'

export default function BeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchBeneficiaries()
  }, [searchQuery])

  // Refetch data when window regains focus (ensures page is in sync with background saves)
  const fetchBeneficiariesRef = useRef(fetchBeneficiaries)
  fetchBeneficiariesRef.current = fetchBeneficiaries

  useEffect(() => {
    function handleFocus() {
      fetchBeneficiariesRef.current()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  async function fetchBeneficiaries() {
    setLoading(true)
    try {
      let query = supabase
        .from('beneficiaries')
        .select('*, party:parties(*)')
        .order('created_at', { ascending: false })

      if (searchQuery) query = query.or(`party.name.ilike.%${searchQuery}%,beneficiary_number.ilike.%${searchQuery}%,application_number.ilike.%${searchQuery}%`)

      const { data } = await query
      setBeneficiaries(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // --- Inline editing state ---
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Record<string, any>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  function startEdit(b: any) {
    setEditingId(b.id)
    setEditForm({
      name: b.party?.name || '',
      plinth: Number(b.plinth) || '',
      lintel: Number(b.lintel) || '',
      roof: Number(b.roof) || '',
      finishing: Number(b.finishing) || '',
      amount_due: Number(b.total_amount_due) || '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({})
  }

  async function handleInlineSave(id: string, partyId: string | null) {
    setSavingId(id)
    try {
      // Update party name
      if (partyId) {
        const { error: partyErr } = await supabase
          .from('parties')
          .update({ name: editForm.name, updated_at: new Date().toISOString() })
          .eq('id', partyId)
        if (partyErr) throw partyErr
      }

      // Update beneficiary financial fields
      const { error: benErr } = await supabase
        .from('beneficiaries')
        .update({
          plinth: Number(editForm.plinth) || 0,
          lintel: Number(editForm.lintel) || 0,
          roof: Number(editForm.roof) || 0,
          finishing: Number(editForm.finishing) || 0,
          total_amount_due: Number(editForm.amount_due) || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (benErr) throw benErr

      toast.success('Beneficiary updated')
      setEditingId(null)
      setEditForm({})
      fetchBeneficiaries()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update')
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return
    try {
      await deleteBeneficiary(id)
      toast.success('Beneficiary deleted')
      fetchBeneficiaries()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Beneficiaries</h1>
          <p className="text-gray-500 text-sm mt-1">Manage subsidy beneficiaries</p>
        </div>
        <Link href="/beneficiaries/new" className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          <Plus className="w-5 h-5" /> Add Beneficiary
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="Search by name, beneficiary number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex gap-4">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="h-3.5 flex-1 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-4 py-4 flex gap-4 items-center">
                  <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ) : beneficiaries.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">No beneficiaries found</p>
            <Link href="/beneficiaries/new" className="text-blue-600 hover:underline font-medium">Add your first beneficiary</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
                    <table className="w-full responsive-table-card">
              <thead>
                <tr className="text-left bg-gray-50">
                  <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap">App No</th>
                  <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap">Name</th>
                  <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap hidden md:table-cell">Village</th>
                  <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap hidden md:table-cell">Plinth</th>
                  <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap hidden md:table-cell">Lintel</th>
                  <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap hidden md:table-cell">Roof</th>
                  <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap hidden md:table-cell">Finishing</th>
                  <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap text-right">Total Due</th>
                  <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap text-right">Balance</th>
                  <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {beneficiaries.map((b: any) => {
                  const amountDue = Number(b.total_amount_due) || 0
                  const stagePlinth = Number(b.plinth) || 0
                  const stageLintel = Number(b.lintel) || 0
                  const stageRoof = Number(b.roof) || 0
                  const stageFinishing = Number(b.finishing) || 0
                  const totalStages = stagePlinth + stageLintel + stageRoof + stageFinishing
                  const balance = amountDue - totalStages
                  return (
                    <tr key={b.id} className="border-t hover:bg-gray-50">
                      <td className="p-4 text-sm" data-label="App No">
                        <span className="font-mono text-gray-600">{b.application_number || '-'}</span>
                      </td>
                      <td className="p-4" data-label="Name">
                        {editingId === b.id ? (
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50/30"
                          />
                        ) : (
                          <Link href={`/beneficiaries/${b.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                            {b.party?.name || 'N/A'}
                          </Link>
                        )}
                      </td>
                      <td className="p-4 text-sm hidden md:table-cell" data-label="Village">
                        <span className="text-gray-600">{b.party?.address || '-'}</span>
                      </td>
                      <td className="p-4 text-sm hidden md:table-cell" data-label="Plinth">
                        {editingId === b.id ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.plinth}
                            onChange={(e) => setEditForm(prev => ({ ...prev, plinth: e.target.value === '' ? '' : Number(e.target.value) }))}
                            className="w-24 px-2 py-2 border border-blue-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50/30"
                          />
                        ) : (
                          <span className="font-medium">{stagePlinth > 0 ? formatCurrency(stagePlinth) : '-'}</span>
                        )}
                      </td>
                      <td className="p-4 text-sm hidden md:table-cell" data-label="Lintel">
                        {editingId === b.id ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.lintel}
                            onChange={(e) => setEditForm(prev => ({ ...prev, lintel: e.target.value === '' ? '' : Number(e.target.value) }))}
                            className="w-24 px-2 py-2 border border-blue-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50/30"
                          />
                        ) : (
                          <span className="font-medium">{stageLintel > 0 ? formatCurrency(stageLintel) : '-'}</span>
                        )}
                      </td>
                      <td className="p-4 text-sm hidden md:table-cell" data-label="Roof">
                        {editingId === b.id ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.roof}
                            onChange={(e) => setEditForm(prev => ({ ...prev, roof: e.target.value === '' ? '' : Number(e.target.value) }))}
                            className="w-24 px-2 py-2 border border-blue-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50/30"
                          />
                        ) : (
                          <span className="font-medium">{stageRoof > 0 ? formatCurrency(stageRoof) : '-'}</span>
                        )}
                      </td>
                      <td className="p-4 text-sm hidden md:table-cell" data-label="Finishing">
                        {editingId === b.id ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.finishing}
                            onChange={(e) => setEditForm(prev => ({ ...prev, finishing: e.target.value === '' ? '' : Number(e.target.value) }))}
                            className="w-24 px-2 py-2 border border-blue-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50/30"
                          />
                        ) : (
                          <span className="font-medium">{stageFinishing > 0 ? formatCurrency(stageFinishing) : '-'}</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-right font-semibold" data-label="Total Due">
                        {amountDue > 0 ? formatCurrency(amountDue) : '-'}
                      </td>
                      <td className="p-4 text-sm text-right font-bold" data-label="Balance">
                        {balance !== 0 ? (
                          <span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>
                            {formatCurrency(Math.abs(balance))}
                            {balance > 0 ? ' Dr' : ' Cr'}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-4" data-label="Actions">
                        <div className="flex items-center gap-2 sm:gap-3 justify-end">
                          <Link href={`/beneficiaries/${b.id}`} className="resp-btn-touch p-1.5 sm:p-0 sm:flex sm:items-center sm:gap-1 text-blue-600 hover:text-blue-700 rounded-lg sm:rounded-none hover:bg-blue-50 sm:hover:bg-transparent transition-colors" title="View">
                            <Eye className="w-4 h-4" /><span className="hidden sm:inline text-sm font-medium"> View</span>
                          </Link>
                          {editingId === b.id ? (
                            <>
                              <button
                                onClick={() => handleInlineSave(b.id, b.party_id)}
                                disabled={savingId === b.id}
                                className="flex items-center gap-1 p-1.5 text-green-600 hover:text-green-700 rounded-lg hover:bg-green-50 transition-colors"
                                title="Save"
                              >
                                {savingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                <span className="hidden sm:inline text-sm font-medium"> Save</span>
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="flex items-center gap-1 p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                                <span className="hidden sm:inline text-sm"> Cancel</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startEdit(b)}
                              className="flex items-center gap-1 p-1.5 text-gray-600 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" /><span className="hidden sm:inline text-sm"> Edit</span>
                            </button>
                          )}
                          <button onClick={() => handleDelete(b.id, b.party?.name)} className="resp-btn-touch p-1.5 sm:p-0 sm:flex sm:items-center sm:gap-1 text-red-600 hover:text-red-700 rounded-lg sm:rounded-none hover:bg-red-50 sm:hover:bg-transparent transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" /><span className="hidden sm:inline text-sm font-medium"> Delete</span>
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
