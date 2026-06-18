'use client'

import { useEffect, useState } from 'react'
import { getAllVillageSummaries, getMaterialTransactions } from '@/lib/api/villages'
import { VILLAGES, MATERIALS } from '@/lib/village-constants'
import type { MaterialTransaction } from '@/lib/village-constants'
import { formatDate, formatDateTime } from '@/lib/date'
import { Plus, Warehouse, Truck, Building2, HardHat, ArrowRight, Clock, Package, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/gst'

const villageIcons: Record<string, React.ReactNode> = {
  Varnama: <Building2 className="w-8 h-8" />,
  Dharapura: <Warehouse className="w-8 h-8" />,
  Dodhka: <HardHat className="w-8 h-8" />,
  Rayka: <Truck className="w-8 h-8" />,
  Talsad: <Package className="w-8 h-8" />,
}

const villageColors: Record<string, string> = {
  Varnama: 'from-blue-500 to-blue-600',
  Dharapura: 'from-emerald-500 to-emerald-600',
  Dodhka: 'from-orange-500 to-orange-600',
  Rayka: 'from-purple-500 to-purple-600',
  Talsad: 'from-rose-500 to-rose-600',
}

const lightColors: Record<string, string> = {
  Varnama: 'bg-blue-50 text-blue-700 border-blue-200',
  Dharapura: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Dodhka: 'bg-orange-50 text-orange-700 border-orange-200',
  Rayka: 'bg-purple-50 text-purple-700 border-purple-200',
  Talsad: 'bg-rose-50 text-rose-700 border-rose-200',
}

export default function VillagesPage() {
  const [summaries, setSummaries] = useState<any[]>([])
  const [transactions, setTransactions] = useState<MaterialTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [summariesData, txnData] = await Promise.all([
        getAllVillageSummaries(),
        getMaterialTransactions(undefined, 20)
      ])
      setSummaries(summariesData)
      setTransactions(txnData)
    } catch (error) {
      console.error('Error loading villages data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Villages</h1>
          <p className="text-gray-500 text-sm mt-1">Construction material inventory across all sites</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Village Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {VILLAGES.map((village) => {
              const summary = summaries.find(s => s.village === village)
              return (
                <Link key={village} href={`/villages/${village.toLowerCase()}`}>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group overflow-hidden">
                    {/* Village Header */}
                    <div className={`bg-gradient-to-r ${villageColors[village]} p-4 text-white`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="opacity-90">
                          {villageIcons[village]}
                        </div>
                        <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0" />
                      </div>
                      <h3 className="font-bold text-lg">{village}</h3>
                      {summary && (
                        <p className="text-xs text-white/80 mt-0.5">
                          {summary.recentTransactions} transaction{summary.recentTransactions !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Materials</span>
                        <span className="font-semibold text-gray-900">{MATERIALS.length} types</span>
                      </div>
                      {summary ? (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Total In</span>
                            <span className="font-semibold text-green-600">{summary.totalReceived.toFixed(0)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm border-t pt-2 mt-1">
                            <span className="text-gray-500 font-medium">Remaining</span>
                            <span className="font-bold text-blue-600">{summary.totalRemaining.toFixed(0)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-400 text-center py-2">
                          No data yet
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Recent Material Transactions */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-gray-700" />
                  <h2 className="text-lg font-semibold">Recent Material Movements</h2>
                </div>
                <span className="text-xs text-gray-400">{transactions.length} entries</span>
              </div>
            </div>

            {transactions.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No material movements yet</p>
                <p className="text-gray-400 text-sm mt-1">Click on a village to start tracking materials</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full responsive-table-card">
                  <thead>
                    <tr className="text-left bg-gray-50">
                      <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap">Date</th>
                      <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap">Village</th>
                      <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap">Material</th>
                      <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap">Type</th>
                      <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap">Quantity</th>
                      <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap hidden md:table-cell">Contractor</th>
                      <th className="p-4 text-sm font-medium text-gray-500 whitespace-nowrap hidden md:table-cell">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn) => (
                      <tr key={txn.id} className="border-t hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-sm" data-label="Date">
                          {formatDate(txn.transaction_date)}
                          <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(txn.created_at)}</div>
                        </td>
                        <td className="p-4" data-label="Village">
                          <Link
                            href={`/villages/${txn.village_name.toLowerCase()}`}
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${lightColors[txn.village_name] || 'bg-gray-50 text-gray-600 border-gray-200'}`}
                          >
                            {txn.village_name}
                          </Link>
                        </td>
                        <td className="p-4 text-sm font-medium" data-label="Material">{txn.material_name}</td>
                        <td className="p-4" data-label="Type">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            txn.transaction_type === 'receipt'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {txn.transaction_type === 'receipt' ? 'Receipt' : 'Usage'}
                          </span>
                        </td>
                        <td className={`p-4 text-sm font-semibold ${
                          txn.transaction_type === 'receipt' ? 'text-green-600' : 'text-orange-600'
                        }`} data-label="Quantity">
                          {txn.transaction_type === 'receipt' ? '+' : '-'}{txn.quantity}
                        </td>
                        <td className="p-4 text-sm text-gray-500 hidden md:table-cell" data-label="Contractor">
                          {txn.contractor_name || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="p-4 text-sm text-gray-500 max-w-[150px] truncate hidden md:table-cell" data-label="Notes">
                          {txn.notes || <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
