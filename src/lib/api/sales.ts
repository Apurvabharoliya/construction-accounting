import { supabase } from '@/lib/supabase'
import type { Sale, SaleItem } from '@/types/database'
import { getNextSaleNumber } from './sequence'

export async function getSales(filters?: {
  clientId?: string
  startDate?: string
  endDate?: string
  status?: string
}) {
  let query = supabase
    .from('sales')
    .select('*, client:parties!client_id(name, phone)')
    .order('invoice_date', { ascending: false })

  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId)
  }
  if (filters?.startDate) {
    query = query.gte('invoice_date', filters.startDate)
  }
  if (filters?.endDate) {
    query = query.lte('invoice_date', filters.endDate)
  }
  if (filters?.status) {
    query = query.eq('payment_status', filters.status)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getSale(id: string) {
  const { data, error } = await supabase
    .from('sales')
    .select('*, client:parties!client_id(*), items:sale_items(*)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createSale(
  sale: Omit<Sale, 'id' | 'created_at' | 'updated_at' | 'sale_number'>,
  items: Omit<SaleItem, 'id' | 'sale_id'>[]
) {
  // Get next sequential sale/invoice number
  const saleNumber = await getNextSaleNumber()

  const { data: saleData, error: saleError } = await supabase
    .from('sales')
    .insert([{
      ...sale,
      sale_number: saleNumber
    }])
    .select()
    .single()

  if (saleError) throw saleError

  const itemsWithSaleId = items.map(item => ({
    ...item,
    sale_id: saleData.id
  }))

  const { error: itemsError } = await supabase
    .from('sale_items')
    .insert(itemsWithSaleId)

  if (itemsError) throw itemsError

  // Create transaction entry for the sale (credit = amount owed by client)
  await supabase.from('transactions').insert([{
    party_id: sale.client_id,
    transaction_type: 'sale' as const,
    reference_id: saleData.id,
    reference_type: 'sale',
    debit: 0,
    credit: sale.total_amount,
    balance: sale.total_amount,
    description: `Sale ${saleNumber}`,
    transaction_date: sale.invoice_date
  }])

  // If partial or full payment was received at the time of sale, record a receipt transaction
  if (sale.amount_received && sale.amount_received > 0) {
    await supabase.from('transactions').insert([{
      party_id: sale.client_id,
      transaction_type: 'receipt' as const,
      reference_id: saleData.id,
      reference_type: 'sale',
      debit: sale.amount_received,
      credit: 0,
      balance: 0,
      description: `Receipt for ${saleNumber}`,
      transaction_date: sale.invoice_date
    }])
  }

  return saleData
}

export async function updateSale(
  id: string,
  sale: Partial<Sale>,
  items?: Omit<SaleItem, 'sale_id'>[]
) {
  const { data, error } = await supabase
    .from('sales')
    .update({ ...sale, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  if (items) {
    await supabase.from('sale_items').delete().eq('sale_id', id)
    const itemsWithSaleId = items.map(item => ({ ...item, sale_id: id }))
    await supabase.from('sale_items').insert(itemsWithSaleId)
  }

  return data
}

export async function deleteSale(id: string) {
  // First delete sale items
  await supabase.from('sale_items').delete().eq('sale_id', id)
  
  // Delete related transactions
  await supabase.from('transactions').delete().eq('reference_id', id).eq('reference_type', 'sale')

  const { error } = await supabase
    .from('sales')
    .delete()
    .eq('id', id)

  if (error) throw error
}
