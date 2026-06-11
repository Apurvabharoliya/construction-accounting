import { supabase } from '@/lib/supabase'
import type { Party } from '@/types/database'
import { deleteSale } from './sales'
import { deletePurchase } from './purchases'

export async function getParties(filters?: {
  type?: string
  search?: string
}) {
  let query = supabase
    .from('parties')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.type && filters.type !== 'all') {
    query = query.eq('party_type', filters.type)
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,gstin.ilike.%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Party[]
}

export async function getParty(id: string) {
  const { data, error } = await supabase
    .from('parties')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Party
}

export async function createParty(party: Omit<Party, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('parties')
    .insert([party])
    .select()
    .single()

  if (error) throw error
  return data as Party
}

export async function updateParty(id: string, party: Partial<Party>) {
  const { data, error } = await supabase
    .from('parties')
    .update({ ...party, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Party
}

export async function deleteParty(id: string, partyType?: string) {
  // Fetch party type if not provided
  if (!partyType) {
    const { data: party } = await supabase
      .from('parties')
      .select('party_type')
      .eq('id', id)
      .single()
    partyType = party?.party_type
  }

  // Cascade delete related sales (party is a client)
  if (partyType === 'client') {
    const { data: sales } = await supabase
      .from('sales')
      .select('id')
      .eq('client_id', id)

    if (sales && sales.length > 0) {
      for (const sale of sales) {
        await deleteSale(sale.id)
      }
    }
  }

  // Cascade delete related purchases (party is a supplier)
  if (partyType === 'supplier') {
    const { data: purchases } = await supabase
      .from('purchases')
      .select('id')
      .eq('supplier_id', id)

    if (purchases && purchases.length > 0) {
      for (const purchase of purchases) {
        await deletePurchase(purchase.id)
      }
    }
  }

  // Delete related transactions (for any remaining party type)
  await supabase.from('transactions').delete().eq('party_id', id)
  
  // Delete related beneficiaries
  await supabase.from('beneficiaries').delete().eq('party_id', id)

  const { error } = await supabase
    .from('parties')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function searchParties(query: string, limit: number = 10) {
  const { data, error } = await supabase
    .from('parties')
    .select('id, name, phone, party_type, gstin')
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%,gstin.ilike.%${query}%`)
    .limit(limit)

  if (error) throw error
  return data as Party[]
}
