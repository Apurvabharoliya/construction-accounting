'use client'

import { useState, useEffect } from 'react'
import { getPaymentStatusData, type PaymentStatusData } from '@/lib/api/dashboard'

let RechartsComponents: any = null
async function loadRecharts() {
  if (!RechartsComponents) RechartsComponents = await import('recharts')
  return RechartsComponents
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]
  return (
    <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100">
      <div className="flex items-center gap-2 text-sm">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.payload.color }} />
        <span className="font-medium">{data.name}:</span>
        <span>{data.value} transactions</span>
      </div>
    </div>
  )
}

function renderLabel(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  if (percent < 0.05) return null
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function PaymentStatusChart() {
  const [data, setData] = useState<PaymentStatusData[]>([])
  const [loading, setLoading] = useState(true)
  const [Recharts, setRecharts] = useState<any>(null)

  useEffect(() => { loadRecharts().then(setRecharts).catch(console.error) }, [])

  useEffect(() => {
    getPaymentStatusData().then(d => { setData(d); setLoading(false) })
      .catch(err => { console.error(err); setLoading(false) })
  }, [])

  if (loading || !Recharts) {
    return <div className="flex items-center justify-center h-[300px]"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div>
  }

  const { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } = Recharts
  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (total === 0) {
    return <div className="flex items-center justify-center h-[300px] text-gray-500"><p className="text-sm">No transactions yet</p></div>
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" labelLine={false} label={renderLabel}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} stroke="white" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" formatter={(value: string) => {
            const item = data.find(d => d.name === value)
            return `${value} (${item?.value || 0})`
          }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
