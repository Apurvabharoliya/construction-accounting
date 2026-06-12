import { supabase } from '@/lib/supabase'
import { getNextPurchaseNumber, getNextSaleNumber } from './api/sequence'

// =============================================
// Types
// =============================================

export interface ImportResult {
  success: boolean
  imported: number
  errors: string[]
  warnings: string[]
  entityType: string
}

export interface ParsedRow {
  row: number
  data: Record<string, string>
  valid: boolean
  error?: string
}

// =============================================
// Smart Column Mapping
// Matches any Excel header to the closest database field
// =============================================

interface ColumnDef {
  field: string
  aliases: string[]
  keywords: string[]
}

const PARTY_COLUMNS: ColumnDef[] = [
  { field: 'name', aliases: ['name', 'party name', 'full name', 'vendor name', 'supplier name', 'client name', 'customer name', 'beneficiary name', 'party'], keywords: ['name'] },
  { field: 'type', aliases: ['type', 'party type', 'vendor type', 'party_type', 'category', 'party category'], keywords: ['type', 'category'] },
  { field: 'phone', aliases: ['phone', 'mobile', 'contact', 'phone no', 'mobile no', 'telephone', 'phone number'], keywords: ['phone', 'mobile'] },
  { field: 'email', aliases: ['email', 'e-mail', 'email id', 'email address', 'email_id'], keywords: ['email'] },
  { field: 'gstin', aliases: ['gstin', 'gst no', 'gst number', 'gst', 'gstin no'], keywords: ['gstin', 'gst'] },
  { field: 'pan', aliases: ['pan', 'pan no', 'pan number', 'pan_no'], keywords: ['pan'] },
  { field: 'address', aliases: ['address', 'address line', 'street', 'location', 'full address'], keywords: ['address', 'street'] },
  { field: 'city', aliases: ['city', 'town', 'district', 'city/town'], keywords: ['city', 'town'] },
  { field: 'state', aliases: ['state', 'province', 'region'], keywords: ['state', 'province'] },
  { field: 'pin_code', aliases: ['pin code', 'pincode', 'pin', 'zip', 'zip code', 'postal code', 'pin_code'], keywords: ['pin', 'zip', 'postal'] },
  { field: 'opening_balance', aliases: ['opening balance', 'opening_balance', 'opening bal', 'balance', 'opening'], keywords: ['opening', 'opening balance'] },
  { field: 'gst_registered', aliases: ['gst registered', 'gst_registered', 'gst registration', 'registered'], keywords: ['gst registered', 'gst_registered'] },
  { field: 'notes', aliases: ['notes', 'remarks', 'note', 'comment', 'description', 'remarks/notes'], keywords: ['note', 'remark', 'comment'] },
]

const TRANSACTION_COLUMNS: ColumnDef[] = [
  { field: 'date', aliases: ['date', 'transaction date', 'txn date', 'entry date', 'posting date', 'value date', 'voucher date'], keywords: ['date'] },
  { field: 'description', aliases: ['description', 'particulars', 'narration', 'details', 'remarks', 'notes', 'remark', 'note', 'transaction description'], keywords: ['description', 'particular', 'narration'] },
  { field: 'debit', aliases: ['debit', 'debit amount', 'dr', 'debit/purchase', 'debit/ purchase', 'debit amount'], keywords: ['debit', 'dr'] },
  { field: 'credit', aliases: ['credit', 'credit amount', 'cr', 'credit/purchase', 'credit/ purchase', 'credit/payment', 'credit/ payment', 'credit amount'], keywords: ['credit', 'cr'] },
  { field: 'balance', aliases: ['balance', 'running balance', 'closing balance', 'bal', 'balance amount', 'total amount'], keywords: ['balance', 'bal', 'total'] },
  { field: 'party', aliases: ['party', 'party name', 'name', 'account name', 'ledger name', 'account', 'supplier', 'vendor', 'client', 'customer'], keywords: ['party', 'account', 'ledger'] },
  { field: 'voucher_type', aliases: ['voucher type', 'type', 'transaction type', 'voucher', 'txn type', 'voucher_type'], keywords: ['voucher', 'transaction type'] },
  { field: 'voucher_no', aliases: ['voucher no', 'voucher number', 'voucher no.', 'ref no', 'reference no', 'ref', 'cheque no', 'check no'], keywords: ['voucher', 'ref', 'cheque'] },
]

