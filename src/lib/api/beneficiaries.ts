import { supabase } from '@/lib/supabase'
import type { Beneficiary, Party } from '@/types/database'

export async function getBeneficiaries(filters?: {
  subsidyStatus?: string
  search?: string
}) {
  let query = supabase
    .from('beneficiaries')
    .select('*, party:parties(*)')
    .order('created_at', { ascending: false })

  if (filters?.subsidyStatus && filters.subsidyStatus !== 'all') {
    query = query.eq('subsidy_status', filters.subsidyStatus)
  }

  if (filters?.search) {
    query = query.or(`party.name.ilike.%${filters.search}%,aadhaar_number.ilike.%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getBeneficiary(id: string) {
  const { data, error } = await supabase
    .from('beneficiaries')
    .select('*, party:parties(*)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createBeneficiary(
  partyData: Omit<Party, 'id' | 'created_at' | 'updated_at'>,
  beneficiaryData: Omit<Beneficiary, 'id' | 'party_id' | 'created_at' | 'updated_at'>
) {
  // Create party first
  const { data: party, error: partyError } = await supabase
    .from('parties')
    .insert([{ ...partyData, party_type: 'beneficiary' }])
    .select()
    .single()

  if (partyError) throw partyError

  // Create beneficiary record
  const { data: beneficiary, error: beneficiaryError } = await supabase
    .from('beneficiaries')
    .insert([{ ...beneficiaryData, party_id: party.id }])
    .select()
    .single()

  if (beneficiaryError) throw beneficiaryError

  return { party, beneficiary }
}

export async function updateBeneficiary(id: string, beneficiaryData: Partial<Beneficiary>) {
  const { data, error } = await supabase
    .from('beneficiaries')
    .update({ ...beneficiaryData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSubsidyStatus(
  id: string,
  status: Beneficiary['subsidy_status'],
  disbursementDate?: string
) {
  const updateData: Partial<Beneficiary> = {
    subsidy_status: status,
    updated_at: new Date().toISOString()
  }

  if (disbursementDate) {
    updateData.subsidy_disbursement_date = disbursementDate
  }

  const { data, error } = await supabase
    .from('beneficiaries')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteBeneficiary(id: string) {
  // Get the beneficiary to find the party_id
  const { data: beneficiary } = await supabase
    .from('beneficiaries')
    .select('party_id')
    .eq('id', id)
    .single()

  // Delete the beneficiary record
  const { error } = await supabase
    .from('beneficiaries')
    .delete()
    .eq('id', id)

  if (error) throw error

  // Delete the associated party record
  if (beneficiary?.party_id) {
    await supabase
      .from('parties')
      .delete()
      .eq('id', beneficiary.party_id)
  }

  return { success: true }
}

export async function getBeneficiaryTransactions(partyId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('party_id', partyId)
    .order('transaction_date', { ascending: false })

  if (error) throw error
  return data
}
