'use client'

import { useState, useEffect } from 'react'
import { getMonthlyTrends, type MonthlyData } from '@/lib/api/dashboard'
import { formatCurrency } from '@/lib/gst'

let RechartsComponents: any = null
async function loadRecharts() {
  if (!RechartsComponents) RechartsComponents = await import('recharts')
  return RechartsComponents
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const value = payload[0].value
  return (
    <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      <div className="flex items-center gap-2 text-sm">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: value >= 0 ? '#22c55e' : '#ef4444' }} />
        <span className="text-gray-600">Net Profit:</span>
        <span className={`font-medium ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatCurrency(value)}
        </span>
      </div>
    </div>
  )
}

export default function ProfitLineChart() {
  const [data, setData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [Recharts, setRecharts] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])
  useEffect(() => { loadRecharts().then(setRecharts).catch(console.error) }, [])

  useEffect(() => {
    async function fetchData() {
      try {
        const trends = await getMonthlyTrends()
        setData(trends)
      } catch (err) {
        console.error('Failed to fetch profit data:', err)
        setError('Failed to load chart data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const ready = mounted && Recharts && !loading

  if (!ready && !error) {
    return (
      <div className="w-full h-[350px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (error) {
    return <div className="w-full h-[350px] flex items-center justify-center"><p className="text-red-500">{error}</p></div>
  }

  const hasData = data.some(d => d.profit !== 0)
  if (!hasData) {
    return (
      <div className="w-full h-[350px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 font-medium">No profit data available</p>
          <p className="text-gray-400 text-sm mt-1">Add transactions to see profit trends</p>
        </div>
      </div>
    )
  }

  const { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } = Recharts

  return (
    <div className="w-full relative" style={{ height: 350 }}>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} />
          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value: number) => value >= 100000 ? `${(value / 100000).toFixed(1)}L` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : String(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="profit" stroke="#8b5cf6" strokeWidth={3}
            dot={{ r: 5, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 7, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