const PURCHASE_COLUMNS: ColumnDef[] = [
  { field: 'supplier_name', aliases: ['supplier name', 'vendor name', 'supplier', 'vendor', 'party name', 'name'], keywords: ['supplier', 'vendor'] },
  { field: 'invoice_date', aliases: ['invoice date', 'date', 'invoice_date', 'bill date', 'purchase date', 'transaction date'], keywords: ['date', 'invoice date'] },
  { field: 'supplier_invoice_no', aliases: ['supplier invoice no', 'supplier invoice number', 'invoice no', 'invoice number', 'inv no', 'bill no', 'bill number'], keywords: ['invoice no', 'invoice number', 'inv no', 'bill no'] },
  { field: 'material', aliases: ['material', 'item', 'item name', 'material name', 'product', 'product name', 'description', 'particulars', 'particular'], keywords: ['material', 'item', 'product', 'particular'] },
  { field: 'hsn', aliases: ['hsn', 'hsn code', 'hsn_code', 'hsn no', 'hsn/sac', 'hsn/sac code'], keywords: ['hsn'] },
  { field: 'quantity', aliases: ['quantity', 'qty', 'qty.', 'quantity nos', 'qty nos'], keywords: ['qty', 'quantity'] },
  { field: 'unit', aliases: ['unit', 'uom', 'measurement unit', 'measure', 'unit of measure'], keywords: ['unit', 'uom'] },
  { field: 'rate', aliases: ['rate', 'price', 'unit price', 'rate per unit', 'price per unit'], keywords: ['rate', 'price'] },
  { field: 'gst', aliases: ['gst', 'gst %', 'gst rate', 'gst_rate', 'gst%', 'tax', 'tax %', 'tax rate', 'tax_rate'], keywords: ['gst', 'tax'] },
  { field: 'payment_status', aliases: ['payment status', 'status', 'payment_status', 'pay status'], keywords: ['status', 'payment status'] },
  { field: 'payment_mode', aliases: ['payment mode', 'mode', 'payment method', 'payment_mode', 'pay mode', 'pay method'], keywords: ['mode', 'method', 'payment mode'] },
  { field: 'amount_paid', aliases: ['amount paid', 'paid amount', 'amount_paid', 'paid', 'payment amount'], keywords: ['paid', 'amount paid'] },
  { field: 'remarks', aliases: ['remarks', 'description', 'notes', 'remark', 'note', 'comment', 'description/remarks'], keywords: ['remark', 'note', 'comment', 'description'] },
]

const SALE_COLUMNS: ColumnDef[] = [
  { field: 'client_name', aliases: ['client name', 'customer name', 'client', 'customer', 'party name', 'name'], keywords: ['client', 'customer'] },
  { field: 'invoice_date', aliases: ['invoice date', 'date', 'invoice_date', 'bill date', 'sale date', 'transaction date'], keywords: ['date', 'invoice date'] },
  { field: 'item', aliases: ['item', 'item name', 'service', 'description', 'work', 'work description', 'particulars', 'particular'], keywords: ['item', 'service', 'work', 'particular'] },
  { field: 'hsn', aliases: ['hsn', 'hsn code', 'hsn_code', 'hsn/sac', 'hsn/sac code'], keywords: ['hsn'] },
  { field: 'sac', aliases: ['sac', 'sac code', 'sac_code', 'sac no', 'hsn/sac'], keywords: ['sac'] },
  { field: 'quantity', aliases: ['quantity', 'qty', 'qty.', 'quantity nos'], keywords: ['qty', 'quantity'] },
  { field: 'unit', aliases: ['unit', 'uom', 'measurement unit', 'measure'], keywords: ['unit', 'uom'] },
  { field: 'rate', aliases: ['rate', 'price', 'unit price', 'rate per unit'], keywords: ['rate', 'price'] },
  { field: 'gst', aliases: ['gst', 'gst %', 'gst rate', 'gst_rate', 'gst%', 'tax', 'tax %', 'tax rate'], keywords: ['gst', 'tax'] },
  { field: 'payment_status', aliases: ['payment status', 'status', 'payment_status', 'pay status'], keywords: ['status', 'payment status'] },
  { field: 'payment_mode', aliases: ['payment mode', 'mode', 'payment method', 'payment_mode', 'pay mode'], keywords: ['mode', 'method', 'payment mode'] },
  { field: 'amount_received', aliases: ['amount received', 'received amount', 'amount_received', 'received', 'receipt amount'], keywords: ['received', 'amount received'] },
  { field: 'remarks', aliases: ['remarks', 'description', 'notes', 'remark', 'note', 'comment'], keywords: ['remark', 'note', 'comment', 'description'] },
]

/**
 * Build a column map from the file's headers to standardized field names.
 * Uses the column definitions to match headers via exact aliases or keyword matching.
 */
function buildColumnMap(fileHeaders: string[], definitions: ColumnDef[]): Map<string, string> {
  const lowerHeaders = fileHeaders.map(h => h.toLowerCase().trim())
  const usedIndices = new Set<number>()
  const map = new Map<string, string>()

  for (const def of definitions) {
    // 1. Try exact alias match
    let found = false
    for (let i = 0; i < lowerHeaders.length; i++) {
      if (usedIndices.has(i)) continue
      if (def.aliases.includes(lowerHeaders[i])) {
        map.set(def.field, lowerHeaders[i])
        usedIndices.add(i)
        found = true
        break
      }
    }
    if (found) continue

    // 2. Try keyword/contains match (pick first unused header matching any keyword)
    for (let i = 0; i < lowerHeaders.length; i++) {
      if (usedIndices.has(i)) continue
      if (def.keywords.some(kw => lowerHeaders[i].includes(kw))) {
        map.set(def.field, lowerHeaders[i])
        usedIndices.add(i)
        found = true
        break
      }
    }
  }

  return map
}

