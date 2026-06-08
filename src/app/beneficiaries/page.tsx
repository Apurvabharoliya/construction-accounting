'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/gst'
import { formatDate } from '@/lib/date'

const subsidyColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  disbursed: 'bg-purple-100 text-purple-800',
  received: 'bg-green-100 text-green-800'
}

export default function BeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchBeneficiaries()
  }, [searchQuery, statusFilter])

  async function fetchBeneficiaries() {
    setLoading(true)
    try {
      let query = supabase
        .from('beneficiaries')
        .select('*, party:parties(*)')
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') query = query.eq('subsidy_status', statusFilter)
      if (searchQuery) query = query.or(`party.name.ilike.%${searchQuery}%,aadhaar_number.ilike.%${searchQuery}%`)

      const { data } = await query
      setBeneficiaries(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Beneficiaries</h1>
          <p className="text-gray-500 text-sm mt-1">Manage subsidy beneficiaries and track payments</p>
        </div>
        <Link href="/beneficiaries/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-5 h-5" /> Add Beneficiary
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="text" placeholder="Search by name or Aadhaar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border rounded-lg text-sm">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="disbursed">Disbursed</option>
            <option value="received">Received</option>
          </select>
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
                  <th className="p-4 text-sm font-medium text-gray-500">Scheme</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Sanctioned</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Progress</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {beneficiaries.map((b: any) => (
                  <tr key={b.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{b.party?.name || 'N/A'}</p>
                      {b.party?.phone && <p className="text-sm text-gray-500">{b.party.phone}</p>}
                    </td>
                    <td className="p-4 text-sm text-gray-600">{b.aadhaar_number || '-'}</td>
                    <td className="p-4 text-sm">{b.subsidy_scheme || '-'}</td>
                    <td className="p-4 text-sm font-medium">{formatCurrency(Number(b.subsidy_amount_sanctioned) || 0)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${b.construction_progress || 0}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{b.construction_progress || 0}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${subsidyColors[b.subsidy_status] || 'bg-gray-100 text-gray-800'}`}>
                        {b.subsidy_status.charAt(0).toUpperCase() + b.subsidy_status.slice(1)}
                      </span>
                    </td>
                    <td className="p-4">
                      <Link href={`/beneficiaries/${b.id}`} className="text-blue-600 hover:underline text-sm font-medium">View</Link>
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
