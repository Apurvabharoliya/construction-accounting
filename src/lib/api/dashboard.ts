import { supabase } from '@/lib/supabase'

export interface MonthlyData {
  month: string
  label: string
  purchases: number
  sales: number
  profit: number
}

export interface PaymentStatusData {
  name: string
  value: number
  color: string
}

export interface PartyVolume {
  name: string
  purchases: number
  sales: number
}

export interface OutstandingParty {
  name: string
  amount: number
  type: 'supplier' | 'client'
}

// Get monthly purchase vs sales data - ALL time (no date filter so sample data always shows)
export async function getMonthlyTrends(): Promise<MonthlyData[]> {
  const [purchasesRes, salesRes] = await Promise.all([
    supabase
      .from('purchases')
      .select('invoice_date, total_amount')
      .order('invoice_date', { ascending: true }),
    supabase
      .from('sales')
      .select('invoice_date, total_amount')
      .order('invoice_date', { ascending: true })
  ])

  // Check for query errors
  if (purchasesRes.error) console.error('Purchases query error:', purchasesRes.error)
  if (salesRes.error) console.error('Sales query error:', salesRes.error)

  const monthNames = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']

  // Initialize 12 months
  const monthlyMap: Record<string, { purchases: number; sales: number }> = {}
  monthNames.forEach((name) => {
    monthlyMap[name] = { purchases: 0, sales: 0 }
  })

  // Aggregate purchases by month
  purchasesRes.data?.forEach((p) => {
    const date = new Date(p.invoice_date)
    const monthIndex = date.getMonth()
    // Map to FY month: Apr=0, May=1, ..., Dec=8, Jan=9, Feb=10, Mar=11
    const fyMonthIndex = monthIndex >= 3 ? monthIndex - 3 : monthIndex + 9
    if (fyMonthIndex >= 0 && fyMonthIndex < 12) {
      monthlyMap[monthNames[fyMonthIndex]].purchases += Number(p.total_amount)
    }
  })

  // Aggregate sales by month
  salesRes.data?.forEach((s) => {
    const date = new Date(s.invoice_date)
    const monthIndex = date.getMonth()
    const fyMonthIndex = monthIndex >= 3 ? monthIndex - 3 : monthIndex + 9
    if (fyMonthIndex >= 0 && fyMonthIndex < 12) {
      monthlyMap[monthNames[fyMonthIndex]].sales += Number(s.total_amount)
    }
  })

  return monthNames.map((name) => ({
    month: name,
    label: name,
    purchases: Math.round(monthlyMap[name].purchases),
    sales: Math.round(monthlyMap[name].sales),
    profit: Math.round(monthlyMap[name].sales - monthlyMap[name].purchases)
  }))
}

// Get payment status distribution for purchases and sales
export async function getPaymentStatusData(): Promise<PaymentStatusData[]> {
  const [purchasesRes, salesRes] = await Promise.all([
    supabase.from('purchases').select('payment_status'),
    supabase.from('sales').select('payment_status')
  ])

  const counts = { paid: 0, partial: 0, unpaid: 0 }

  purchasesRes.data?.forEach((p) => {
    const status = p.payment_status as 'paid' | 'partial' | 'unpaid'
    if (status in counts) counts[status]++
  })

  salesRes.data?.forEach((s) => {
    const status = s.payment_status as 'paid' | 'partial' | 'unpaid'
    if (status in counts) counts[status]++
  })

  return [
    { name: 'Paid', value: counts.paid, color: '#22c55e' },
    { name: 'Partial', value: counts.partial, color: '#eab308' },
    { name: 'Unpaid', value: counts.unpaid, color: '#ef4444' }
  ]
}

// Get top parties by transaction volume
export async function getTopParties(): Promise<PartyVolume[]> {
  const [purchasesRes, salesRes] = await Promise.all([
    supabase.from('purchases').select('supplier_id, total_amount, supplier:parties!supplier_id(name)'),
    supabase.from('sales').select('client_id, total_amount, client:parties!client_id(name)')
  ])

  const partyMap: Record<string, { name: string; purchases: number; sales: number }> = {}

  purchasesRes.data?.forEach((p: any) => {
    const name = p.supplier?.name || 'Unknown'
    if (!partyMap[name]) partyMap[name] = { name, purchases: 0, sales: 0 }
    partyMap[name].purchases += Number(p.total_amount)
  })

  salesRes.data?.forEach((s: any) => {
    const name = s.client?.name || 'Unknown'
    if (!partyMap[name]) partyMap[name] = { name, purchases: 0, sales: 0 }
    partyMap[name].sales += Number(s.total_amount)
  })

  return Object.values(partyMap)
    .sort((a, b) => (b.purchases + b.sales) - (a.purchases + a.sales))
    .slice(0, 6)
}

// Get outstanding amounts by party (aggregated)
export async function getOutstandingParties(): Promise<OutstandingParty[]> {
  const [suppliersRes, clientsRes] = await Promise.all([
    supabase
      .from('purchases')
      .select('balance_due, supplier:parties!supplier_id(name)')
      .gt('balance_due', 0),
    supabase
      .from('sales')
      .select('balance_due, client:parties!client_id(name)')
      .gt('balance_due', 0)
  ])

  const partyMap: Record<string, { name: string; amount: number; type: 'supplier' | 'client' }> = {}

  suppliersRes.data?.forEach((p: any) => {
    const name = p.supplier?.name || 'Unknown'
    if (partyMap[name]) {
      partyMap[name].amount += Number(p.balance_due)
    } else {
      partyMap[name] = { name, amount: Number(p.balance_due), type: 'supplier' }
    }
  })

  clientsRes.data?.forEach((s: any) => {
    const name = s.client?.name || 'Unknown'
    if (partyMap[name]) {
      partyMap[name].amount += Number(s.balance_due)
    } else {
      partyMap[name] = { name, amount: Number(s.balance_due), type: 'client' }
    }
  })

  return Object.values(partyMap).sort((a, b) => b.amount - a.amount).slice(0, 8)
}
