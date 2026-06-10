'use client'

import { useState, useEffect } from 'react'
import { getOutstandingParties, type OutstandingParty } from '@/lib/api/dashboard'
import { formatCurrency } from '@/lib/gst'

let RechartsComponents: any = null
async function loadRecharts() {
  if (!RechartsComponents) RechartsComponents = await import('recharts')
  return RechartsComponents
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload as OutstandingParty
  return (
    <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100">
      <p className="font-semibold text-gray-800 text-sm mb-1">{item.name}</p>
      <div className="flex items-center gap-2 text-sm">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.type === 'supplier' ? '#f97316' : '#3b82f6' }} />
        <span className="text-gray-600">Outstanding:</span>
        <span className="font-medium">{formatCurrency(item.amount)}</span>
      </div>
      <p className="text-xs text-gray-400 mt-1 capitalize">{item.type}</p>
    </div>
  )
}

export default function OutstandingChart() {
  const [data, setData] = useState<OutstandingParty[]>([])
  const [loading, setLoading] = useState(true)
  const [Recharts, setRecharts] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])
  useEffect(() => { loadRecharts().then(setRecharts).catch(console.error) }, [])

  useEffect(() => {
    getOutstandingParties()
      .then(d => { setData(d); setLoading(false) })
      .catch(err => { console.error(err); setLoading(false) })
  }, [])

  const ready = mounted && Recharts && !loading

  if (!ready) {
    return <div className="w-full h-[300px] flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div></div>
  }

  if (data.length === 0) {
    return <div className="w-full h-[300px] flex items-center justify-center text-gray-500"><div className="text-center"><p className="text-lg font-medium">No outstanding balances</p><p className="text-sm mt-1">All payments are settled</p></div></div>
  }

  const { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } = Recharts

  const chartData = data.map(d => ({
    ...d,
    shortName: d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name
  }))

  return (
    <div className="w-full relative" style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value: number) => value >= 100000 ? `${(value / 100000).toFixed(1)}L` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : String(value)}
          />
          <YAxis type="category" dataKey="shortName" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} width={120} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="amount" fill="#94a3b8" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.type === 'supplier' ? '#f97316' : '#3b82f6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
