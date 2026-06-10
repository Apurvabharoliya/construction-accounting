'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  IndianRupee,
  HandHeart,
  CreditCard,
  FileText
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/gst'
import { formatDate } from '@/lib/date'
import TrendChart from '@/components/dashboard/TrendChart'
import ProfitLineChart from '@/components/dashboard/ProfitLineChart'
import PaymentStatusChart from '@/components/dashboard/PaymentStatusChart'
import OutstandingChart from '@/components/dashboard/OutstandingChart'
import TopPartiesChart from '@/components/dashboard/TopPartiesChart'

interface DashboardStats {
  totalSales: number
  totalPurchases: number
  totalParties: number
  outstandingAmount: number
  recentTransactions: any[]
  totalBeneficiaries: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalPurchases: 0,
    totalParties: 0,
    outstandingAmount: 0,
    recentTransactions: [],
    totalBeneficiaries: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  async function fetchDashboardStats() {
    try {
      const [salesRes, purchasesRes, partiesRes, outstandingRes, recentTransactionsRes, beneficiariesRes] = await Promise.all([
        supabase.from('sales').select('total_amount'),
        supabase.from('purchases').select('total_amount'),
        supabase.from('parties').select('*', { count: 'exact', head: true }),
        supabase.from('sales').select('balance_due').gt('balance_due', 0),
        supabase.from('sales')
          .select('*, client:parties!client_id(name)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('beneficiaries').select('*', { count: 'exact', head: true })
      ])

      const totalSales = salesRes.data?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0
      const totalPurchases = purchasesRes.data?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0
      const totalOutstanding = outstandingRes.data?.reduce((sum, o) => sum + Number(o.balance_due), 0) || 0

      setStats({
        totalSales,
        totalPurchases,
        totalParties: partiesRes.count || 0,
        outstandingAmount: totalOutstanding,
        recentTransactions: recentTransactionsRes.data || [],
        totalBeneficiaries: beneficiariesRes.count || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total Sales',
      value: formatCurrency(stats.totalSales),
      icon: TrendingUp,
      bgColor: 'bg-gradient-to-br from-green-50 to-emerald-50',
      iconColor: 'text-green-600',
      iconBg: 'bg-gradient-to-br from-green-100 to-green-200',
      href: '/sales',
      delay: 0
    },
    {
      title: 'Total Vendors',
      value: formatCurrency(stats.totalPurchases),
      icon: ShoppingCart,
      bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      iconColor: 'text-blue-600',
      iconBg: 'bg-gradient-to-br from-blue-100 to-blue-200',
      href: '/purchases',
      delay: 100
    },
    {
      title: 'Net Profit',
      value: formatCurrency(stats.totalSales - stats.totalPurchases),
      icon: IndianRupee,
      bgColor: 'bg-gradient-to-br from-purple-50 to-violet-50',
      iconColor: 'text-purple-600',
      iconBg: 'bg-gradient-to-br from-purple-100 to-purple-200',
      href: '/reports',
      delay: 200
    },
    {
      title: 'Outstanding',
      value: formatCurrency(stats.outstandingAmount),
      icon: CreditCard,
      bgColor: 'bg-gradient-to-br from-orange-50 to-amber-50',
      iconColor: 'text-orange-600',
      iconBg: 'bg-gradient-to-br from-orange-100 to-amber-200',
      href: '/reports/outstanding',
      delay: 300
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-100 rounded-full animate-spin border-t-blue-600" />
          </div>
          <p className="text-gray-500 text-sm font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1 duration-500">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome to your Construction Accounting App</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-sm text-gray-400">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            FY {new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1}-
            {new Date().getMonth() >= 3 ? new Date().getFullYear() + 1 : new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <div 
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${card.delay}ms`, animationFillMode: 'both' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-500">{card.title}</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1 truncate">{card.value}</p>
                </div>
                <div className={`${card.iconBg} p-3 rounded-xl group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 flex-shrink-0`}>
                  <card.icon className={`w-5 h-5 md:w-6 md:h-6 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base md:text-lg font-semibold text-gray-900">Vendors vs Sales</h2>
              <p className="text-xs md:text-sm text-gray-500 mt-0.5">Monthly comparison</p>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs text-gray-500">Vendors</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-500">Sales</span>
              </div>
            </div>
          </div>
          <TrendChart />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '250ms', animationFillMode: 'both' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base md:text-lg font-semibold text-gray-900">Net Profit Trend</h2>
              <p className="text-xs md:text-sm text-gray-500 mt-0.5">Monthly profit (Sales - Vendors)</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-xs text-gray-500">Profit</span>
            </div>
          </div>
          <ProfitLineChart />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          <div className="mb-4">
            <h2 className="text-base md:text-lg font-semibold text-gray-900">Payment Status</h2>
            <p className="text-xs md:text-sm text-gray-500 mt-0.5">Transaction breakdown</p>
          </div>
          <PaymentStatusChart />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
          <div className="mb-4">
            <h2 className="text-base md:text-lg font-semibold text-gray-900">Outstanding Balances</h2>
            <p className="text-xs md:text-sm text-gray-500 mt-0.5">Pending by party</p>
          </div>
          <OutstandingChart />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 animate-in fade-in slide-in-from-bottom-2 duration-500 md:col-span-2 lg:col-span-1" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
          <div className="mb-4">
            <h2 className="text-base md:text-lg font-semibold text-gray-900">Top Parties</h2>
            <p className="text-xs md:text-sm text-gray-500 mt-0.5">By transaction volume</p>
          </div>
          <TopPartiesChart />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '350ms', animationFillMode: 'both' }}>
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/purchases/new', icon: ShoppingCart, color: 'blue', label: 'New Vendor' },
              { href: '/sales/new', icon: TrendingUp, color: 'green', label: 'New Sale' },
              { href: '/parties/new', icon: Users, color: 'purple', label: 'Add Party' },
              { href: '/beneficiaries/new', icon: HandHeart, color: 'orange', label: 'Beneficiary' },
            ].map((action, i) => (
              <Link key={action.label} href={action.href}>
                <div className="flex flex-col items-center p-3 md:p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-500/50 hover:bg-blue-50/50 transition-all duration-200 group cursor-pointer active:scale-95">
                  <div className={`bg-${action.color}-100 p-2.5 md:p-3 rounded-xl group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300`}>
                    <action.icon className={`w-5 h-5 md:w-6 md:h-6 text-${action.color}-600`} />
                  </div>
                  <span className="text-xs md:text-sm font-medium mt-2 text-gray-700 text-center">{action.label}</span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total Parties</span>
              <span className="font-semibold text-gray-900">{stats.totalParties}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-500">Beneficiaries</span>
              <span className="font-semibold text-gray-900">{stats.totalBeneficiaries}</span>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '450ms', animationFillMode: 'both' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-lg font-semibold text-gray-900">Recent Transactions</h2>
            <Link href="/reports" className="text-xs md:text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors">
              View All →
            </Link>
          </div>
          <div className="overflow-x-auto -mx-4 md:-mx-6">
            <div className="inline-block min-w-full px-4 md:px-6">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-gray-100">
                    <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap pr-4">Date</th>
                    <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap pr-4">Party</th>
                    <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap pr-4">Amount</th>
                    <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-gray-500">
                        <FileText className="w-10 h-10 md:w-12 md:h-12 text-gray-300 mx-auto mb-3" />
                        <p className="font-medium">No transactions yet</p>
                        <p className="text-sm mt-1">Start by adding a purchase or sale</p>
                      </td>
                    </tr>
                  ) : (
                    stats.recentTransactions.map((txn: any, i: number) => (
                      <tr key={txn.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors animate-in fade-in" style={{ animationDelay: `${500 + i * 80}ms`, animationFillMode: 'both' }}>
                        <td className="py-3 text-sm text-gray-600 whitespace-nowrap pr-4">{formatDate(txn.invoice_date)}</td>
                        <td className="py-3 text-sm font-medium text-gray-900 whitespace-nowrap pr-4 truncate max-w-[120px] md:max-w-none">{txn.client?.name || 'N/A'}</td>
                        <td className="py-3 text-sm font-semibold text-gray-900 whitespace-nowrap pr-4">
                          {formatCurrency(Number(txn.total_amount))}
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            txn.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                            txn.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {txn.payment_status.charAt(0).toUpperCase() + txn.payment_status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
