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

  const transactions = data || []

  // Calculate running balance from oldest to newest, so balance accumulates top-to-bottom
  let runningBalance = 0
  const withRunningBalance = transactions.map((txn) => {
    runningBalance = runningBalance + Number(txn.debit) - Number(txn.credit)
    return {
      ...txn,
      running_balance: runningBalance
    }
  })

  // Return oldest-first so running balance accumulates from top (start) to bottom (final total)
  return {
    transactions: withRunningBalance,
    currentBalance: runningBalance
  }
}

export interface OutstandingInvoice {
  invoice_id: string
  invoice_number: string
  invoice_date: string
  type: 'purchase' | 'sale'
  total_amount: number
  amount_paid: number
  balance_due: number
  payment_status: 'paid' | 'unpaid'
  last_payment_date?: string
}

export interface OutstandingParty {
  partyId: string
  name: string
  phone: string
  payable: number
  receivable: number
  invoices: OutstandingInvoice[]
}

export async function getOutstandingReport(): Promise<OutstandingParty[]> {
  // Get all purchases with outstanding balances
  const { data: purchases, error: purchasesError } = await supabase
    .from('purchases')
    .select('id, purchase_number, invoice_date, total_amount, amount_paid, balance_due, payment_status, supplier_id, supplier:parties!supplier_id(name, phone)')
    .gt('balance_due', 0)
    .order('invoice_date', { ascending: false })

  if (purchasesError) throw purchasesError

  // Get all sales with outstanding balances
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('id, sale_number, invoice_date, total_amount, amount_received, balance_due, payment_status, client_id, client:parties!client_id(name, phone)')
    .gt('balance_due', 0)
    .order('invoice_date', { ascending: false })

  if (salesError) throw salesError

  // Group by party with invoice-level details
  const partyMap: Record<string, OutstandingParty> = {}

  purchases?.forEach((p: any) => {
    if (!partyMap[p.supplier_id]) {
      partyMap[p.supplier_id] = {
        partyId: p.supplier_id,
        name: p.supplier?.name || 'Unknown',
        phone: p.supplier?.phone || '',
        payable: 0,
        receivable: 0,
        invoices: []
      }
    }
    partyMap[p.supplier_id].payable += Number(p.balance_due)
    partyMap[p.supplier_id].invoices.push({
      invoice_id: p.id,
      invoice_number: p.purchase_number,
      invoice_date: p.invoice_date,
      type: 'purchase',
      total_amount: Number(p.total_amount),
      amount_paid: Number(p.amount_paid),
      balance_due: Number(p.balance_due),
      payment_status: p.payment_status
    })
  })

  sales?.forEach((s: any) => {
    if (!partyMap[s.client_id]) {
      partyMap[s.client_id] = {
        partyId: s.client_id,
        name: s.client?.name || 'Unknown',
        phone: s.client?.phone || '',
        payable: 0,
        receivable: 0,
        invoices: []
      }
    }
    partyMap[s.client_id].receivable += Number(s.balance_due)
    partyMap[s.client_id].invoices.push({
      invoice_id: s.id,
      invoice_number: s.sale_number,
      invoice_date: s.invoice_date,
      type: 'sale',
      total_amount: Number(s.total_amount),
      amount_paid: Number(s.amount_received),
      balance_due: Number(s.balance_due),
      payment_status: s.payment_status
    })
  })

  // Fetch last payment date for each invoice from transactions
  const allInvoiceIds = Object.values(partyMap).flatMap(p => p.invoices.map(i => i.invoice_id))
  if (allInvoiceIds.length > 0) {
    const { data: txns, error: txnError } = await supabase
      .from('transactions')
      .select('reference_id, transaction_date')
      .in('reference_id', allInvoiceIds)
      .in('transaction_type', ['payment', 'receipt'])
      .order('transaction_date', { ascending: false })

    if (!txnError && txns) {
      // Build a map of the most recent payment date per invoice
      const lastPaymentMap: Record<string, string> = {}
      txns.forEach((t: any) => {
        if (!lastPaymentMap[t.reference_id] || t.transaction_date > lastPaymentMap[t.reference_id]) {
          lastPaymentMap[t.reference_id] = t.transaction_date
        }
      })

      // Assign last payment date to each invoice
      Object.values(partyMap).forEach(p => {
        p.invoices.forEach(inv => {
          if (lastPaymentMap[inv.invoice_id]) {
            inv.last_payment_date = lastPaymentMap[inv.invoice_id]
          }
        })
      })
    }
  }

  // Sort parties by name and convert to array
  return Object.values(partyMap).sort((a, b) => a.name.localeCompare(b.name))
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
  payment_status: 'paid' | 'unpaid'
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

export async function recordInvoicePayment(
  invoiceId: string,
  invoiceType: 'purchase' | 'sale',
  payment: {
    amount: number
    payment_mode?: string
    payment_date: string
  },
  partyId: string
) {
  if (payment.amount <= 0) {
    throw new Error('Payment amount must be greater than 0')
  }

  if (invoiceType === 'purchase') {
    // Fetch current purchase
    const { data: purchase, error: fetchError } = await supabase
      .from('purchases')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (fetchError) throw fetchError
    if (!purchase) throw new Error('Purchase invoice not found')

    const newAmountPaid = Number(purchase.amount_paid) + payment.amount
    const newBalanceDue = Number(purchase.total_amount) - newAmountPaid
    
    // Determine new payment status
    const newStatus = newBalanceDue <= 0 ? 'paid' : 'unpaid'

    // Update purchase record
    const { error: updateError } = await supabase
      .from('purchases')
      .update({
        amount_paid: newAmountPaid,
        balance_due: Math.max(0, newBalanceDue),
        payment_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)

    if (updateError) throw updateError

    // Create payment transaction
    const { error: txnError } = await supabase.from('transactions').insert([{
      party_id: partyId,
      transaction_type: 'payment' as const,
      reference_id: invoiceId,
      reference_type: 'purchase',
      debit: 0,
      credit: payment.amount,
      balance: 0,
      description: `Payment for ${purchase.purchase_number}${payment.payment_mode ? ` via ${payment.payment_mode}` : ''}`,
      transaction_date: payment.payment_date,
      created_at: new Date().toISOString()
    }])

    if (txnError) throw txnError

    return { invoice_number: purchase.purchase_number, newStatus, newBalanceDue: Math.max(0, newBalanceDue) }
  } else {
    // Fetch current sale
    const { data: sale, error: fetchError } = await supabase
      .from('sales')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (fetchError) throw fetchError
    if (!sale) throw new Error('Sale invoice not found')

    const newAmountReceived = Number(sale.amount_received) + payment.amount
    const newBalanceDue = Number(sale.total_amount) - newAmountReceived

    // Determine new payment status
    const newStatus = newBalanceDue <= 0 ? 'paid' : 'unpaid'

    // Update sale record
    const { error: updateError } = await supabase
      .from('sales')
      .update({
        amount_received: newAmountReceived,
        balance_due: Math.max(0, newBalanceDue),
        payment_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)

    if (updateError) throw updateError

    // Create receipt transaction
    const { error: txnError } = await supabase.from('transactions').insert([{
      party_id: partyId,
      transaction_type: 'receipt' as const,
      reference_id: invoiceId,
      reference_type: 'sale',
      debit: payment.amount,
      credit: 0,
      balance: 0,
      description: `Receipt for ${sale.sale_number}${payment.payment_mode ? ` via ${payment.payment_mode}` : ''}`,
      transaction_date: payment.payment_date,
      created_at: new Date().toISOString()
    }])

    if (txnError) throw txnError

    return { invoice_number: sale.sale_number, newStatus, newBalanceDue: Math.max(0, newBalanceDue) }
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
