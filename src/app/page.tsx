'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  IndianRupee,
  HandHeart,
  CreditCard,
  FileText,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Plus,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/gst'
import { formatDate, formatDateTime } from '@/lib/date'

interface DashboardStats {
  totalSales: number
  totalPurchases: number
  totalParties: number
  outstandingAmount: number
  recentTransactions: any[]
  totalBeneficiaries: number
}

// ===== Animated counter component =====
function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: string; prefix?: string; suffix?: string }) {
  return (
    <span className="tabular-nums animate-count-up">
      {prefix}{value}{suffix}
    </span>
  )
}

// ===== Stat Card with construction theme =====
interface StatCardProps {
  title: string
  value: string
  icon: React.ElementType
  accent: 'amber' | 'blue' | 'green' | 'red' | 'purple'
  href: string
  trend?: 'up' | 'down'
  trendValue?: string
  subtitle?: string
  delay?: number
}

const accentConfig = {
  amber: { 
    gradient: 'from-[#c4841d] to-[#9a6515]', 
    bg: 'bg-[#d4a02b]/8', 
    iconBg: 'bg-[#d4a02b]/12', 
    iconColor: 'text-[#9a6515]',
    border: 'border-[#d4a02b]/20',
    text: 'text-[#9a6515]',
    light: 'from-[#d4a02b]/5 to-[#c4841d]/8'
  },
  blue: { 
    gradient: 'from-[#3b5998] to-[#2d4373]', 
    bg: 'bg-[#3b5998]/8', 
    iconBg: 'bg-[#3b5998]/12', 
    iconColor: 'text-[#2d4373]',
    border: 'border-[#3b5998]/20',
    text: 'text-[#2d4373]',
    light: 'from-[#3b5998]/5 to-[#3b5998]/8'
  },
  green: { 
    gradient: 'from-emerald-500 to-emerald-600', 
    bg: 'bg-emerald-50', 
    iconBg: 'bg-emerald-100', 
    iconColor: 'text-emerald-600',
    border: 'border-emerald-200/50',
    text: 'text-emerald-700',
    light: 'from-emerald-50 to-emerald-100/50'
  },
  red: { 
    gradient: 'from-red-500 to-red-600', 
    bg: 'bg-red-50', 
    iconBg: 'bg-red-100', 
    iconColor: 'text-red-600',
    border: 'border-red-200/50',
    text: 'text-red-700',
    light: 'from-red-50 to-red-100/50'
  },
  purple: { 
    gradient: 'from-[#6366f1] to-[#4f46e5]', 
    bg: 'bg-[#6366f1]/8', 
    iconBg: 'bg-[#6366f1]/12', 
    iconColor: 'text-[#4f46e5]',
    border: 'border-[#6366f1]/20',
    text: 'text-[#4f46e5]',
    light: 'from-[#6366f1]/5 to-[#6366f1]/8'
  },
}

