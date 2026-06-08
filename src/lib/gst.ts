export interface GstCalculation {
  subtotal: number
  cgst: number
  sgst: number
  igst: number
  totalGst: number
  total: number
}

export function calculateGst(
  amount: number, 
  gstRate: number, 
  isInterState: boolean = false
): GstCalculation {
  const gstAmount = (amount * gstRate) / 100
  
  if (isInterState) {
    return {
      subtotal: amount,
      cgst: 0,
      sgst: 0,
      igst: gstAmount,
      totalGst: gstAmount,
      total: amount + gstAmount
    }
  }
  
  const halfGst = gstAmount / 2
  return {
    subtotal: amount,
    cgst: halfGst,
    sgst: halfGst,
    igst: 0,
    totalGst: gstAmount,
    total: amount + gstAmount
  }
}

export function calculateGstPerItem(
  quantity: number,
  rate: number,
  gstRate: number,
  isInterState: boolean = false
): { amount: number; cgst: number; sgst: number; igst: number; totalGst: number; total: number } {
  const amount = quantity * rate
  const gstAmount = (amount * gstRate) / 100
  
  if (isInterState) {
    return {
      amount,
      cgst: 0,
      sgst: 0,
      igst: gstAmount,
      totalGst: gstAmount,
      total: amount + gstAmount
    }
  }
  
  const halfGst = gstAmount / 2
  return {
    amount,
    cgst: halfGst,
    sgst: halfGst,
    igst: 0,
    totalGst: gstAmount,
    total: amount + gstAmount
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}


export const GST_RATES = [
  { value: 0, label: '0% (Nil Rated)' },
  { value: 0.25, label: '0.25% (Diamond)' },
  { value: 3, label: '3% (Gold)' },
  { value: 5, label: '5%' },
  { value: 12, label: '12%' },
  { value: 18, label: '18%' },
  { value: 28, label: '28%' },
]

export const UNITS = [
  'Nos', 'Kg', 'Qtl', 'Bag', 'Box', 'Litre', 'Metre', 
  'Sq.Ft', 'Cu.Ft', 'Pcs', 'Roll', 'Sheet', 'Bundle', 'Feet', 'Inch'
]

export const PAYMENT_MODES = [
  'Cash', 'Bank Transfer', 'UPI', 'NEFT', 'RTGS', 'Cheque', 'Card'
]

export const PARTY_TYPES = [
  { value: 'supplier', label: 'Supplier' },
  { value: 'client', label: 'Client' },
  { value: 'beneficiary', label: 'Beneficiary' },
  { value: 'debtor', label: 'Debtor' },
] as const