/**
 * Get a field value from a row using the column map.
 * Returns empty string if the field wasn't mapped.
 */
function getField(row: Record<string, string>, columnMap: Map<string, string>, field: string): string {
  const header = columnMap.get(field)
  return header ? (row[header] || '') : ''
}

/**
 * Get column definitions for a given entity type
 */
export function getColumnDefs(type: EntityType): ColumnDef[] {
  switch (type) {
    case 'parties': return PARTY_COLUMNS
    case 'purchases': return PURCHASE_COLUMNS
    case 'sales': return SALE_COLUMNS
    case 'transactions': return TRANSACTION_COLUMNS
    default: return []
  }
}

/**
 * Build a column map for the given entity type and file headers.
 * Exported so the UI can show the matched mapping.
 */
export function buildColumnMapForType(headers: string[], type: EntityType): Map<string, string> {
  return buildColumnMap(headers, getColumnDefs(type))
}

// =============================================
// Parse Excel workbook into rows
// =============================================

export async function parseExcelFile(buffer: ArrayBuffer): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('Excel file is empty - no sheets found')

  const sheet = workbook.Sheets[sheetName]
  const jsonData = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(sheet, { header: 1 })

  if (jsonData.length < 2) {
    throw new Error('Excel file must have a header row and at least one data row')
  }

  const headers = (jsonData[0] as any[]).map((h: any) => String(h || '').trim().toLowerCase())

  const rows: Record<string, string>[] = []
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[]
    if (row.every((cell: any) => !cell || String(cell).trim() === '')) continue // skip empty rows

    const record: Record<string, string> = {}
    headers.forEach((header: string, idx: number) => {
      record[header] = row[idx] !== undefined && row[idx] !== null ? String(row[idx]).trim() : ''
    })
    rows.push(record)
  }

  return { headers, rows }
}

// =============================================
// Detect data type from headers
// =============================================

export type EntityType = 'parties' | 'purchases' | 'sales' | 'transactions' | 'unknown'

// Helper: check if any header contains a keyword (case-insensitive)
function headerContains(headers: string[], ...keywords: string[]): boolean {
  return keywords.some(kw => headers.some(h => h.toLowerCase().trim().includes(kw)))
}

// Helper: check if any header matches any of the exact names
function headerMatches(headers: string[], ...names: string[]): boolean {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim())
  return names.some(n => lowerHeaders.includes(n))
}

