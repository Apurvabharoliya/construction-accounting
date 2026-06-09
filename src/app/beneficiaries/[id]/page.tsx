'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, IdCard, Edit3 } from 'lucide-react'
import Link from 'next/link'

export default function BeneficiaryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [beneficiary, setBeneficiary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) fetchBeneficiary()
  }, [params.id])

  async function fetchBeneficiary() {
    try {
      const { data } = await supabase
        .from('beneficiaries')
        .select('*, party:parties(*)')
        .eq('id', params.id)
        .single()
      setBeneficiary(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  }

  if (!beneficiary) {
    return <div className="text-center py-12"><p className="text-gray-500">Beneficiary not found</p></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/beneficiaries')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{beneficiary.party?.name}</h1>
          <p className="text-gray-500 text-sm">Beneficiary</p>
        </div>
        <Link href={`/beneficiaries/${beneficiary.id}/edit`} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
          <Edit3 className="w-4 h-4" /> Edit
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 max-w-md">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <IdCard className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Beneficiary Details</h3>
            <p className="text-sm text-gray-500">Personal information</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Name</span>
            <span className="font-medium">{beneficiary.party?.name || 'N/A'}</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Aadhaar Number</span>
            <span className="font-medium">{beneficiary.aadhaar_number || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
