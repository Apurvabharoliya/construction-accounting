'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Party } from '@/types/database'
import { formatCurrency } from '@/lib/gst'
import { formatDate } from '@/lib/date'
import { getPartyLedger } from '@/lib/api/ledger'
import { ArrowLeft, Phone, Mail, MapPin, Edit3, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { deleteParty } from '@/lib/api/parties'
import { toast } from 'sonner'

export default function PartyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [party, setParty] = useState<Party | null>(null)
  const [ledger, setLedger] = useState<any[]>([])
  const [currentBalance, setCurrentBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchParty()
    }
  }, [params.id])

  async function fetchParty() {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      setParty(data)

      const ledgerData = await getPartyLedger(params.id as string)
      setLedger(ledgerData.transactions)
      setCurrentBalance(ledgerData.currentBalance)
    } catch (error) {
      console.error('Error fetching party:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!party) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Party not found</p>
        <button onClick={() => router.push('/parties')} className="text-blue-600 hover:underline mt-2">Back to parties</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/parties')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{party.name}</h1>
          <p className="text-gray-500 text-sm capitalize">{party.party_type}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => {
            if (confirm(`Are you sure you want to delete ${party.name}?`)) {
              deleteParty(party.id).then(() => {
                toast.success('Party deleted')
                router.push('/parties')
              }).catch((e: any) => toast.error(e.message))
            }
          }} className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
          <Link href={`/parties/${party.id}/edit`} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
            <Edit3 className="w-4 h-4" /> Edit
          </Link>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h3>
          <div className="space-y-2">
            {party.phone && (
              <p className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                {party.phone}
              </p>
            )}
            {party.email && (
              <p className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                {party.email}
              </p>
            )}
            {(party.city || party.state) && (
              <p className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                {party.city}{party.state ? `, ${party.state}` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">GST Details</h3>
          <div className="space-y-2">
            <p className="text-sm">GSTIN: <span className="font-medium">{party.gstin || 'N/A'}</span></p>
            <p className="text-sm">PAN: <span className="font-medium">{party.pan || 'N/A'}</span></p>
            <p className="text-sm">Registered: <span className={`font-medium ${party.gst_registered ? 'text-green-600' : 'text-red-600'}`}>
              {party.gst_registered ? 'Yes' : 'No'}
            </span></p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Balance</h3>
          <p className={`text-2xl font-bold ${currentBalance > 0 ? 'text-green-600' : currentBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {formatCurrency(currentBalance)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Current outstanding balance</p>
        </div>
      </div>

      {/* Ledger */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Transaction Ledger</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b">
                <th className="pb-3 text-sm font-medium text-gray-500">Date</th>
                <th className="pb-3 text-sm font-medium text-gray-500">Description</th>
                <th className="pb-3 text-sm font-medium text-gray-500">Type</th>
                <th className="pb-3 text-sm font-medium text-gray-500">Debit</th>
                <th className="pb-3 text-sm font-medium text-gray-500">Credit</th>
                <th className="pb-3 text-sm font-medium text-gray-500">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">No transactions yet</td>
                </tr>
              ) : (
                ledger.map((txn: any) => (
                  <tr key={txn.id} className="border-t hover:bg-gray-50">
                    <td className="py-3 text-sm">{formatDate(txn.transaction_date)}</td>
                    <td className="py-3 text-sm">{txn.description || '-'}</td>
                    <td className="py-3">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs capitalize">
                        {txn.transaction_type}
                      </span>
                    </td>
                    <td className="py-3 text-sm font-medium text-red-600">
                      {txn.debit > 0 ? formatCurrency(txn.debit) : '-'}
                    </td>
                    <td className="py-3 text-sm font-medium text-green-600">
                      {txn.credit > 0 ? formatCurrency(txn.credit) : '-'}
                    </td>
                    <td className="py-3 text-sm font-medium">{formatCurrency(txn.running_balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