export function detectEntityType(headers: string[]): EntityType {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim())
  const headerSet = new Set(lowerHeaders)

  // Build a score for each type based on keyword matches
  let partyScore = 0
  let purchaseScore = 0
  let saleScore = 0
  let txnScore = 0

  // Parties indicators
  if (headerSet.has('name') || headerSet.has('party')) partyScore += 3
  if (headerContains(lowerHeaders, 'type')) partyScore += 2
  if (headerContains(lowerHeaders, 'phone', 'mobile', 'contact')) partyScore += 1
  if (headerContains(lowerHeaders, 'gstin', 'gst', 'gst no')) partyScore += 1
  if (headerContains(lowerHeaders, 'email')) partyScore += 1
  if (headerContains(lowerHeaders, 'address')) partyScore += 1
  if (headerContains(lowerHeaders, 'opening balance', 'opening_balance')) partyScore += 1

  // Purchases indicators
  if (headerContains(lowerHeaders, 'supplier', 'vendor')) purchaseScore += 3
  if (headerContains(lowerHeaders, 'material', 'item', 'product', 'goods')) purchaseScore += 3
  if (headerContains(lowerHeaders, 'quantity', 'qty')) purchaseScore += 1
  if (headerContains(lowerHeaders, 'rate', 'price', 'unit price')) purchaseScore += 1
  if (headerContains(lowerHeaders, 'purchase', 'invoice no', 'bill no')) purchaseScore += 1

  // Sales indicators
  if (headerContains(lowerHeaders, 'client', 'customer')) saleScore += 3
  if (headerContains(lowerHeaders, 'material', 'item', 'product', 'service', 'work')) saleScore += 3
  if (headerContains(lowerHeaders, 'quantity', 'qty')) saleScore += 1
  if (headerContains(lowerHeaders, 'rate', 'price', 'unit price')) saleScore += 1
  if (headerContains(lowerHeaders, 'sale', 'invoice no', 'bill no')) saleScore += 1

  // Transactions/Ledger indicators
  if (headerContains(lowerHeaders, 'debit', 'dr')) txnScore += 4
  if (headerContains(lowerHeaders, 'credit', 'cr')) txnScore += 4
  if (headerContains(lowerHeaders, 'balance', 'bal')) txnScore += 2
  if (headerContains(lowerHeaders, 'description', 'particulars', 'narration', 'particular')) txnScore += 1
  if (headerContains(lowerHeaders, 'voucher', 'ref', 'cheque')) txnScore += 1

  // Also check the original exact pattern matching as a strong signal
  // Parties exact match
  if (headerSet.has('name') && (headerSet.has('type') || headerSet.has('party type') || headerSet.has('vendor type') || headerSet.has('party_type'))) {
    partyScore += 5
  }

  // Purchases exact match
  if (headerMatches(lowerHeaders, 'supplier name', 'vendor name', 'supplier') &&
      headerMatches(lowerHeaders, 'material', 'item', 'item name', 'material name', 'product')) {
    purchaseScore += 5
  }

  // Sales exact match
  if (headerMatches(lowerHeaders, 'client name', 'customer name', 'client', 'customer') &&
      headerMatches(lowerHeaders, 'material', 'item', 'item name', 'material name', 'product')) {
    saleScore += 5
  }

  // Transactions exact match (date + debit + credit + description)
  if (headerContains(lowerHeaders, 'date') && 
      headerContains(lowerHeaders, 'debit', 'dr') &&
      headerContains(lowerHeaders, 'credit', 'cr')) {
    txnScore += 5
  }

  // When file has BOTH party AND debit/credit columns, prefer transactions
  // (so party names + amounts are imported together, not just party names)
  if (partyScore >= 2 && txnScore >= 3 && txnScore >= purchaseScore && txnScore >= saleScore) {
    return 'transactions'
  }

  // Determine winner based on score
  if (txnScore >= 5 && txnScore > partyScore && txnScore > purchaseScore && txnScore > saleScore) {
    return 'transactions'
  }
  if (purchaseScore >= 5 && purchaseScore > partyScore && purchaseScore > saleScore && purchaseScore > txnScore) {
    return 'purchases'
  }
  if (saleScore >= 5 && saleScore > partyScore && saleScore > purchaseScore && saleScore > txnScore) {
    return 'sales'
  }
  if (partyScore >= 3 && partyScore >= purchaseScore && partyScore >= saleScore && partyScore > txnScore) {
    return 'parties'
  }
  if (txnScore >= 4 && txnScore >= partyScore && txnScore >= purchaseScore && txnScore >= saleScore) {
    return 'transactions'
  }
  if (purchaseScore >= 3 && purchaseScore >= saleScore && purchaseScore >= txnScore) {
    return 'purchases'
  }
  if (saleScore >= 3 && saleScore >= purchaseScore && saleScore >= txnScore) {
    return 'sales'
  }

  return 'unknown'
}

// =============================================
// Import Parties
// =============================================

async function importParties(rows: Record<string, string>[], columnMap: Map<string, string>): Promise<ImportResult> {
  const result: ImportResult = { success: true, imported: 0, errors: [], warnings: [], entityType: 'parties' }
  const partyTypeMap: Record<string, string> = {
    'supplier': 'supplier',
    'client': 'client',
    'beneficiary': 'beneficiary',
    'vendor': 'supplier',
    'customer': 'client',
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // +2 because row 1 is header

    try {
      const name = getField(row, columnMap, 'name')
      if (!name) {
        result.warnings.push(`Row ${rowNum}: Skipped - Name is required`)
        continue
      }

      const typeInput = (getField(row, columnMap, 'type') || 'supplier').toLowerCase().trim()
      const partyType = partyTypeMap[typeInput] || typeInput

      if (!['supplier', 'client', 'beneficiary'].includes(partyType)) {
        result.warnings.push(`Row ${rowNum}: Invalid type "${typeInput}" for "${name}", defaulting to Supplier`)
      }

      const openingBalance = parseFloat(getField(row, columnMap, 'opening_balance') || '0') || 0
      const gstRegField = getField(row, columnMap, 'gst_registered') || ''

      const { error } = await supabase.from('parties').insert([{
        name,
        phone: getField(row, columnMap, 'phone') || null,
        email: getField(row, columnMap, 'email') || null,
        gstin: getField(row, columnMap, 'gstin') || null,
        pan: getField(row, columnMap, 'pan') || null,
        address: getField(row, columnMap, 'address') || null,
        city: getField(row, columnMap, 'city') || null,
        state: getField(row, columnMap, 'state') || null,
        pin_code: getField(row, columnMap, 'pin_code') || null,
        party_type: ['supplier', 'client', 'beneficiary'].includes(partyType) ? partyType : 'supplier',
        opening_balance: openingBalance,
        gst_registered: gstRegField.toLowerCase() === 'yes' || false,
        notes: getField(row, columnMap, 'notes') || null
      }])

      if (error) throw error
      result.imported++

      // Auto-create beneficiary record if type is beneficiary
      if (partyType === 'beneficiary') {
        const { data: createdParty } = await supabase
          .from('parties')
          .select('id')
          .eq('name', name)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (createdParty) {
          await supabase.from('beneficiaries').insert([{
            party_id: createdParty.id,
            subsidy_status: 'pending',
            construction_progress: 0,
            total_amount_received: 0,
            total_amount_due: 400000,
            payment_installments: 1
          }])
        }
      }
    } catch (error: any) {
      result.errors.push(`Row ${rowNum}: ${error.message || 'Failed to import'}`)
    }
  }

  if (result.errors.length > 0) result.success = false
  return result
}

