import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/types/database'

export async function getPartyLedger(
  partyId: string,
  filters?: {
    startDate?: string
    endDate?: string
    type?: string
  }
) {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('party_id', partyId)
    .order('transaction_date', { ascending: true })

  if (filters?.startDate) {
    query = query.gte('transaction_date', filters.startDate)
  }
  if (filters?.endDate) {
    query = query.lte('transaction_date', filters.endDate)
  }
  if (filters?.type && filters.type !== 'all') {
    query = query.eq('transaction_type', filters.type)
  }

  const { data, error } = await query
  if (error) throw error

  // Calculate running balance
  let runningBalance = 0
  const ledgerWithBalance = (data || []).map((txn) => {
    runningBalance = runningBalance + Number(txn.debit) - Number(txn.credit)
    return {
      ...txn,
      running_balance: runningBalance
    }
  })

  return {
    transactions: ledgerWithBalance,
    currentBalance: runningBalance
  }
}

export async function getOutstandingReport() {
  // Get all parties with outstanding purchase balances
  const { data: purchases, error: purchasesError } = await supabase
    .from('purchases')
    .select('supplier_id, balance_due, supplier:parties!supplier_id(name, phone)')
    .gt('balance_due', 0)

  if (purchasesError) throw purchasesError

  // Get all parties with outstanding sales balances
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('client_id, balance_due, client:parties!client_id(name, phone)')
    .gt('balance_due', 0)

  if (salesError) throw salesError

  // Calculate totals per party
  const partyBalances: Record<string, { 
    payable: number; 
    receivable: number; 
    name: string; 
    phone: string 
  }> = {}

  purchases?.forEach((p: any) => {
    if (!partyBalances[p.supplier_id]) {
      partyBalances[p.supplier_id] = { payable: 0, receivable: 0, name: p.supplier?.name || 'Unknown', phone: p.supplier?.phone || '' }
    }
    partyBalances[p.supplier_id].payable += Number(p.balance_due)
  })

  sales?.forEach((s: any) => {
    if (!partyBalances[s.client_id]) {
      partyBalances[s.client_id] = { payable: 0, receivable: 0, name: s.client?.name || 'Unknown', phone: s.client?.phone || '' }
    }
    partyBalances[s.client_id].receivable += Number(s.balance_due)
  })

  return Object.entries(partyBalances).map(([partyId, data]) => ({
    partyId,
    ...data
  }))
}

export async function getDailySummary(date: string) {
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('total_amount, amount_received')
    .eq('invoice_date', date)

  if (salesError) throw salesError

  const { data: purchases, error: purchasesError } = await supabase
    .from('purchases')
    .select('total_amount, amount_paid')
    .eq('invoice_date', date)

  if (purchasesError) throw purchasesError

  return {
    date,
    totalSales: sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0,
    totalReceived: sales?.reduce((sum, s) => sum + Number(s.amount_received), 0) || 0,
    totalPurchases: purchases?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0,
    totalPaid: purchases?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0,
    netIncome: (sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0) - 
               (purchases?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0)
  }
}

export async function getMonthlySummary(year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('total_amount, amount_received')
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)

  if (salesError) throw salesError

  const { data: purchases, error: purchasesError } = await supabase
    .from('purchases')
    .select('total_amount, amount_paid')
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)

  if (purchasesError) throw purchasesError

  return {
    month: `${year}-${String(month).padStart(2, '0')}`,
    totalSales: sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0,
    totalReceived: sales?.reduce((sum, s) => sum + Number(s.amount_received), 0) || 0,
    totalPurchases: purchases?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0,
    totalPaid: purchases?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0,
    netIncome: (sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0) - 
               (purchases?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0)
  }
}

export async function getGstSummary(startDate: string, endDate: string) {
  // Get sales GST summary
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('cgst_amount, sgst_amount, igst_amount, total_amount')
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)

  if (salesError) throw salesError

  // Get purchases GST summary
  const { data: purchases, error: purchasesError } = await supabase
    .from('purchases')
    .select('cgst_amount, sgst_amount, igst_amount, total_amount')
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)

  if (purchasesError) throw purchasesError

  return {
    period: { startDate, endDate },
    outputGst: {
      cgst: sales?.reduce((sum, s) => sum + Number(s.cgst_amount), 0) || 0,
      sgst: sales?.reduce((sum, s) => sum + Number(s.sgst_amount), 0) || 0,
      igst: sales?.reduce((sum, s) => sum + Number(s.igst_amount), 0) || 0,
      total: sales?.reduce((sum, s) => sum + Number(s.cgst_amount) + Number(s.sgst_amount) + Number(s.igst_amount), 0) || 0
    },
    inputGst: {
      cgst: purchases?.reduce((sum, p) => sum + Number(p.cgst_amount), 0) || 0,
      sgst: purchases?.reduce((sum, p) => sum + Number(p.sgst_amount), 0) || 0,
      igst: purchases?.reduce((sum, p) => sum + Number(p.igst_amount), 0) || 0,
      total: purchases?.reduce((sum, p) => sum + Number(p.cgst_amount) + Number(p.sgst_amount) + Number(p.igst_amount), 0) || 0
    }
  }
}
