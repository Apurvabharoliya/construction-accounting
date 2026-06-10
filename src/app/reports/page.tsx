'use client'

import { FileText, TrendingUp, ShoppingCart, IndianRupee, Calculator, Download } from 'lucide-react'
import Link from 'next/link'

const reportCards = [
  { title: 'Outstanding Report', description: 'View all pending payments from debtors and to creditors', icon: IndianRupee, href: '/reports/outstanding', color: 'bg-orange-500' },
  { title: 'Daily Summary', description: 'View transaction summary for a specific date', icon: FileText, href: '/reports/daily', color: 'bg-blue-500' },
  { title: 'Monthly Summary', description: 'Monthly profit/loss and transaction analysis', icon: TrendingUp, href: '/reports/monthly', color: 'bg-green-500' },
  { title: 'GST Summary', description: 'GST payable/receivable summary for filing', icon: Calculator, href: '/reports/gst', color: 'bg-purple-500' },
]

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 text-sm mt-1">View and export accounting reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className={`${card.color} p-3 rounded-lg`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{card.description}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Ledger Viewer */}
      <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
        <h2 className="text-base md:text-lg font-semibold mb-2 md:mb-4">Party Ledger</h2>
        <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">View transaction ledger for any party</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search for a party..."
            className="flex-1 px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm"
            onKeyDown={async (e: any) => {
              if (e.key === 'Enter' && e.target.value) {
                const results = await (await import('@/lib/api/parties')).searchParties(e.target.value)
                if (results && results.length > 0) {
                  window.location.href = `/reports/ledger/${results[0].id}`
                }
              }
            }}
          />
          <button className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
