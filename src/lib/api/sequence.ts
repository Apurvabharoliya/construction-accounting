import { supabase } from '@/lib/supabase'

/**
 * Generates the next sequential invoice number for a given type and financial year.
 * Works like official billing machines - queries the DB for the last used number
 * and increments it by 1.
 * 
 * Format: PREFIX-FY-SEQNO
 * Examples:
 *   - PUR-2425-0001 (First purchase of FY 2024-25)
 *   - PUR-2425-0042 (42nd purchase of FY 2024-25)
 *   - INV-2425-0001 (First sale invoice of FY 2024-25)
 *   - INV-2425-0123 (123rd sale invoice of FY 2024-25)
 */
export async function getNextInvoiceNumber(type: 'PUR' | 'INV'): Promise<string> {
  // Calculate current financial year (April to March)
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0 = January, 3 = April
  
  // Indian financial year: April to March
  const fyStart = currentMonth >= 3 ? currentYear : currentYear - 1
  const fyEnd = fyStart + 1
  const fy = `${fyStart.toString().slice(-2)}${fyEnd.toString().slice(-2)}`

  // Determine the table and column based on type
  const table = type === 'PUR' ? 'purchases' : 'sales'
  const column = type === 'PUR' ? 'purchase_number' : 'sale_number'
  const prefix = type

  // Query the last invoice number for this financial year
  // Using maybeSingle() to handle case when no invoices exist yet
  const { data: lastInvoice } = await supabase
    .from(table)
    .select(column)
    .like(column, `${prefix}-${fy}-%`)
    .order(column, { ascending: false })
    .limit(1)
    .maybeSingle()

  let nextSeqNo: number = 1
  let lastNumber: string | undefined

  if (lastInvoice) {
    // Extract using type-safe approach
    if (type === 'PUR') {
      lastNumber = (lastInvoice as any).purchase_number
    } else {
      lastNumber = (lastInvoice as any).sale_number
    }
    
    if (lastNumber) {
      const parts = lastNumber.split('-')
      const lastSeqNo = parseInt(parts[2], 10)
      if (!isNaN(lastSeqNo)) {
        nextSeqNo = lastSeqNo + 1
      }
    }
  }

  // Format: PREFIX-FY-SEQNO (zero-padded to 4 digits)
  return `${prefix}-${fy}-${String(nextSeqNo).padStart(4, '0')}`
}

/**
 * Get next purchase number
 */
export async function getNextPurchaseNumber(): Promise<string> {
  return getNextInvoiceNumber('PUR')
}

/**
 * Get next sale/invoice number
 */
export async function getNextSaleNumber(): Promise<string> {
  return getNextInvoiceNumber('INV')
}
