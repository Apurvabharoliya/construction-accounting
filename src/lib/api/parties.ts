import { supabase } from '@/lib/supabase'
import type { Party } from '@/types/database'

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

export async function deleteParty(id: string) {
  // Delete related transactions
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
