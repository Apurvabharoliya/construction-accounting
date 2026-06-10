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

export interface InvoiceSummary {
  id: string
  invoice_number: string
  invoice_date: string
  type: 'purchase' | 'sale'
  subtotal: number
  total_amount: number
  gst_rate: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  payment_mode?: string
  payment_status: 'paid' | 'partial' | 'unpaid'
  amount_paid: number
  balance_due: number
  remarks?: string
  items_count: number
  link: string
}

export async function getPartyInvoices(partyId: string, partyType: string): Promise<InvoiceSummary[]> {
  const invoices: InvoiceSummary[] = []

  // Fetch purchases if party is a supplier
  if (partyType === 'supplier') {
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select('*, items:purchase_items(count)')
      .eq('supplier_id', partyId)
      .order('invoice_date', { ascending: false })

    if (purchasesError) throw purchasesError

    purchases?.forEach((p: any) => {
      invoices.push({
        id: p.id,
        invoice_number: p.purchase_number,
        invoice_date: p.invoice_date,
        type: 'purchase',
        subtotal: Number(p.subtotal),
        total_amount: Number(p.total_amount),
        gst_rate: Number(p.gst_rate),
        cgst_amount: Number(p.cgst_amount),
        sgst_amount: Number(p.sgst_amount),
        igst_amount: Number(p.igst_amount),
        payment_mode: p.payment_mode,
        payment_status: p.payment_status,
        amount_paid: Number(p.amount_paid),
        balance_due: Number(p.balance_due),
        remarks: p.remarks,
        items_count: p.items?.[0]?.count || 0,
        link: `/purchases/${p.id}`
      })
    })
  }

  // Fetch sales if party is a client
  if (partyType === 'client') {
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*, items:sale_items(count)')
      .eq('client_id', partyId)
      .order('invoice_date', { ascending: false })

    if (salesError) throw salesError

    sales?.forEach((s: any) => {
      invoices.push({
        id: s.id,
        invoice_number: s.sale_number,
        invoice_date: s.invoice_date,
        type: 'sale',
        subtotal: Number(s.subtotal),
        total_amount: Number(s.total_amount),
        gst_rate: Number(s.gst_rate),
        cgst_amount: Number(s.cgst_amount),
        sgst_amount: Number(s.sgst_amount),
        igst_amount: Number(s.igst_amount),
        payment_mode: s.payment_mode,
        payment_status: s.payment_status,
        amount_paid: Number(s.amount_received),
        balance_due: Number(s.balance_due),
        remarks: s.remarks,
        items_count: s.items?.[0]?.count || 0,
        link: `/sales/${s.id}`
      })
    })
  }

  // Sort by date descending
  return invoices.sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime())
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