// =============================================
// Import Purchases (flat table - each row is one invoice item)
// =============================================

async function importPurchases(rows: Record<string, string>[], columnMap: Map<string, string>): Promise<ImportResult> {
  const result: ImportResult = { success: true, imported: 0, errors: [], warnings: [], entityType: 'purchases' }

  // Group rows by invoice
  const invoiceGroups = new Map<string, Record<string, string>[]>()
  const invoiceKeys: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const supplierName = getField(row, columnMap, 'supplier_name')
    const invoiceDate = getField(row, columnMap, 'invoice_date')
    const supplierInvNo = getField(row, columnMap, 'supplier_invoice_no')

    if (!supplierName || !invoiceDate) {
      result.warnings.push(`Row ${i + 2}: Skipped - Supplier name and invoice date are required`)
      continue
    }

    const key = `${supplierName}|||${invoiceDate}|||${supplierInvNo}`
    if (!invoiceGroups.has(key)) {
      invoiceGroups.set(key, [])
      invoiceKeys.push(key)
    }
    invoiceGroups.get(key)!.push(row)
  }

  // Process each invoice group
  for (const key of invoiceKeys) {
    const groupRows = invoiceGroups.get(key)!
    const firstRow = groupRows[0]
    const supplierName = getField(firstRow, columnMap, 'supplier_name')
    const invoiceDate = getField(firstRow, columnMap, 'invoice_date')
    const supplierInvNo = getField(firstRow, columnMap, 'supplier_invoice_no')
    const paymentStatus = (getField(firstRow, columnMap, 'payment_status') || 'unpaid').toLowerCase()
    const paymentMode = getField(firstRow, columnMap, 'payment_mode')
    const remarks = getField(firstRow, columnMap, 'remarks')

    try {
      // Resolve or create supplier
      const { data: existingSupplier } = await supabase
        .from('parties')
        .select('id')
        .eq('name', supplierName)
        .eq('party_type', 'supplier')
        .maybeSingle()

      let supplierId: string
      if (existingSupplier) {
        supplierId = existingSupplier.id
      } else {
        const { data: newSupplier, error: createError } = await supabase
          .from('parties')
          .insert([{ name: supplierName, party_type: 'supplier' }])
          .select('id')
          .single()
        if (createError) throw createError
        supplierId = newSupplier.id
      }

      // Build items
      const items: any[] = []
      for (const row of groupRows) {
        const materialName = getField(row, columnMap, 'material')
        if (!materialName) {
          result.warnings.push(`Row with empty material name skipped in invoice for ${supplierName}`)
          continue
        }

        const qty = parseFloat(getField(row, columnMap, 'quantity') || '1') || 1
        const rate = parseFloat(getField(row, columnMap, 'rate') || '0') || 0
        const gstRate = parseFloat(getField(row, columnMap, 'gst') || '18') || 0
        const unit = getField(row, columnMap, 'unit') || 'Nos'
        const hsnCode = getField(row, columnMap, 'hsn')
        const amount = qty * rate
        const gstAmount = amount * gstRate / 100

        items.push({
          material_name: materialName,
          hsn_code: hsnCode || undefined,
          quantity: qty,
          unit,
          rate,
          amount,
          gst_rate: gstRate,
          gst_amount: gstAmount
        })
      }

      if (items.length === 0) {
        result.warnings.push(`Invoice for ${supplierName} on ${invoiceDate}: No valid items found`)
        continue
      }

      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
      const totalGst = items.reduce((sum, item) => sum + item.gst_amount, 0)
      const totalWithGst = totalAmount + totalGst
      const paid = parseFloat(getField(firstRow, columnMap, 'amount_paid') || '0') || 0
      const validStatus = ['paid', 'partial', 'unpaid'].includes(paymentStatus) ? paymentStatus : 'unpaid'

      // Create the purchase
      const purchaseNumber = await getNextPurchaseNumber()
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchases')
        .insert([{
          supplier_id: supplierId,
          invoice_date: invoiceDate,
          supplier_invoice_number: supplierInvNo || undefined,
          purchase_number: purchaseNumber,
          subtotal: totalAmount,
          gst_rate: 0,
          cgst_amount: totalGst / 2,
          sgst_amount: totalGst / 2,
          igst_amount: 0,
          total_amount: totalWithGst,
          payment_mode: paymentMode || undefined,
          payment_status: validStatus,
          amount_paid: paid,
          balance_due: totalWithGst - paid,
          remarks: remarks || undefined
        }])
        .select()
        .single()

      if (purchaseError) throw purchaseError

      // Insert items
      const itemsWithIds = items.map(item => ({ ...item, purchase_id: purchaseData.id }))
      const { error: itemsError } = await supabase.from('purchase_items').insert(itemsWithIds)
      if (itemsError) throw itemsError

      // Create transaction
      await supabase.from('transactions').insert([{
        party_id: supplierId,
        transaction_type: 'purchase',
        reference_id: purchaseData.id,
        reference_type: 'purchase',
        debit: totalWithGst,
        credit: 0,
        balance: totalWithGst,
        description: `Purchase ${purchaseNumber}${remarks ? ` - ${remarks}` : ''}`,
        transaction_date: invoiceDate
      }])

      // If payment was made
      if (paid > 0) {
        await supabase.from('transactions').insert([{
          party_id: supplierId,
          transaction_type: 'payment',
          reference_id: purchaseData.id,
          reference_type: 'purchase',
          debit: 0,
          credit: paid,
          balance: 0,
          description: `Payment for ${purchaseNumber}`,
          transaction_date: invoiceDate
        }])
      }

      result.imported++
    } catch (error: any) {
      result.errors.push(`Invoice for ${supplierName} on ${invoiceDate}: ${error.message || 'Import failed'}`)
    }
  }

  if (result.errors.length > 0) result.success = false
  return result
}

