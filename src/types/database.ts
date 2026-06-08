export interface Party {
  id: string
  name: string
  phone?: string
  email?: string
  gstin?: string
  pan?: string
  address?: string
  city?: string
  state?: string
  pin_code?: string
  party_type: 'supplier' | 'client' | 'beneficiary' | 'debtor'
  opening_balance: number
  gst_registered: boolean
  bank_name?: string
  bank_account?: string
  ifsc_code?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Purchase {
  id: string
  purchase_number: string
  supplier_id: string
  invoice_date: string
  supplier_invoice_number?: string
  subtotal: number
  gst_rate: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  total_amount: number
  payment_mode?: string
  payment_status: 'paid' | 'partial' | 'unpaid'
  amount_paid: number
  balance_due: number
  remarks?: string
  created_at: string
  updated_at: string
}

export interface PurchaseItem {
  id: string
  purchase_id: string
  material_name: string
  hsn_code?: string
  quantity: number
  unit: string
  rate: number
  amount: number
  gst_rate: number
  gst_amount: number
}

export interface Sale {
  id: string
  sale_number: string
  client_id: string
  invoice_date: string
  subtotal: number
  gst_rate: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  total_amount: number
  payment_mode?: string
  payment_status: 'paid' | 'partial' | 'unpaid'
  amount_received: number
  balance_due: number
  remarks?: string
  created_at: string
  updated_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  item_name: string
  hsn_code?: string
  sac_code?: string
  quantity: number
  unit: string
  rate: number
  amount: number
  gst_rate: number
  gst_amount: number
}

export interface Beneficiary {
  id: string
  party_id: string
  aadhaar_number?: string
  property_address?: string
  subsidy_scheme?: string
  subsidy_amount_sanctioned?: number
  subsidy_status: 'pending' | 'approved' | 'disbursed' | 'received'
  subsidy_disbursement_date?: string
  construction_progress: number
  total_amount_received: number
  total_amount_due: number
  payment_installments: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  party_id: string
  transaction_type: 'purchase' | 'sale' | 'payment' | 'receipt' | 'subsidy'
  reference_id?: string
  reference_type?: string
  debit: number
  credit: number
  balance: number
  description?: string
  transaction_date: string
  created_at: string
}

export interface GstConfig {
  id: string
  hsn_code: string
  description: string
  gst_rate: number
  category?: string
  is_active: boolean
}

export interface BusinessSetting {
  id: string
  setting_key: string
  setting_value: string
  updated_at: string
}
