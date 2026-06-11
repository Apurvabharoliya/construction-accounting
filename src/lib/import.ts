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

export type EntityType = 'parties' | 'purchases' | 'sales' | 'unknown'

export function detectEntityType(headers: string[]): EntityType {
  const headerSet = new Set(headers.map(h => h.toLowerCase().trim()))

  // Check for parties: name, type, gstin, phone, etc.
  if (headerSet.has('name') && (headerSet.has('type') || headerSet.has('party type') || headerSet.has('vendor type'))) {
    return 'parties'
  }

  // Check for purchases: supplier name, material/item, qty, rate
  if ((headerSet.has('supplier name') || headerSet.has('vendor name')) && 
      (headerSet.has('material') || headerSet.has('item') || headerSet.has('item name'))) {
    return 'purchases'
  }

  // Check for sales: client name, material/item, qty, rate
  if ((headerSet.has('client name') || headerSet.has('customer name')) && 
      (headerSet.has('material') || headerSet.has('item') || headerSet.has('item name'))) {
    return 'sales'
  }

  return 'unknown'
}

// =============================================
// Import Parties
// =============================================

async function importParties(rows: Record<string, string>[]): Promise<ImportResult> {
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
      const name = row['name']
      if (!name) {
        result.warnings.push(`Row ${rowNum}: Skipped - Name is required`)
        continue
      }

      const typeInput = (row['type'] || row['party type'] || row['vendor type'] || 'supplier').toLowerCase().trim()
      const partyType = partyTypeMap[typeInput] || typeInput

      if (!['supplier', 'client', 'beneficiary'].includes(partyType)) {
        result.warnings.push(`Row ${rowNum}: Invalid type "${typeInput}" for "${name}", defaulting to Supplier`)
      }

      const openingBalance = parseFloat(row['opening balance'] || row['opening_balance'] || '0') || 0

      const { error } = await supabase.from('parties').insert([{
        name,
        phone: row['phone'] || null,
        email: row['email'] || null,
        gstin: row['gstin'] || null,
        pan: row['pan'] || null,
        address: row['address'] || null,
        city: row['city'] || null,
        state: row['state'] || null,
        pin_code: row['pin code'] || row['pincode'] || null,
        party_type: ['supplier', 'client', 'beneficiary'].includes(partyType) ? partyType : 'supplier',
        opening_balance: openingBalance,
        gst_registered: (row['gst registered'] || row['gst_registered'] || '').toLowerCase() === 'yes' || false,
        notes: row['notes'] || null
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

async function importPurchases(rows: Record<string, string>[]): Promise<ImportResult> {
  const result: ImportResult = { success: true, imported: 0, errors: [], warnings: [], entityType: 'purchases' }

  // Group rows by invoice
  // A unique invoice is identified by supplier name + invoice date + optional supplier invoice number
  const invoiceGroups = new Map<string, Record<string, string>[]>()
  const invoiceKeys: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const supplierName = row['supplier name'] || row['vendor name'] || ''
    const invoiceDate = row['invoice date'] || row['date'] || ''
    const supplierInvNo = row['supplier invoice no'] || row['supplier invoice number'] || ''

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
    const supplierName = firstRow['supplier name'] || firstRow['vendor name'] || ''
    const invoiceDate = firstRow['invoice date'] || firstRow['date'] || ''
    const supplierInvNo = firstRow['supplier invoice no'] || firstRow['supplier invoice number'] || ''
    const paymentStatus = (firstRow['payment status'] || firstRow['status'] || 'unpaid').toLowerCase()
    const paymentMode = firstRow['payment mode'] || ''
    const remarks = firstRow['remarks'] || firstRow['description'] || firstRow['notes'] || ''

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
        const materialName = row['material'] || row['item'] || row['item name'] || row['material name'] || ''
        if (!materialName) {
          result.warnings.push(`Row with empty material name skipped in invoice for ${supplierName}`)
          continue
        }

        const qty = parseFloat(row['quantity'] || row['qty'] || '1') || 1
        const rate = parseFloat(row['rate'] || row['price'] || '0') || 0
        const gstRate = parseFloat(row['gst'] || row['gst rate'] || row['gst_rate'] || '18') || 0
        const unit = row['unit'] || 'Nos'
        const hsnCode = row['hsn'] || row['hsn code'] || row['hsn_code'] || ''
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
      const paid = parseFloat(firstRow['amount paid'] || '0') || 0
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

async function importSales(rows: Record<string, string>[]): Promise<ImportResult> {
  const result: ImportResult = { success: true, imported: 0, errors: [], warnings: [], entityType: 'sales' }

  // Group rows by invoice
  const invoiceGroups = new Map<string, Record<string, string>[]>()
  const invoiceKeys: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const clientName = row['client name'] || row['customer name'] || row['client'] || ''
    const invoiceDate = row['invoice date'] || row['date'] || ''

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
    const clientName = firstRow['client name'] || firstRow['customer name'] || firstRow['client'] || ''
    const invoiceDate = firstRow['invoice date'] || firstRow['date'] || ''
    const paymentStatus = (firstRow['payment status'] || firstRow['status'] || 'unpaid').toLowerCase()
    const paymentMode = firstRow['payment mode'] || ''
    const remarks = firstRow['remarks'] || firstRow['description'] || firstRow['notes'] || ''

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
        const itemName = row['item'] || row['item name'] || row['service'] || row['description'] || ''
        if (!itemName) {
          result.warnings.push(`Row with empty item name skipped in invoice for ${clientName}`)
          continue
        }

        const qty = parseFloat(row['quantity'] || row['qty'] || '1') || 1
        const rate = parseFloat(row['rate'] || row['price'] || '0') || 0
        const gstRate = parseFloat(row['gst'] || row['gst rate'] || row['gst_rate'] || '18') || 0
        const unit = row['unit'] || 'Nos'
        const hsnCode = row['hsn'] || row['hsn code'] || row['hsn_code'] || ''
        const sacCode = row['sac'] || row['sac code'] || row['sac_code'] || ''
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
      const received = parseFloat(firstRow['amount received'] || firstRow['amount_received'] || '0') || 0
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
// Main import function
// =============================================

export async function importFromExcel(buffer: ArrayBuffer, forceType?: EntityType): Promise<ImportResult> {
  const { headers, rows } = await parseExcelFile(buffer)

  if (rows.length === 0) {
    return { success: false, imported: 0, errors: ['No data rows found in the Excel file'], warnings: [], entityType: 'unknown' }
  }

  const entityType = forceType || detectEntityType(headers)

  switch (entityType) {
    case 'parties':
      return importParties(rows)
    case 'purchases':
      return importPurchases(rows)
    case 'sales':
      return importSales(rows)
    default: {
      // Try to detect more broadly
      const headerStr = headers.join(' ')
      if (headerStr.includes('supplier') || headerStr.includes('material')) {
        return importPurchases(rows)
      }
      if (headerStr.includes('client') || headerStr.includes('customer')) {
        return importSales(rows)
      }
      if (headerStr.includes('name') || headerStr.includes('type')) {
        return importParties(rows)
      }
      return { success: false, imported: 0, errors: ['Could not detect data type from Excel columns. Make sure headers match expected format (Name, Type for parties; Supplier Name, Material for purchases; Client Name, Item for sales)'], warnings: [], entityType: 'unknown' }
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