// =============================================
// Import Sales (flat table - each row is one invoice item)
// =============================================

async function importSales(rows: Record<string, string>[], columnMap: Map<string, string>): Promise<ImportResult> {
  const result: ImportResult = { success: true, imported: 0, errors: [], warnings: [], entityType: 'sales' }

  // Group rows by invoice
  const invoiceGroups = new Map<string, Record<string, string>[]>()
  const invoiceKeys: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const clientName = getField(row, columnMap, 'client_name')
    const invoiceDate = getField(row, columnMap, 'invoice_date')

    if (!clientName || !invoiceDate) {
      result.warnings.push(`Row ${i + 2}: Skipped - Client name and invoice date are required`)
      continue
    }

    const key = `${clientName}|||${invoiceDate}`
    if (!invoiceGroups.has(key)) {
      invoiceGroups.set(key, [])
      invoiceKeys.push(key)
    }
    invoiceGroups.get(key)!.push(row)
  }

  // Process each invoice group
  for (const key of invoiceKeys) {
    const groupRows = invoiceGroups.get(key)!
    const firstRow = groupRows[0]
    const clientName = getField(firstRow, columnMap, 'client_name')
    const invoiceDate = getField(firstRow, columnMap, 'invoice_date')
    const paymentStatus = (getField(firstRow, columnMap, 'payment_status') || 'unpaid').toLowerCase()
    const paymentMode = getField(firstRow, columnMap, 'payment_mode')
    const remarks = getField(firstRow, columnMap, 'remarks')

    try {
      // Resolve or create client
      const { data: existingClient } = await supabase
        .from('parties')
        .select('id')
        .eq('name', clientName)
        .eq('party_type', 'client')
        .maybeSingle()

      let clientId: string
      if (existingClient) {
        clientId = existingClient.id
      } else {
        const { data: newClient, error: createError } = await supabase
          .from('parties')
          .insert([{ name: clientName, party_type: 'client' }])
          .select('id')
          .single()
        if (createError) throw createError
        clientId = newClient.id
      }

      // Build items
      const items: any[] = []
      for (const row of groupRows) {
        const itemName = getField(row, columnMap, 'item')
        if (!itemName) {
          result.warnings.push(`Row with empty item name skipped in invoice for ${clientName}`)
          continue
        }

        const qty = parseFloat(getField(row, columnMap, 'quantity') || '1') || 1
        const rate = parseFloat(getField(row, columnMap, 'rate') || '0') || 0
        const gstRate = parseFloat(getField(row, columnMap, 'gst') || '18') || 0
        const unit = getField(row, columnMap, 'unit') || 'Nos'
        const hsnCode = getField(row, columnMap, 'hsn')
        const sacCode = getField(row, columnMap, 'sac')
        const amount = qty * rate
        const gstAmount = amount * gstRate / 100

        items.push({
          item_name: itemName,
          hsn_code: hsnCode || undefined,
          sac_code: sacCode || undefined,
          quantity: qty,
          unit,
          rate,
          amount,
          gst_rate: gstRate,
          gst_amount: gstAmount
        })
      }

      if (items.length === 0) {
        result.warnings.push(`Invoice for ${clientName} on ${invoiceDate}: No valid items found`)
        continue
      }

      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
      const totalGst = items.reduce((sum, item) => sum + item.gst_amount, 0)
      const totalWithGst = totalAmount + totalGst
      const received = parseFloat(getField(firstRow, columnMap, 'amount_received') || '0') || 0
      const validStatus = ['paid', 'partial', 'unpaid'].includes(paymentStatus) ? paymentStatus : 'unpaid'

      // Create the sale
      const saleNumber = await getNextSaleNumber()
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{
          client_id: clientId,
          invoice_date: invoiceDate,
          sale_number: saleNumber,
          subtotal: totalAmount,
          gst_rate: 0,
          cgst_amount: totalGst / 2,
          sgst_amount: totalGst / 2,
          igst_amount: 0,
          total_amount: totalWithGst,
          payment_mode: paymentMode || undefined,
          payment_status: validStatus,
          amount_received: received,
          balance_due: totalWithGst - received,
          remarks: remarks || undefined
        }])
        .select()
        .single()

      if (saleError) throw saleError

      // Insert items
      const itemsWithIds = items.map(item => ({ ...item, sale_id: saleData.id }))
      const { error: itemsError } = await supabase.from('sale_items').insert(itemsWithIds)
      if (itemsError) throw itemsError

      // Create transaction
      await supabase.from('transactions').insert([{
        party_id: clientId,
        transaction_type: 'sale',
        reference_id: saleData.id,
        reference_type: 'sale',
        debit: totalWithGst,
        credit: 0,
        balance: totalWithGst,
        description: `Sale ${saleNumber}${remarks ? ` - ${remarks}` : ''}`,
        transaction_date: invoiceDate
      }])

      // If payment was received
      if (received > 0) {
        await supabase.from('transactions').insert([{
          party_id: clientId,
          transaction_type: 'receipt',
          reference_id: saleData.id,
          reference_type: 'sale',
          debit: received,
          credit: 0,
          balance: 0,
          description: `Receipt for ${saleNumber}`,
          transaction_date: invoiceDate
        }])
      }

      result.imported++
    } catch (error: any) {
      result.errors.push(`Invoice for ${clientName} on ${invoiceDate}: ${error.message || 'Import failed'}`)
    }
  }

  if (result.errors.length > 0) result.success = false
  return result
}

