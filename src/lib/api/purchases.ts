import { supabase } from '@/lib/supabase'
import type { Purchase, PurchaseItem } from '@/types/database'
import { getNextPurchaseNumber } from './sequence'

export async function getPurchases(filters?: {
  supplierId?: string
  startDate?: string
  endDate?: string
  status?: string
}) {
  let query = supabase
    .from('purchases')
    .select('*, supplier:parties!supplier_id(name, phone)')
    .order('invoice_date', { ascending: false })

  if (filters?.supplierId) {
    query = query.eq('supplier_id', filters.supplierId)
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

export async function getPurchase(id: string) {
  const { data, error } = await supabase
    .from('purchases')
    .select('*, supplier:parties!supplier_id(*), items:purchase_items(*)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createPurchase(
  purchase: Omit<Purchase, 'id' | 'created_at' | 'updated_at' | 'purchase_number'>,
  items: Omit<PurchaseItem, 'id' | 'purchase_id'>[]
) {
  // Get next sequential purchase number
  const purchaseNumber = await getNextPurchaseNumber()

  // Create purchase
  const { data: purchaseData, error: purchaseError } = await supabase
    .from('purchases')
    .insert([{
      ...purchase,
      purchase_number: purchaseNumber
    }])
    .select()
    .single()

  if (purchaseError) throw purchaseError

  // Create purchase items
  const itemsWithPurchaseId = items.map(item => ({
    ...item,
    purchase_id: purchaseData.id
  }))

  const { error: itemsError } = await supabase
    .from('purchase_items')
    .insert(itemsWithPurchaseId)

  if (itemsError) throw itemsError

  // Create transaction entry for the purchase (debit = amount owed to supplier)
  await supabase.from('transactions').insert([{
    party_id: purchase.supplier_id,
    transaction_type: 'purchase' as const,
    reference_id: purchaseData.id,
    reference_type: 'purchase',
    debit: purchase.total_amount,
    credit: 0,
    balance: purchase.total_amount,
    description: `Purchase ${purchaseNumber}`,
    transaction_date: purchase.invoice_date
  }])

  // If partial or full payment was made at the time of purchase, record a payment transaction
  if (purchase.amount_paid && purchase.amount_paid > 0) {
    await supabase.from('transactions').insert([{
      party_id: purchase.supplier_id,
      transaction_type: 'payment' as const,
      reference_id: purchaseData.id,
      reference_type: 'purchase',
      debit: 0,
      credit: purchase.amount_paid,
      balance: 0,
      description: `Payment for ${purchaseNumber}`,
      transaction_date: purchase.invoice_date
    }])
  }

  return purchaseData
}

export async function updatePurchase(
  id: string,
  purchase: Partial<Purchase>,
  items?: Omit<PurchaseItem, 'purchase_id'>[]
) {
  const { data, error } = await supabase
    .from('purchases')
    .update({ ...purchase, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  if (items) {
    await supabase.from('purchase_items').delete().eq('purchase_id', id)
    const itemsWithPurchaseId = items.map(item => ({ ...item, purchase_id: id }))
    await supabase.from('purchase_items').insert(itemsWithPurchaseId)
  }

  return data
}

export async function deletePurchase(id: string) {
  // First delete purchase items
  await supabase.from('purchase_items').delete().eq('purchase_id', id)
  
  // Delete related transactions
  await supabase.from('transactions').delete().eq('reference_id', id).eq('reference_type', 'purchase')

  const { error } = await supabase
    .from('purchases')
    .delete()
    .eq('id', id)

  if (error) throw error
}
