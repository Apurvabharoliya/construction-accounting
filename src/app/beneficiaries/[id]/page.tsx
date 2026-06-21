'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, IdCard, Trash2, Receipt, TrendingDown, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/gst'
import { formatDate, formatDateTime } from '@/lib/date'
import { deleteBeneficiary } from '@/lib/api/beneficiaries'
import { toast } from 'sonner'

export default function BeneficiaryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [beneficiary, setBeneficiary] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
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

      // Fetch transactions for this beneficiary's party
      if (data?.party_id) {
        const { data: txnData } = await supabase
          .from('transactions')
          .select('*')
          .eq('party_id', data.party_id)
          .order('transaction_date', { ascending: true })
          .order('created_at', { ascending: true })

        setTransactions(txnData || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-7 w-48 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 max-w-md space-y-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!beneficiary) {
    return <div className="text-center py-12"><p className="text-gray-500">Beneficiary not found</p></div>
  }

  // Financial calculations
  const amountDue = Number(beneficiary.total_amount_due) || 0
  const amountReceived = Number(beneficiary.total_amount_received) || 0
  const netBalance = amountDue - amountReceived
  const totalPlinth = Number(beneficiary.plinth) || 0
  const totalLintel = Number(beneficiary.lintel) || 0
  const totalRoof = Number(beneficiary.roof) || 0
  const totalFinishing = Number(beneficiary.finishing) || 0
  const totalStages = totalPlinth + totalLintel + totalRoof + totalFinishing

  // Calculate running balance from transactions
  let runningBal = 0
  const txnsWithBalance = transactions.map(txn => {
    runningBal = runningBal + Number(txn.debit) - Number(txn.credit)
    return { ...txn, running_balance: runningBal }
  })

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/beneficiaries')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{beneficiary.party?.name}</h1>
          <p className="text-gray-500 text-sm">
            {beneficiary.application_number ? `App: ${beneficiary.application_number}` : 'Beneficiary'}
            {beneficiary.party?.address && ` • ${beneficiary.party.address}`}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => {
            if (confirm(`Are you sure you want to delete ${beneficiary.party?.name}?`)) {
              deleteBeneficiary(beneficiary.id).then(() => {
                toast.success('Beneficiary deleted')
                router.push('/beneficiaries')
              }).catch((e: any) => toast.error(e.message))
            }
          }} className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
          <span className="text-xs text-gray-400 italic px-2">Edit inline on list page</span>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-orange-500">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Due</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(amountDue)}</p>
          <p className="text-xs text-gray-400 mt-1">Opening balance + additions</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Received</p>
          <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(amountReceived)}</p>
          <p className="text-xs text-gray-400 mt-1">{transactions.length} transaction(s) recorded</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Net Balance</p>
          <p className={`text-xl font-bold mt-1 ${netBalance > 0 ? 'text-red-600' : netBalance < 0 ? 'text-green-600' : 'text-gray-900'}`}>
            {formatCurrency(Math.abs(netBalance))}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {netBalance > 0 ? 'Balance Due (Dr)' : netBalance < 0 ? 'Overpaid (Cr)' : 'Settled'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Beneficiary Details */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <IdCard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Beneficiary Details</h3>
              <p className="text-sm text-gray-500">Personal & scheme information</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Name</span>
              <span className="font-medium">{beneficiary.party?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Beneficiary Number</span>
              <span className="font-medium">{beneficiary.beneficiary_number || 'N/A'}</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Application Number</span>
              <span className="font-medium">{beneficiary.application_number || 'N/A'}</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Subsidy Status</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                beneficiary.subsidy_status === 'approved' ? 'bg-green-100 text-green-800' :
                beneficiary.subsidy_status === 'disbursed' ? 'bg-blue-100 text-blue-800' :
                beneficiary.subsidy_status === 'received' ? 'bg-purple-100 text-purple-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>{beneficiary.subsidy_status?.charAt(0).toUpperCase() + beneficiary.subsidy_status?.slice(1) || 'Pending'}</span>
            </div>
            {beneficiary.party?.address && (
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Village/Address</span>
                <span className="font-medium">{beneficiary.party.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Construction Stages Breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Construction Stages</h3>
              <p className="text-sm text-gray-500">Stage-wise amount breakdown</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Plinth</span>
              <span className="font-medium">{formatCurrency(totalPlinth)}</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Lintel</span>
              <span className="font-medium">{formatCurrency(totalLintel)}</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Roof</span>
              <span className="font-medium">{formatCurrency(totalRoof)}</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Finishing</span>
              <span className="font-medium">{formatCurrency(totalFinishing)}</span>
            </div>
            <div className="flex justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
              <span className="font-semibold text-gray-700">Total Stages</span>
              <span className="font-bold text-blue-700">{formatCurrency(totalStages)}</span>
            </div>
            <div className="flex justify-between p-3 bg-green-50 rounded-lg border border-green-100">
              <span className="font-semibold text-gray-700">Amount Received</span>
              <span className="font-bold text-green-600">{formatCurrency(amountReceived)}</span>
            </div>
            <div className="flex justify-between p-3 bg-red-50 rounded-lg border border-red-100">
              <span className="font-semibold text-gray-700">Outstanding Balance</span>
              <span className={`font-bold ${netBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(Math.abs(netBalance))}
                {netBalance > 0 ? ' Dr' : netBalance < 0 ? ' Cr' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold">Transaction History</h3>
            </div>
            <span className="text-xs text-gray-400">{transactions.length} entries</span>
          </div>
        </div>

        {txnsWithBalance.length === 0 ? (
          <div className="p-8 text-center">
            <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No transactions recorded yet</p>
            <p className="text-gray-400 text-xs mt-1">Transactions will appear once payments or receipts are recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3 pl-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="p-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Debit (₹)</th>
                  <th className="p-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Credit (₹)</th>
                  <th className="p-3 pr-5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {txnsWithBalance.map((txn: any) => (
                  <tr key={txn.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3 pl-5 text-sm text-gray-600 whitespace-nowrap">{formatDate(txn.transaction_date)}</td>
                    <td className="p-3 text-sm text-gray-700 max-w-[250px] truncate">{txn.description || '—'}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        txn.transaction_type === 'receipt' || txn.transaction_type === 'payment'
                          ? 'bg-green-50 text-green-700'
                          : txn.transaction_type === 'sale'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {txn.transaction_type === 'receipt' || txn.transaction_type === 'payment' ? (
                          <><TrendingDown className="w-3 h-3" /> Receipt</>
                        ) : txn.transaction_type === 'sale' ? (
                          <><TrendingUp className="w-3 h-3" /> Sale</>
                        ) : (
                          txn.transaction_type
                        )}
                      </span>
                    </td>
                    <td className="p-3 text-sm font-medium text-right text-red-600 whitespace-nowrap">
                      {txn.debit > 0 ? formatCurrency(txn.debit) : '—'}
                    </td>
                    <td className="p-3 text-sm font-medium text-right text-green-600 whitespace-nowrap">
                      {txn.credit > 0 ? formatCurrency(txn.credit) : '—'}
                    </td>
                    <td className="p-3 pr-5 text-sm font-semibold text-right whitespace-nowrap border-l-2 border-gray-200">
                      <span className={txn.running_balance > 0 ? 'text-red-600' : txn.running_balance < 0 ? 'text-green-600' : 'text-gray-400'}>
                        {txn.running_balance === 0 ? '—' : (
                          <>{formatCurrency(Math.abs(txn.running_balance))}<span className="text-xs ml-0.5 font-normal">{txn.running_balance > 0 ? 'Dr' : 'Cr'}</span></>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Summary footer */}
              <tfoot>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-200">
                  <td className="p-3 pl-5 text-xs font-semibold text-gray-700" colSpan={2}>Totals</td>
                  <td className="p-3 text-xs text-gray-500">{txnsWithBalance.length} entries</td>
                  <td className="p-3 text-sm font-bold text-right text-red-600 whitespace-nowrap">
                    {formatCurrency(txnsWithBalance.reduce((s: number, t: any) => s + Number(t.debit), 0))}
                  </td>
                  <td className="p-3 text-sm font-bold text-right text-green-600 whitespace-nowrap">
                    {formatCurrency(txnsWithBalance.reduce((s: number, t: any) => s + Number(t.credit), 0))}
                  </td>
                  <td className="p-3 pr-5 text-sm font-bold text-right whitespace-nowrap border-l-2 border-gray-200">
                    <span className={netBalance > 0 ? 'text-red-600' : netBalance < 0 ? 'text-green-600' : 'text-gray-600'}>
                      {formatCurrency(Math.abs(netBalance))}
                      <span className="text-xs ml-0.5 font-normal">{netBalance > 0 ? 'Dr' : netBalance < 0 ? 'Cr' : ''}</span>
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
