'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Eye, Edit3, Trash2, IndianRupee } from 'lucide-react'
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
            <table className="w-full responsive-table-card">
              <thead>
                <tr className="text-left bg-gray-50">
                  <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap">Name</th>
                  <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap">Aadhaar</th>
                  <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap">Amount (₹)</th>
                  <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap hidden md:table-cell">Description</th>
                  <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {beneficiaries.map((b: any) => (
                  <tr key={b.id} className="border-t hover:bg-gray-50">
                    <td className="p-4" data-label="Name">
                      <p className="font-medium text-gray-900">{b.party?.name || 'N/A'}</p>
                    </td>
                    <td className="p-4 text-sm text-gray-600" data-label="Aadhaar">{b.aadhaar_number || '-'}</td>
                    <td className="p-4" data-label="Amount">
                      <div className="flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5 text-orange-500" />
                        <span className="font-semibold text-orange-600">{formatCurrency(b.total_amount_due || 0)}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-500 max-w-xs truncate hidden md:table-cell" data-label="Description">
                      {b.notes || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="p-4" data-label="">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Link href={`/beneficiaries/${b.id}`} className="p-1.5 sm:p-0 sm:flex sm:items-center sm:gap-1 text-blue-600 hover:text-blue-700 rounded-lg sm:rounded-none hover:bg-blue-50 sm:hover:bg-transparent transition-colors" title="View">
                          <Eye className="w-4 h-4" /><span className="hidden sm:inline text-sm font-medium"> View</span>
                        </Link>
                        <Link href={`/beneficiaries/${b.id}/edit`} className="p-1.5 sm:p-0 sm:flex sm:items-center sm:gap-1 text-gray-600 hover:text-gray-700 rounded-lg sm:rounded-none hover:bg-gray-50 sm:hover:bg-transparent transition-colors" title="Edit">
                          <Edit3 className="w-4 h-4" /><span className="hidden sm:inline text-sm"> Edit</span>
                        </Link>
                        <button onClick={() => handleDelete(b.id, b.party?.name)} className="p-1.5 sm:p-0 sm:flex sm:items-center sm:gap-1 text-red-600 hover:text-red-700 rounded-lg sm:rounded-none hover:bg-red-50 sm:hover:bg-transparent transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" /><span className="hidden sm:inline text-sm font-medium"> Delete</span>
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