// =============================================
// Import Transactions / Ledger
// Each row: date, description, debit, credit, balance, optional party
// =============================================

async function importTransactions(rows: Record<string, string>[], columnMap: Map<string, string>, defaultPartyName?: string): Promise<ImportResult> {
  const result: ImportResult = { success: true, imported: 0, errors: [], warnings: [], entityType: 'transactions' }

  // Check if party column is available — either from file or provided as default
  const hasParty = columnMap.has('party')
  const resolvedDefaultParty = (defaultPartyName || '').trim()
  const hasDefaultParty = !!resolvedDefaultParty
  if (!hasParty && !hasDefaultParty) {
    result.errors.push('No party/account column found. Transaction import requires a column containing party names (e.g., "Party", "Account Name", "Ledger Name"), or provide a default party name.')
    result.success = false
    return result
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    try {
      const date = getField(row, columnMap, 'date')
      const description = getField(row, columnMap, 'description')
      const debitStr = getField(row, columnMap, 'debit')
      const creditStr = getField(row, columnMap, 'credit')
      const balanceStr = getField(row, columnMap, 'balance')
      const partyName = getField(row, columnMap, 'party') || resolvedDefaultParty || ''

      if (!partyName) {
        result.warnings.push(`Row ${rowNum}: Skipped - Party name is required`)
        continue
      }

      // Strip currency symbols, commas, and whitespace for parsing
      const cleanAmount = (s: string) => {
        if (!s) return 0
        let cleaned = s.replace(/\b[dD][rR]\b|\b[cC][rR]\b/g, '')  // Dr/Cr anywhere
                        .replace(/[,₹$()]/g, '')                     // commas, symbols, brackets
                        .replace(/\s+/g, '')                         // whitespace
        cleaned = cleaned.replace(/^(Rs\.?|INR)\s*/i, '')            // "Rs." or "INR" prefix
        return parseFloat(cleaned) || 0
      }
      const debit = cleanAmount(debitStr)
      const credit = cleanAmount(creditStr)
      const balance = cleanAmount(balanceStr)

      if (debit === 0 && credit === 0) {
        result.warnings.push(`Row ${rowNum}: Skipped - No debit or credit amount`)
        continue
      }

      // Determine transaction type based on which amount is present
      const txnType = debit > 0 ? 'payment' : 'receipt'

      // Resolve or create the party
      const { data: existingParty } = await supabase
        .from('parties')
        .select('id')
        .eq('name', partyName)
        .maybeSingle()

      let partyId: string
      if (existingParty) {
        partyId = existingParty.id
      } else {
        const { data: newParty, error: createError } = await supabase
          .from('parties')
          .insert([{ name: partyName, party_type: 'supplier' }])
          .select('id')
          .single()
        if (createError) throw createError
        partyId = newParty.id
      }

      // Create the transaction record
      const { error: txnError } = await supabase.from('transactions').insert([{
        party_id: partyId,
        transaction_type: txnType,
        debit,
        credit,
        balance,
        description: description || null,
        transaction_date: date || new Date().toISOString().split('T')[0]
      }])

      if (txnError) throw txnError

      result.imported++
    } catch (error: any) {
      result.errors.push(`Row ${rowNum}: ${error.message || 'Failed to import'}`)
    }
  }

  if (result.errors.length > 0) result.success = false
  return result
}

