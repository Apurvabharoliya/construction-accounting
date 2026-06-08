'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/gst'
import { formatDate } from '@/lib/date'
import { updateSubsidyStatus } from '@/lib/api/beneficiaries'
import { ArrowLeft, Building2, IndianRupee, Phone, MapPin } from 'lucide-react'
import { toast } from 'sonner'

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

  async function handleStatusUpdate(status: string) {
    try {
      await updateSubsidyStatus(params.id as string, status as any)
      toast.success('Subsidy status updated')
      fetchBeneficiary()
    } catch (error: any) {
      toast.error(error.message)
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
          <p className="text-gray-500 text-sm">Beneficiary • {beneficiary.subsidy_scheme || 'No scheme'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Contact</h3>
          <div className="space-y-2">
            {beneficiary.party?.phone && (
              <p className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-gray-400" />{beneficiary.party.phone}</p>
            )}
            {beneficiary.aadhaar_number && (
              <p className="text-sm">Aadhaar: <span className="font-medium">{beneficiary.aadhaar_number}</span></p>
            )}
            {beneficiary.property_address && (
              <p className="flex items-start gap-2 text-sm"><MapPin className="w-4 h-4 text-gray-400 mt-0.5" />{beneficiary.property_address}</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Subsidy Details</h3>
          <div className="space-y-2">
            <p className="text-sm">Scheme: <span className="font-medium">{beneficiary.subsidy_scheme || 'N/A'}</span></p>
            <p className="text-sm">Sanctioned: <span className="font-medium text-green-600">{formatCurrency(Number(beneficiary.subsidy_amount_sanctioned) || 0)}</span></p>
            <p className="text-sm">Received: <span className="font-medium text-blue-600">{formatCurrency(Number(beneficiary.total_amount_received) || 0)}</span></p>
            <p className="text-sm">Installments: <span className="font-medium">{beneficiary.payment_installments}</span></p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
          <div className="space-y-3">
            <div>
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                beneficiary.subsidy_status === 'received' ? 'bg-green-100 text-green-800' :
                beneficiary.subsidy_status === 'disbursed' ? 'bg-purple-100 text-purple-800' :
                beneficiary.subsidy_status === 'approved' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {beneficiary.subsidy_status?.charAt(0).toUpperCase() + beneficiary.subsidy_status?.slice(1)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${beneficiary.construction_progress || 0}%` }} />
              </div>
              <span className="text-sm text-gray-500">{beneficiary.construction_progress || 0}%</span>
            </div>
            <div className="flex gap-2 mt-4">
              {['pending', 'approved', 'disbursed', 'received'].map(status => (
                <button key={status} onClick={() => handleStatusUpdate(status)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    beneficiary.subsidy_status === status ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