function StatCard({ title, value, icon: Icon, accent, href, trend, trendValue, subtitle, delay = 0 }: StatCardProps) {
  const cfg = accentConfig[accent]
  
  return (
    <Link href={href} className={`animate-fade-in-up delay-${delay}`}>
      <div className={`group relative bg-white rounded-xl border ${cfg.border} p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden`}>
        {/* Top gradient line */}
        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${cfg.gradient} opacity-60`} />
        
        <div className="flex items-start justify-between relative z-10">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className={`text-xl md:text-2xl font-bold text-gray-900 mt-1.5 truncate ${value === '0' ? 'text-gray-900' : ''}`}>
              <AnimatedNumber value={value} />
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              {trend && trendValue && (
                <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                  trend === 'up' ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {trendValue}
                </span>
              )}
              {subtitle && (
                <span className="text-xs text-gray-400">{subtitle}</span>
              )}
            </div>
          </div>
          <div className={`${cfg.iconBg} p-3 rounded-xl group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 flex-shrink-0`}>
            <Icon className={`w-5 h-5 md:w-6 md:h-6 ${cfg.iconColor}`} />
          </div>
        </div>

        {/* Subtle hover shine effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute top-0 -left-20 w-40 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[20deg] animate-shimmer" />
        </div>
      </div>
    </Link>
  )
}

// ===== Quick Action Card =====
interface QuickActionProps {
  href: string
  icon: React.ElementType
  label: string
  description: string
  color: string
}

function QuickAction({ href, icon: Icon, label, description, color }: QuickActionProps) {
  const colorMap: Record<string, string> = {
    amber: 'bg-[#d4a02b]/10 text-[#9a6515] group-hover:bg-[#d4a02b]/20',
    blue: 'bg-[#3b5998]/10 text-[#2d4373] group-hover:bg-[#3b5998]/20',
    green: 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200',
    purple: 'bg-[#6366f1]/10 text-[#4f46e5] group-hover:bg-[#6366f1]/20',
  }
  
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-amber-200/50 hover:bg-amber-50/30 transition-all duration-200 group cursor-pointer active:scale-[0.98]">            <div className={`p-2.5 rounded-lg transition-all duration-200 group-hover:scale-110 ${colorMap[color] || 'bg-[#d4a02b]/10 text-[#9a6515] group-hover:bg-[#d4a02b]/20'}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500 truncate">{description}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500 transition-colors shrink-0" />
      </div>
    </Link>
  )
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

  const fetchDashboardStats = useCallback(async () => {
    try {
      const [salesRes, purchasesRes, outstandingRes, recentTxnsRes, partiesCountRes] = await Promise.all([
        supabase.from('sales').select('total_amount'),
        supabase.from('purchases').select('total_amount'),
        supabase.from('sales').select('balance_due').gt('balance_due', 0),
        (async () => {
          const [sales, purchases] = await Promise.all([
            supabase.from('sales')               .select('id, sale_number, invoice_date, created_at, total_amount, payment_status, beneficiary:parties!client_id(name)')
              .order('created_at', { ascending: false })
              .limit(5),
            supabase.from('purchases')
              .select('id, purchase_number, invoice_date, created_at, total_amount, payment_status, supplier:parties!supplier_id(name)')
              .order('created_at', { ascending: false })
              .limit(5)
          ])
          return { sales: sales.data || [], purchases: purchases.data || [] }
        })(),
        supabase.from('parties').select('*', { count: 'exact', head: true })
      ])

      const totalSales = salesRes.data?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0
      const totalPurchases = purchasesRes.data?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0
      const totalOutstanding = outstandingRes.data?.reduce((sum, o) => sum + Number(o.balance_due), 0) || 0

      const sales = recentTxnsRes.sales.map((s: any) => ({
        id: s.id,
        invoice_date: s.invoice_date,
        created_at: s.created_at,
        total_amount: s.total_amount,
        payment_status: s.payment_status,
        party_name: s.beneficiary?.name,
        invoice_number: s.sale_number,
        type: 'sale' as const
      }))
      const purchases = recentTxnsRes.purchases.map((p: any) => ({
        id: p.id,
        invoice_date: p.invoice_date,
        created_at: p.created_at,
        total_amount: p.total_amount,
        payment_status: p.payment_status,
        party_name: p.supplier?.name,
        invoice_number: p.purchase_number,
        type: 'purchase' as const
      }))
      const merged = [...sales, ...purchases]
        .sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime())
        .slice(0, 5)

      setStats({
        totalSales,
        totalPurchases,
        totalParties: partiesCountRes.count || 0,
        outstandingAmount: totalOutstanding,
        recentTransactions: merged,
        totalBeneficiaries: 0
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardStats()
  }, [fetchDashboardStats])

  const statCards = [
    {
      title: 'Total Sales',
      value: formatCurrency(stats.totalSales),
      icon: TrendingUp,
      accent: 'green' as const,
      href: '/villages',
      subtitle: 'Revenue from sales',
      delay: 0
    },
    {
      title: 'Total Purchases',
      value: formatCurrency(stats.totalPurchases),
      icon: ShoppingCart,
      accent: 'blue' as const,
      href: '/purchases',
      subtitle: 'Total procurement cost',
      delay: 100
    },
    {
      title: 'Net Profit',
      value: formatCurrency(stats.totalSales - stats.totalPurchases),
      icon: IndianRupee,
      accent: 'purple' as const,
      href: '/reports',
      trend: stats.totalSales >= stats.totalPurchases ? 'up' as const : 'down' as const,
      trendValue: `${(((stats.totalSales - stats.totalPurchases) / (stats.totalPurchases || 1)) * 100).toFixed(1)}%`,
      delay: 200
    },
    {
      title: 'Outstanding',
      value: formatCurrency(stats.outstandingAmount),
      icon: CreditCard,
      accent: 'red' as const,
      href: '/reports/outstanding',
      subtitle: `${stats.outstandingAmount > 0 ? 'Pending payments' : 'All settled'}`,
      delay: 300
    }
  ]

  return (
    <div className="space-y-6 construction-bg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-fade-in-up">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#c4841d] to-[#9a6515] rounded-xl flex items-center justify-center shadow-lg shadow-[#c4841d]/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-[oklch(0.52_0.01_85)] text-sm mt-0.5">Welcome back to your construction overview</p>
            </div>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-sm text-gray-400 font-medium">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            FY {new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1}-
            {new Date().getMonth() >= 3 ? new Date().getFullYear() + 1 : new Date().getFullYear()}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          {/* Stats cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-24 skeleton-shimmer rounded" />
                    <div className="h-8 w-32 skeleton-shimmer rounded" />
                    <div className="h-3 w-20 skeleton-shimmer rounded" />
                  </div>
                  <div className="w-12 h-12 skeleton-shimmer rounded-xl" />
                </div>
              </div>
            ))}
          </div>
          {/* Bottom section skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="h-5 w-32 skeleton-shimmer rounded mb-4" />
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 skeleton-shimmer rounded-xl" />
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
              <div className="h-5 w-40 skeleton-shimmer rounded mb-4" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 py-3 border-b border-gray-50 last:border-0">
                  <div className="h-4 w-20 skeleton-shimmer rounded" />
                  <div className="h-4 w-32 skeleton-shimmer rounded" />
                  <div className="h-4 w-24 skeleton-shimmer rounded ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <StatCard key={card.title} {...card} />
            ))}
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6 shadow-sm animate-fade-in-up delay-400">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Quick Actions</h2>
                <span className="text-xs text-gray-400">Shortcuts</span>
              </div>
              <div className="space-y-2">
                <QuickAction href="/purchases/new" icon={Plus} label="New Transaction" description="Record a purchase" color="amber" />
                <QuickAction href="/sales/new" icon={DollarSign} label="New Sale" description="Create a sale invoice" color="blue" />
                <QuickAction href="/parties/new" icon={Users} label="Add Vendor" description="Register a new supplier" color="green" />
                <QuickAction href="/beneficiaries/new" icon={HandHeart} label="Add Beneficiary" description="Register a beneficiary" color="purple" />
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">                  <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total Vendors</span>
                  <span className="font-semibold text-[#9a6515] bg-[#d4a02b]/8 px-2.5 py-0.5 rounded-full text-xs">
                    {stats.totalParties}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-4 md:p-6 shadow-sm animate-fade-in-up delay-500">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Recent Transactions</h2>
                <Link href="/reports" className="text-xs font-medium text-[#9a6515] hover:text-[#7a5010] hover:underline transition-colors inline-flex items-center gap-1">
                  View All <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {stats.recentTransactions.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="font-medium text-gray-500">No transactions yet</p>
                  <p className="text-sm text-gray-400 mt-1">Start by adding a purchase or visiting villages</p>
                  <Link href="/purchases/new" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-[#c4841d] text-white rounded-lg hover:bg-[#9a6515] transition-colors text-sm font-medium shadow-sm">
                    <Plus className="w-4 h-4" /> Record your first transaction
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 md:-mx-6">
                  <div className="inline-block min-w-full px-4 md:px-6">
                    <table className="w-full responsive-table-card">
                      <thead>
                        <tr className="text-left border-b border-gray-100">
                          <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap pr-4">Date</th>
                          <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap pr-4">Vendor</th>
                          <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap pr-4">Amount</th>
                          <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentTransactions.map((txn: any) => (
                          <tr key={txn.id} className="border-b border-gray-50 hover:bg-amber-50/20 transition-colors group">
                            <td className="py-3 text-sm text-gray-600 whitespace-nowrap pr-4" data-label="Date">
                              {formatDate(txn.invoice_date)}
                              <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(txn.created_at)}</div>
                            </td>
                            <td className="py-3 text-sm font-medium text-gray-900 whitespace-nowrap pr-4 truncate max-w-[120px] md:max-w-none" data-label="Vendor">
                              <span className="flex items-center gap-1.5">
                                {txn.party_name || 'N/A'}
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  txn.type === 'purchase' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                                }`}>
                                  {txn.type === 'purchase' ? 'Purchase' : 'Sale'}
                                </span>
                              </span>
                            </td>
                            <td className="py-3 text-sm font-semibold text-gray-900 whitespace-nowrap pr-4" data-label="Amount">
                              {formatCurrency(Number(txn.total_amount))}
                            </td>
                            <td className="py-3 whitespace-nowrap" data-label="Status">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${
                                txn.payment_status === 'paid' 
                                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' 
                                  : 'bg-red-50 text-red-700 ring-red-600/20'
                              }`}>
                                {txn.type === 'purchase'
                                  ? (txn.payment_status === 'paid' ? 'Payment' : 'Purchase')
                                  : (txn.payment_status === 'paid' ? 'Paid' : 'Unpaid')
                                }
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
