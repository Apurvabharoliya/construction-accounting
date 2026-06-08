'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getPartyLedger } from '@/lib/api/ledger'
import { formatCurrency } from '@/lib/gst'
import { formatDate } from '@/lib/date'
import { ArrowLeft, Search } from 'lucide-react'
import Link from 'next/link'
import type { Party } from '@/types/database'

export default function LedgerReportPage() {
  const params = useParams()
  const router = useRouter()
  const [party, setParty] = useState<Party | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [currentBalance, setCurrentBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  useEffect(() => {
    if (params.partyId) {
      fetchData()
    }
  }, [params.partyId, dateRange])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch party
      const { data: partyData } = await supabase
        .from('parties')
        .select('*')
        .eq('id', params.partyId)
        .single()

      setParty(partyData)

      // Fetch ledger
      const ledgerData = await getPartyLedger(params.partyId as string, {
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined
      })
      setTransactions(ledgerData.transactions)
      setCurrentBalance(ledgerData.currentBalance)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/reports" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Party Ledger</h1>
          <p className="text-gray-500 text-sm mt-1">{party?.name || 'Loading...'} • {party?.party_type}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Current Balance</p>
          <p className={`text-xl font-bold ${currentBalance > 0 ? 'text-green-600' : currentBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {formatCurrency(currentBalance)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex gap-4">
          <input type="date" value={dateRange.start} onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm" />
          <input type="date" value={dateRange.end} onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left bg-gray-50">
                  <th className="p-4 text-sm font-medium text-gray-500">Date</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Description</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Type</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Debit (₹)</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Credit (₹)</th>
                  <th className="p-4 text-sm font-medium text-gray-500">Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-gray-500">No transactions found for this period</td></tr>
                ) : (
                  transactions.map((txn: any, i: number) => (
                    <tr key={txn.id} className={`border-t ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="p-4 text-sm">{formatDate(txn.transaction_date)}</td>
                      <td className="p-4 text-sm">{txn.description || '-'}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium capitalize bg-gray-100 text-gray-800">{txn.transaction_type}</span>
                      </td>
                      <td className="p-4 text-sm font-medium text-red-600">{txn.debit > 0 ? formatCurrency(txn.debit) : '-'}</td>
                      <td className="p-4 text-sm font-medium text-green-600">{txn.credit > 0 ? formatCurrency(txn.credit) : '-'}</td>
                      <td className="p-4 text-sm font-medium">{formatCurrency(txn.running_balance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
