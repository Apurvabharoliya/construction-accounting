'use client'

import { useState, useEffect } from 'react'
import { getTopParties, type PartyVolume } from '@/lib/api/dashboard'
import { formatCurrency } from '@/lib/gst'

let RechartsComponents: any = null
async function loadRecharts() {
  if (!RechartsComponents) RechartsComponents = await import('recharts')
  return RechartsComponents
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
      <p className="font-semibold text-gray-800 text-sm mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function TopPartiesChart() {
  const [data, setData] = useState<PartyVolume[]>([])
  const [loading, setLoading] = useState(true)
  const [Recharts, setRecharts] = useState<any>(null)

  useEffect(() => { loadRecharts().then(setRecharts).catch(console.error) }, [])

  useEffect(() => {
    getTopParties()
      .then(d => { setData(d); setLoading(false) })
      .catch(err => { console.error(err); setLoading(false) })
  }, [])

  if (loading || !Recharts) {
    return <div className="flex items-center justify-center h-[300px]"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div></div>
  }

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-[300px] text-gray-500"><p className="text-sm">No party data available yet</p></div>
  }

  const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } = Recharts

  const chartData = data.map(d => ({
    ...d,
    shortName: d.name.length > 10 ? d.name.substring(0, 10) + '...' : d.name
  }))

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="shortName" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} />
          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value: number) => value >= 100000 ? `${(value / 100000).toFixed(1)}L` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : String(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" />
          <Bar dataKey="purchases" name="Vendors" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={35} />
          <Bar dataKey="sales" name="Sales" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={35} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
