'use client'

import { useState, useEffect } from 'react'
import { getMonthlyTrends, type MonthlyData } from '@/lib/api/dashboard'
import { formatCurrency } from '@/lib/gst'

// Single dynamic import for all Recharts components
let RechartsComponents: any = null

async function loadRecharts() {
  if (!RechartsComponents) {
    RechartsComponents = await import('recharts')
  }
  return RechartsComponents
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
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

export default function TrendChart() {
  const [data, setData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [Recharts, setRecharts] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    async function init() {
      try {
        const rc = await loadRecharts()
        setRecharts(rc)
      } catch (err) {
        console.error('Failed to load Recharts:', err)
      }
    }
    init()
  }, [])

  useEffect(() => {
    async function fetchData() {
      try {
        const trends = await getMonthlyTrends()
        setData(trends)
      } catch (err) {
        console.error('Failed to fetch trend data:', err)
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
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 text-sm">Loading chart...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-[350px] flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  // Check if there's any data to show
  const hasData = data.some(d => d.purchases > 0 || d.sales > 0)

  if (!hasData) {
    return (
      <div className="w-full h-[350px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 font-medium">No data available for current period</p>
          <p className="text-gray-400 text-sm mt-1">Add purchases and sales to see trends</p>
        </div>
      </div>
    )
  }

  const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } = Recharts

  return (
    <div className="w-full relative" style={{ height: 350 }}>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value: number) => value >= 100000 ? `${(value / 100000).toFixed(1)}L` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : String(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="circle"
          />
          <Bar 
            dataKey="purchases" 
            name="Purchases" 
            fill="#3b82f6" 
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
          <Bar 
            dataKey="sales" 
            name="Sales" 
            fill="#22c55e" 
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
