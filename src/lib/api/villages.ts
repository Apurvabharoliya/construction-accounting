import { supabase } from '@/lib/supabase'
import type { VillageMaterialStock, MaterialTransaction } from '@/lib/village-constants'

export async function getVillageMaterials(villageName: string): Promise<VillageMaterialStock[]> {
  const { data, error } = await supabase
    .from('village_materials')
    .select('*, villages!inner(name)')
    .eq('villages.name', villageName)
    .order('material_name')

  if (error) throw error
  return (data || []).map((d: any) => ({
    id: d.id,
    village_id: d.village_id,
    material_name: d.material_name,
    quantity_received: Number(d.quantity_received),
    quantity_used: Number(d.quantity_used),
    quantity_remaining: Number(d.quantity_remaining),
    updated_at: d.updated_at
  }))
}

export async function getAllVillageSummaries(): Promise<{
  village: string
  totalMaterials: number
  totalReceived: number
  totalUsed: number
  totalRemaining: number
  recentTransactions: number
}[]> {
  const { data: villages, error: vError } = await supabase
    .from('villages')
    .select('id, name')
    .order('name')

  if (vError) throw vError

  const summaries = await Promise.all(
    (villages || []).map(async (v: { id: string; name: string }) => {
      const [materialsRes, txnCountRes] = await Promise.all([
        supabase
          .from('village_materials')
          .select('quantity_received, quantity_remaining')
          .eq('village_id', v.id),
        supabase
          .from('material_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('village_name', v.name)
      ])

      const mats = (materialsRes.data || []) as any[]
      return {
        village: v.name,
        totalMaterials: mats.length,
        totalReceived: mats.reduce((s, m) => s + Number(m.quantity_received), 0),
        totalUsed: mats.reduce((s, m) => s + (Number(m.quantity_received) - Number(m.quantity_remaining)), 0),
        totalRemaining: mats.reduce((s, m) => s + Number(m.quantity_remaining), 0),
        recentTransactions: txnCountRes.count || 0
      }
    })
  )

  return summaries
}

export async function getMaterialTransactions(
  villageName?: string,
  limit: number = 50
): Promise<MaterialTransaction[]> {
  let query = supabase
    .from('material_transactions')
    .select('*')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (villageName) {
    query = query.eq('village_name', villageName)
  }

  const { data, error } = await query
  if (error) throw error

  return (data || []).map((d: any) => ({
    id: d.id,
    village_name: d.village_name,
    material_name: d.material_name,
    transaction_type: d.transaction_type as 'receipt' | 'usage',
    quantity: Number(d.quantity),
    contractor_name: d.contractor_name,
    reference_purchase_id: d.reference_purchase_id,
    notes: d.notes,
    transaction_date: d.transaction_date,
    created_at: d.created_at
  }))
}

export async function addMaterialReceipt(params: {
  village_name: string
  material_name: string
  quantity: number
  contractor_name?: string
  reference_purchase_id?: string
  notes?: string
  transaction_date: string
}) {
  // Insert material transaction
  const { data: txn, error: txnError } = await supabase
    .from('material_transactions')
    .insert([{
      village_name: params.village_name,
      material_name: params.material_name,
      transaction_type: 'receipt',
      quantity: params.quantity,
      contractor_name: params.contractor_name || null,
      reference_purchase_id: params.reference_purchase_id || null,
      notes: params.notes || null,
      transaction_date: params.transaction_date
    }])
    .select()
    .single()

  if (txnError) throw txnError

  // Update village_materials stock
  const { data: village } = await supabase
    .from('villages')
    .select('id')
    .eq('name', params.village_name)
    .single()

  if (village) {
    const { data: existing } = await supabase
      .from('village_materials')
      .select('*')
      .eq('village_id', village.id)
      .eq('material_name', params.material_name)
      .single()

    if (existing) {
      const newReceived = Number(existing.quantity_received) + params.quantity
      const usedQty = Number(existing.quantity_used) || 0
      const newRemaining = newReceived - usedQty
      await supabase
        .from('village_materials')
        .update({
          quantity_received: newReceived,
          quantity_remaining: newRemaining,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('village_materials')
        .insert([{
          village_id: village.id,
          material_name: params.material_name,
          quantity_received: params.quantity,
          quantity_used: 0,
          quantity_remaining: params.quantity
        }])
    }
  }

  return txn
}

export async function recordMaterialUsage(params: {
  village_name: string
  material_name: string
  quantity: number
  notes?: string
  transaction_date: string
}) {
  // Insert usage transaction
  const { data: txn, error: txnError } = await supabase
    .from('material_transactions')
    .insert([{
      village_name: params.village_name,
      material_name: params.material_name,
      transaction_type: 'usage',
      quantity: params.quantity,
      notes: params.notes || null,
      transaction_date: params.transaction_date
    }])
    .select()
    .single()

  if (txnError) throw txnError

  // Update village_materials stock
  const { data: village } = await supabase
    .from('villages')
    .select('id')
    .eq('name', params.village_name)
    .single()

  if (village) {
    const { data: existing } = await supabase
      .from('village_materials')
      .select('*')
      .eq('village_id', village.id)
      .eq('material_name', params.material_name)
      .single()

    if (existing) {
      // Calculate used quantity: if quantity_used column exists, use it; otherwise derive from received - remaining
      const existingUsed = existing.quantity_used !== undefined
        ? Number(existing.quantity_used)
        : Number(existing.quantity_received) - Number(existing.quantity_remaining)
      const newUsed = existingUsed + params.quantity
      const newRemaining = Number(existing.quantity_received) - newUsed
      const updateData: Record<string, any> = {
        quantity_remaining: Math.max(0, newRemaining),
        updated_at: new Date().toISOString()
      }
      // Only include quantity_used if the column exists in the table
      if (existing.quantity_used !== undefined) {
        updateData.quantity_used = newUsed
      }
      await supabase
        .from('village_materials')
        .update(updateData)
        .eq('id', existing.id)
    }
  }

  return txn
}
