'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Eye, Edit3, Trash2, Sparkles, IndianRupee } from 'lucide-react'
import Link from 'next/link'
import { deleteBeneficiary } from '@/lib/api/beneficiaries'
import { toast } from 'sonner'
import { useAiDescriptions } from '@/lib/hooks/useAiDescriptions'
import { formatCurrency } from '@/lib/gst'

export default function BeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchBeneficiaries()
  }, [searchQuery])

  async function fetchBeneficiaries() {
    setLoading(true)
    try {
      let query = supabase
        .from('beneficiaries')
        .select('*, party:parties(*)')
        .order('created_at', { ascending: false })

      if (searchQuery) query = query.or(`party.name.ilike.%${searchQuery}%,aadhaar_number.ilike.%${searchQuery}%`)

      const { data } = await query
      setBeneficiaries(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
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

  const { descriptions: aiDescs, loading: aiLoading, error: aiError } = useAiDescriptions({
    records: beneficiaries,
    type: 'beneficiary',
    enabled: beneficiaries.length > 0
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Beneficiaries</h1>
          <p className="text-gray-500 text-sm mt-1">Manage subsidy beneficiaries</p>
        </div>
        <Link href="/beneficiaries/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-5 h-5" /> Add Beneficiary
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="Search by name or Aadhaar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
        ) : beneficiaries.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">No beneficiaries found</p>
            <Link href="/beneficiaries/new" className="text-blue-600 hover:underline font-medium">Add your first beneficiary</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left bg-gray-50">
                  <th className="p-4 text-sm font-medium text-gray-500">Name</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Aadhaar</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Amount (₹)</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Description</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {beneficiaries.map((b: any) => (
                  <tr key={b.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{b.party?.name || 'N/A'}</p>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{b.aadhaar_number || '-'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5 text-orange-500" />
                        <span className="font-semibold text-orange-600">{formatCurrency(b.total_amount_due || 0)}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-500 max-w-xs truncate">
                      {aiLoading && !aiDescs[b.id] ? (
                        <span className="flex items-center gap-1 text-gray-400"><Sparkles className="w-3 h-3 animate-pulse" /> Generating...</span>
                      ) : aiDescs[b.id] ? (
                        <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-blue-500 shrink-0" />{aiDescs[b.id]}</span>
                      ) : aiError ? (
                        <span className="flex items-center gap-1 text-gray-400" title={aiError}><Sparkles className="w-3 h-3 text-red-400" /> Unavailable</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Link href={`/beneficiaries/${b.id}`} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium">
                          <Eye className="w-4 h-4" /> View
                        </Link>
                        <Link href={`/beneficiaries/${b.id}/edit`} className="flex items-center gap-1 text-gray-600 hover:text-gray-700 text-sm">
                          <Edit3 className="w-4 h-4" /> Edit
                        </Link>
                        <button onClick={() => handleDelete(b.id, b.party?.name)} className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium">
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