// =============================================
// Main import function
// =============================================

export async function importFromExcel(buffer: ArrayBuffer, forceType?: EntityType, defaultPartyName?: string): Promise<ImportResult> {
  const { headers, rows } = await parseExcelFile(buffer)

  if (rows.length === 0) {
    return { success: false, imported: 0, errors: ['No data rows found in the Excel file'], warnings: [], entityType: 'unknown' }
  }

  const entityType = forceType || detectEntityType(headers)

  switch (entityType) {
    case 'parties':
      return importParties(rows, buildColumnMap(headers, PARTY_COLUMNS))
    case 'purchases':
      return importPurchases(rows, buildColumnMap(headers, PURCHASE_COLUMNS))
    case 'sales':
      return importSales(rows, buildColumnMap(headers, SALE_COLUMNS))
    case 'transactions':
      return importTransactions(rows, buildColumnMap(headers, TRANSACTION_COLUMNS), defaultPartyName)
    default: {
      // Broader keyword-based fallback
      const headerStr = headers.join(' ')
      if (headerStr.includes('debit') || headerStr.includes('credit') || (headerStr.includes('balance') && headerStr.includes('date'))) {
        return importTransactions(rows, buildColumnMap(headers, TRANSACTION_COLUMNS), defaultPartyName)
      }
      if (headerStr.includes('supplier') || headerStr.includes('material') || headerStr.includes('item')) {
        return importPurchases(rows, buildColumnMap(headers, PURCHASE_COLUMNS))
      }
      if (headerStr.includes('client') || headerStr.includes('customer')) {
        return importSales(rows, buildColumnMap(headers, SALE_COLUMNS))
      }
      if (headerStr.includes('name') || headerStr.includes('type') || headerStr.includes('party')) {
        return importParties(rows, buildColumnMap(headers, PARTY_COLUMNS))
      }
      return { success: false, imported: 0, errors: ['Could not detect data type from Excel columns.'], warnings: [], entityType: 'unknown' }
    }
  }
}

// =============================================
// Download template
// =============================================

export async function downloadTemplate(type: EntityType): Promise<void> {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  let headers: string[]
  let sampleData: any[][]

  switch (type) {
    case 'parties':
      headers = ['Name', 'Type', 'Phone', 'Email', 'GSTIN', 'PAN', 'Address', 'City', 'State', 'Pin Code', 'Opening Balance', 'GST Registered', 'Notes']
      sampleData = [
        ['ABC Constructions', 'Supplier', '9876543210', '', '22AAAAA0000A1Z5', '', '123, Main Road', 'Mumbai', 'Maharashtra', '400001', '0', 'Yes', ''],
        ['XYZ Builders', 'Client', '9876543211', 'info@xyz.com', '', '', '456, Park Street', 'Delhi', 'Delhi', '110001', '50000', 'No', 'Credit terms: 30 days'],
        ['John Doe', 'Beneficiary', '9876543212', '', '', '', '', 'Village', 'Gujarat', '', '0', 'No', ''],
      ]
      break
    case 'purchases':
      headers = ['Supplier Name', 'Invoice Date', 'Supplier Invoice No', 'Material', 'HSN', 'Quantity', 'Unit', 'Rate', 'GST %', 'Payment Status', 'Payment Mode', 'Amount Paid', 'Remarks']
      sampleData = [
        ['ABC Constructions', '2025-04-01', 'SUP-001', 'Cement', '2523.29', 100, 'Bag', 350, 18, 'unpaid', '', 0, 'Cement for foundation'],
        ['ABC Constructions', '2025-04-01', 'SUP-001', 'Steel Rods', '7214.20', 50, 'Kg', 75, 18, 'unpaid', '', 0, ''],
        ['XYZ Traders', '2025-04-05', '', 'Bricks', '6901.00', 5000, 'Nos', 8, 5, 'paid', 'NEFT', 42000, ''],
      ]
      break
    case 'sales':
      headers = ['Client Name', 'Invoice Date', 'Item', 'HSN/SAC', 'Quantity', 'Unit', 'Rate', 'GST %', 'Payment Status', 'Payment Mode', 'Amount Received', 'Remarks']
      sampleData = [
        ['PQR Developers', '2025-04-10', 'Construction Service', '9954', 1, 'Nos', 500000, 18, 'partial', 'Cheque', 200000, 'Floor construction'],
        ['PQR Developers', '2025-04-10', 'Material Supply', '2523', 200, 'Bag', 380, 18, 'partial', 'Cheque', 0, ''],
        ['LMN Group', '2025-04-15', 'Consulting', '9983', 1, 'Nos', 25000, 18, 'unpaid', '', 0, 'Architecture consulting'],
      ]
      break
    default:
      headers = ['Name']
      sampleData = [['Sample data']]
  }

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData])
  XLSX.utils.book_append_sheet(wb, ws, type)
  XLSX.writeFile(wb, `${type}_import_template.xlsx`)
}
