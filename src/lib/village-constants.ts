export const VILLAGES = [
  'Varnama',
  'Dharapura',
  'Dodhka',
  'Rayka',
  'Talsad'
] as const

export type VillageName = (typeof VILLAGES)[number]

export const MATERIALS = [
  'Bricks',
  'Sand/Reti',
  'Kapchi',
  'Cement',
  'Steel',
  'Door Frame'
] as const

export type MaterialName = (typeof MATERIALS)[number]

export const MATERIAL_CONTRACTORS: Record<string, string[]> = {
  'Bricks': ['Jigarbhai', 'Mohin Bha', 'Ah Pathan', 'Mehul bhai', 'Mohin Khan'],
  'Sand/Reti': ['Rutvik', '__other__'],
  'Kapchi': ['Nileshbhai', 'Chirag'],
  'Cement': ['Arjun Ultratech', 'Bipinbhai', 'Sameer Bhai', 'Pavan'],
  'Steel': ['VivekBhai', 'SameerBhai', 'Laitbhai'],
  'Door Frame': ['Mohan Bhai']
}

export function getContractorsForMaterial(material: string): string[] {
  return MATERIAL_CONTRACTORS[material] || []
}

export function hasOtherOption(material: string): boolean {
  return MATERIAL_CONTRACTORS[material]?.includes('__other__') ?? false
}

export interface VillageMaterialStock {
  id: string
  village_id: string
  material_name: string
  quantity_received: number
  quantity_used: number
  quantity_remaining: number
  updated_at: string
}

export interface MaterialTransaction {
  id: string
  village_name: string
  material_name: string
  transaction_type: 'receipt' | 'usage'
  quantity: number
  contractor_name: string | null
  reference_purchase_id: string | null
  notes: string | null
  transaction_date: string
  created_at: string
}
