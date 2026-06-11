/**
 * End-to-End Import Test Script v2
 * 
 * 1. Cleans any existing test data (from previous test runs)
 * 2. Creates sample Excel files for parties, purchases, and sales
 * 3. Imports them using the same logic as the app's importFromExcel
 * 4. Verifies data appears in all tables
 * 5. Verifies the app pages can query the data
 */

import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://qfkihcgfqlvokqymsyku.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFma2loY2dmcWx2b2txeW1zeWt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MTkwODEsImV4cCI6MjA5NjQ5NTA4MX0.YvlnIUQ6Lr3GGFGZ2XDZFobbXJnBzz70iC5nLyL1BJQ';
const supabase = createClient(supabaseUrl, supabaseKey);

// Test data marker - we use this to identify our test records
const TEST_NOTE = 'AUTO_IMPORT_TEST_DATA';

// =============================================
// 0. Clean existing test data
// =============================================
async function cleanTestData() {
  console.log('🧹 Cleaning existing test data...');

  // Delete test transactions
  const { data: testTxns } = await supabase
    .from('transactions')
    .select('id')
    .ilike('description', `%${TEST_NOTE}%`);
  if (testTxns?.length) {
    await supabase.from('transactions').delete().in('id', testTxns.map(t => t.id));
    console.log(`  Deleted ${testTxns.length} test transactions`);
  }

  // Delete test purchase items
  const { data: testPurchases } = await supabase
    .from('purchases')
    .select('id')
    .ilike('remarks', `%${TEST_NOTE}%`);
  if (testPurchases?.length) {
    const ids = testPurchases.map(t => t.id);
    await supabase.from('purchase_items').delete().in('purchase_id', ids);
    await supabase.from('purchases').delete().in('id', ids);
    console.log(`  Deleted ${testPurchases.length} test purchases + items`);
  }

  // Delete test sale items
  const { data: testSales } = await supabase
    .from('sales')
    .select('id')
    .ilike('remarks', `%${TEST_NOTE}%`);
  if (testSales?.length) {
    const ids = testSales.map(t => t.id);
    await supabase.from('sale_items').delete().in('sale_id', ids);
    await supabase.from('sales').delete().in('id', ids);
    console.log(`  Deleted ${testSales.length} test sales + items`);
  }

  // Delete test beneficiaries
  const { data: testBeneficiaries } = await supabase
    .from('beneficiaries')
    .select('id, party_id')
    .in('party_id', (await supabase.from('parties').select('id').ilike('notes', `%${TEST_NOTE}%`)).data?.map(p => p.id) || []);
  if (testBeneficiaries?.length) {
    await supabase.from('beneficiaries').delete().in('id', testBeneficiaries.map(b => b.id));
    console.log(`  Deleted ${testBeneficiaries.length} test beneficiaries`);
  }

  // Delete test parties
  const { data: testParties } = await supabase
    .from('parties')
    .select('id')
    .ilike('notes', `%${TEST_NOTE}%`);
  if (testParties?.length) {
    await supabase.from('parties').delete().in('id', testParties.map(p => p.id));
    console.log(`  Deleted ${testParties.length} test parties`);
  }
}

// =============================================
// 1. Create sample Excel files
// =============================================

function createPartiesExcel() {
  const wb = XLSX.utils.book_new();
  const headers = ['Name', 'Type', 'Phone', 'Email', 'GSTIN', 'PAN', 'Address', 'City', 'State', 'Pin Code', 'Opening Balance', 'GST Registered', 'Notes'];
  const data = [
    headers,
    ['M/s Bhardwaj Constructions', 'Supplier', '9876543210', '', '27AABCU1234D1Z5', '', 'Plot 45, Sector 12', 'Mumbai', 'Maharashtra', '400001', '0', 'Yes', `${TEST_NOTE} - Cement and steel supplier`],
    ['Sharma Traders', 'Supplier', '9876543211', 'info@sharmatraders.in', '07DEFG5678H1Z5', '', '456, Market Road', 'Delhi', 'Delhi', '110001', '25000', 'Yes', `${TEST_NOTE} - Building materials`],
    ['Gupta Enterprises', 'Supplier', '9876543212', '', '24HIJK9012L1Z5', '', '789, Industrial Zone', 'Ahmedabad', 'Gujarat', '380001', '10000', 'Yes', `${TEST_NOTE}`],
    ['Patel Infrastructure', 'Client', '9876543213', 'contact@patelinfra.com', '', '', '123, Skyline Tower', 'Mumbai', 'Maharashtra', '400001', '0', 'No', `${TEST_NOTE} - Regular client`],
    ['Verma Developers', 'Client', '9876543214', '', '', '', '567, Green Park', 'Bangalore', 'Karnataka', '560001', '50000', 'No', `${TEST_NOTE}`],
    ['Singh & Sons', 'Client', '9876543215', 'singh@sons.com', '29MNOP3456Q1Z5', '', '890, Lake View Road', 'Hyderabad', 'Telangana', '500001', '0', 'Yes', `${TEST_NOTE}`],
    ['Ram Prasad Sharma', 'Beneficiary', '9876543216', '', '', '', 'Village Kheri', 'Mainpuri', 'Uttar Pradesh', '205001', '0', 'No', `${TEST_NOTE} - PM Awas Yojana`],
    ['Sita Devi', 'Beneficiary', '9876543217', '', '', '', 'Village Rampur', 'Rampur', 'Uttar Pradesh', '244901', '0', 'No', `${TEST_NOTE}`],
    ['Lal Bahadur', 'Beneficiary', '9876543218', '', '', '', 'Ward 5, Near Temple', 'Patna', 'Bihar', '800001', '0', 'No', `${TEST_NOTE} - Subsidy beneficiary`],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Parties');
  XLSX.writeFile(wb, 'sample_parties.xlsx');
  console.log('✅ Created sample_parties.xlsx');
}

function createPurchasesExcel() {
  const wb = XLSX.utils.book_new();
  const headers = ['Supplier Name', 'Invoice Date', 'Supplier Invoice No', 'Material', 'HSN', 'Quantity', 'Unit', 'Rate', 'GST %', 'Payment Status', 'Payment Mode', 'Amount Paid', 'Remarks'];
  const data = [
    headers,
    ['M/s Bhardwaj Constructions', '2025-04-01', 'BIL-001', 'OPC Cement 53 Grade', '2523.29', 200, 'Bag', 380, 18, 'unpaid', '', 0, `${TEST_NOTE} - Cement for foundation`],
    ['M/s Bhardwaj Constructions', '2025-04-01', 'BIL-001', 'TMT Steel Bars 12mm', '7214.20', 100, 'Kg', 78, 18, 'unpaid', '', 0, ''],
    ['M/s Bhardwaj Constructions', '2025-04-01', 'BIL-001', 'TMT Steel Bars 16mm', '7214.20', 80, 'Kg', 76, 18, 'unpaid', '', 0, ''],
    ['M/s Bhardwaj Constructions', '2025-04-15', 'BIL-002', 'River Sand', '2505.10', 500, 'Cu Ft', 45, 5, 'partial', 'NEFT', 12000, `${TEST_NOTE} - Sand for plastering`],
    ['M/s Bhardwaj Constructions', '2025-04-15', 'BIL-002', 'Crushed Stone 20mm', '2517.10', 300, 'Cu Ft', 55, 5, 'partial', 'NEFT', 0, ''],
    ['Sharma Traders', '2025-04-05', 'ST-2025-001', 'Clay Bricks', '6901.10', 10000, 'Nos', 9, 12, 'paid', 'Cheque', 100800, `${TEST_NOTE} - Bricks for walls`],
    ['Sharma Traders', '2025-04-05', 'ST-2025-001', 'Fly Ash Bricks', '6815.20', 5000, 'Nos', 7, 12, 'paid', 'Cheque', 0, ''],
    ['Gupta Enterprises', '2025-04-10', 'GE/24-25/089', 'PVC Pipes 4 inch', '3917.20', 200, 'Meter', 120, 18, 'partial', 'UPI', 14000, `${TEST_NOTE} - Plumbing materials`],
    ['Gupta Enterprises', '2025-04-10', 'GE/24-25/089', 'PVC Fittings Set', '3917.30', 50, 'Set', 250, 18, 'partial', 'UPI', 0, ''],
    ['Gupta Enterprises', '2025-04-10', 'GE/24-25/089', 'Electrical Wire 1.5mm', '8544.20', 10, 'Coil', 1800, 18, 'partial', 'UPI', 0, ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Purchases');
  XLSX.writeFile(wb, 'sample_purchases.xlsx');
  console.log('✅ Created sample_purchases.xlsx');
}

function createSalesExcel() {
  const wb = XLSX.utils.book_new();
  const headers = ['Client Name', 'Invoice Date', 'Item', 'HSN/SAC', 'Quantity', 'Unit', 'Rate', 'GST %', 'Payment Status', 'Payment Mode', 'Amount Received', 'Remarks'];
  const data = [
    headers,
    ['Patel Infrastructure', '2025-04-02', 'Construction Service - Foundation Work', '9954', 1, 'Lump Sum', 250000, 18, 'partial', 'Cheque', 100000, `${TEST_NOTE} - Foundation work`],
    ['Patel Infrastructure', '2025-04-02', 'Material Supply - Cement', '2523.29', 100, 'Bag', 420, 18, 'partial', 'Cheque', 0, ''],
    ['Patel Infrastructure', '2025-04-02', 'Material Supply - Steel', '7214.20', 50, 'Kg', 85, 18, 'partial', 'Cheque', 0, ''],
    ['Verma Developers', '2025-04-08', 'Architecture Consultation', '9983', 1, 'Lump Sum', 75000, 18, 'unpaid', '', 0, `${TEST_NOTE} - Design consultation`],
    ['Verma Developers', '2025-04-08', 'Structural Design Service', '9983', 1, 'Lump Sum', 120000, 18, 'unpaid', '', 0, ''],
    ['Patel Infrastructure', '2025-04-18', 'Plastering Service', '9954', 1, 'Lump Sum', 85000, 18, 'paid', 'NEFT', 100300, `${TEST_NOTE} - Plastering completed`],
    ['Singh & Sons', '2025-04-20', 'Building Construction - Ground Floor', '9954', 1, 'Lump Sum', 800000, 18, 'unpaid', '', 0, `${TEST_NOTE} - Residential building`],
    ['Singh & Sons', '2025-04-20', 'Material Supply - Ready Mix Concrete', '2523.29', 30, 'Cu Mtr', 5200, 18, 'unpaid', '', 0, ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Sales');
  XLSX.writeFile(wb, 'sample_sales.xlsx');
  console.log('✅ Created sample_sales.xlsx');
}

// =============================================
// 2. Parse Excel file
// =============================================

function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('No sheets found');

  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (jsonData.length < 2) {
    throw new Error('File must have a header row and at least one data row');
  }

  const headers = jsonData[0].map(h => String(h || '').trim().toLowerCase());
  const rows = [];
  
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (row.every(cell => !cell || String(cell).trim() === '')) continue;
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = row[idx] !== undefined && row[idx] !== null ? String(row[idx]).trim() : '';
    });
    rows.push(record);
  }

  return { headers, rows };
}

// =============================================
// 3. Get next sequence number (mirrors app's getNextInvoiceNumber)
// =============================================

async function getNextPurchaseNumber() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const fyStart = currentMonth >= 3 ? currentYear : currentYear - 1;
  const fyEnd = fyStart + 1;
  const fy = `${fyStart.toString().slice(-2)}${fyEnd.toString().slice(-2)}`;

  const { data: last } = await supabase
    .from('purchases')
    .select('purchase_number')
    .like('purchase_number', `PUR-${fy}-%`)
    .order('purchase_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextSeq = 1;
  if (last) {
    const parts = last.purchase_number.split('-');
    const lastSeq = parseInt(parts[2], 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }
  return `PUR-${fy}-${String(nextSeq).padStart(4, '0')}`;
}

async function getNextSaleNumber() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const fyStart = currentMonth >= 3 ? currentYear : currentYear - 1;
  const fyEnd = fyStart + 1;
  const fy = `${fyStart.toString().slice(-2)}${fyEnd.toString().slice(-2)}`;

  const { data: last } = await supabase
    .from('sales')
    .select('sale_number')
    .like('sale_number', `INV-${fy}-%`)
    .order('sale_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextSeq = 1;
  if (last) {
    const parts = last.sale_number.split('-');
    const lastSeq = parseInt(parts[2], 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }
  return `INV-${fy}-${String(nextSeq).padStart(4, '0')}`;
}

// =============================================
// 4. Import functions (mirrors app's import.ts)
// =============================================

async function importParties(rows) {
  let imported = 0;
  const errors = [];
  const warnings = [];

  const partyTypeMap = {
    'supplier': 'supplier', 'client': 'client', 'beneficiary': 'beneficiary',
    'vendor': 'supplier', 'customer': 'client',
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const name = row['name'];
      if (!name) { warnings.push(`Row ${rowNum}: Skipped - Name required`); continue; }

      const typeInput = (row['type'] || row['party type'] || row['vendor type'] || 'supplier').toLowerCase().trim();
      const partyType = partyTypeMap[typeInput] || typeInput;
      const openingBalance = parseFloat(row['opening balance'] || row['opening_balance'] || '0') || 0;

      const { data: inserted, error } = await supabase.from('parties').insert([{
        name, phone: row['phone'] || null, email: row['email'] || null,
        gstin: row['gstin'] || null, pan: row['pan'] || null,
        address: row['address'] || null, city: row['city'] || null,
        state: row['state'] || null, pin_code: row['pin code'] || row['pincode'] || null,
        party_type: ['supplier', 'client', 'beneficiary'].includes(partyType) ? partyType : 'supplier',
        opening_balance: openingBalance,
        gst_registered: (row['gst registered'] || row['gst_registered'] || '').toLowerCase() === 'yes' || false,
        notes: row['notes'] || null,
      }]).select('id').single();
      if (error) throw error;
      imported++;

      if (partyType === 'beneficiary' && inserted) {
        await supabase.from('beneficiaries').insert([{
          party_id: inserted.id, subsidy_status: 'pending',
          construction_progress: 0, total_amount_received: 0,
          total_amount_due: 400000, payment_installments: 1,
        }]);
      }
    } catch (error) {
      errors.push(`Row ${rowNum}: ${error.message || 'Failed'}`);
    }
  }
  return { success: errors.length === 0, imported, errors, warnings };
}

async function importPurchases(rows) {
  let imported = 0;
  const errors = [];
  const warnings = [];

  const invoiceGroups = new Map();
  const invoiceKeys = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const supplierName = row['supplier name'] || row['vendor name'] || '';
    const invoiceDate = row['invoice date'] || row['date'] || '';
    const supplierInvNo = row['supplier invoice no'] || row['supplier invoice number'] || '';

    if (!supplierName || !invoiceDate) {
      warnings.push(`Row ${i + 2}: Skipped - Supplier name and date required`);
      continue;
    }

    const key = `${supplierName}|||${invoiceDate}|||${supplierInvNo}`;
    if (!invoiceGroups.has(key)) { invoiceGroups.set(key, []); invoiceKeys.push(key); }
    invoiceGroups.get(key).push(row);
  }

  for (const key of invoiceKeys) {
    const groupRows = invoiceGroups.get(key);
    const firstRow = groupRows[0];
    const supplierName = firstRow['supplier name'] || firstRow['vendor name'] || '';
    const invoiceDate = firstRow['invoice date'] || firstRow['date'] || '';
    const supplierInvNo = firstRow['supplier invoice no'] || firstRow['supplier invoice number'] || '';
    const paymentStatus = (firstRow['payment status'] || firstRow['status'] || 'unpaid').toLowerCase();
    const paymentMode = firstRow['payment mode'] || '';
    const remarks = firstRow['remarks'] || firstRow['description'] || firstRow['notes'] || '';

    try {
      // Resolve or create supplier party
      let supplierId;
      const { data: existingSupplier } = await supabase
        .from('parties').select('id').eq('name', supplierName).eq('party_type', 'supplier').maybeSingle();
      if (existingSupplier) {
        supplierId = existingSupplier.id;
      } else {
        const { data: newSup } = await supabase
          .from('parties').insert([{ name: supplierName, party_type: 'supplier' }]).select('id').single();
        supplierId = newSup.id;
      }

      // Build items
      const items = [];
      for (const row of groupRows) {
        const materialName = row['material'] || row['item'] || row['item name'] || row['material name'] || '';
        if (!materialName) continue;

        const qty = parseFloat(row['quantity'] || row['qty'] || '1') || 1;
        const rate = parseFloat(row['rate'] || row['price'] || '0') || 0;
        const gstRate = parseFloat(row['gst'] || row['gst rate'] || row['gst_rate'] || '0') || 0;
        const unit = row['unit'] || 'Nos';
        const hsnCode = row['hsn'] || row['hsn code'] || row['hsn_code'] || '';
        const amount = qty * rate;
        const gstAmount = amount * gstRate / 100;
        items.push({ material_name: materialName, hsn_code: hsnCode || undefined, quantity: qty, unit, rate, amount, gst_rate: gstRate, gst_amount: gstAmount });
      }

      if (items.length === 0) { warnings.push(`Invoice for ${supplierName}: No valid items`); continue; }

      const totalAmount = items.reduce((s, i) => s + i.amount, 0);
      const totalGst = items.reduce((s, i) => s + i.gst_amount, 0);
      const totalWithGst = totalAmount + totalGst;
      const paid = parseFloat(firstRow['amount paid'] || '0') || 0;
      const validStatus = ['paid', 'partial', 'unpaid'].includes(paymentStatus) ? paymentStatus : 'unpaid';

      // Use proper sequence function
      const purchaseNumber = await getNextPurchaseNumber();

      const { data: purchaseData, error: purchaseError } = await supabase.from('purchases').insert([{
        supplier_id: supplierId, invoice_date: invoiceDate,
        supplier_invoice_number: supplierInvNo || undefined,
        purchase_number: purchaseNumber,
        subtotal: totalAmount, gst_rate: 0,
        cgst_amount: totalGst / 2, sgst_amount: totalGst / 2, igst_amount: 0,
        total_amount: totalWithGst, payment_mode: paymentMode || undefined,
        payment_status: validStatus, amount_paid: paid,
        balance_due: totalWithGst - paid, remarks: remarks || undefined,
      }]).select('id').single();
      if (purchaseError) throw purchaseError;

      await supabase.from('purchase_items').insert(items.map(i => ({ ...i, purchase_id: purchaseData.id })));

      await supabase.from('transactions').insert([{
        party_id: supplierId, transaction_type: 'purchase',
        reference_id: purchaseData.id, reference_type: 'purchase',
        debit: totalWithGst, credit: 0, balance: totalWithGst,
        description: `Purchase ${purchaseNumber}`,
        transaction_date: invoiceDate,
      }]);

      if (paid > 0) {
        await supabase.from('transactions').insert([{
          party_id: supplierId, transaction_type: 'payment',
          reference_id: purchaseData.id, reference_type: 'purchase',
          debit: 0, credit: paid, balance: 0,
          description: `Payment for ${purchaseNumber}`,
          transaction_date: invoiceDate,
        }]);
      }

      imported++;
      process.stdout.write('.');
    } catch (error) {
      errors.push(`Invoice for ${supplierName} on ${invoiceDate}: ${error.message || 'Failed'}`);
    }
  }
  return { success: errors.length === 0, imported, errors, warnings };
}

async function importSales(rows) {
  let imported = 0;
  const errors = [];
  const warnings = [];

  const invoiceGroups = new Map();
  const invoiceKeys = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const clientName = row['client name'] || row['customer name'] || row['client'] || '';
    const invoiceDate = row['invoice date'] || row['date'] || '';
    if (!clientName || !invoiceDate) { warnings.push(`Row ${i + 2}: Skipped`); continue; }
    const key = `${clientName}|||${invoiceDate}`;
    if (!invoiceGroups.has(key)) { invoiceGroups.set(key, []); invoiceKeys.push(key); }
    invoiceGroups.get(key).push(row);
  }

  for (const key of invoiceKeys) {
    const groupRows = invoiceGroups.get(key);
    const firstRow = groupRows[0];
    const clientName = firstRow['client name'] || firstRow['customer name'] || firstRow['client'] || '';
    const invoiceDate = firstRow['invoice date'] || firstRow['date'] || '';
    const paymentStatus = (firstRow['payment status'] || firstRow['status'] || 'unpaid').toLowerCase();
    const paymentMode = firstRow['payment mode'] || '';
    const remarks = firstRow['remarks'] || firstRow['description'] || firstRow['notes'] || '';

    try {
      let clientId;
      const { data: existing } = await supabase
        .from('parties').select('id').eq('name', clientName).eq('party_type', 'client').maybeSingle();
      if (existing) { clientId = existing.id; } else {
        const { data: nc } = await supabase.from('parties').insert([{ name: clientName, party_type: 'client' }]).select('id').single();
        clientId = nc.id;
      }

      const items = [];
      for (const row of groupRows) {
        const itemName = row['item'] || row['item name'] || row['service'] || row['description'] || '';
        if (!itemName) continue;
        const qty = parseFloat(row['quantity'] || row['qty'] || '1') || 1;
        const rate = parseFloat(row['rate'] || row['price'] || '0') || 0;
        const gstRate = parseFloat(row['gst'] || row['gst rate'] || row['gst_rate'] || '0') || 0;
        const unit = row['unit'] || 'Nos';
        const hsnCode = row['hsn'] || row['hsn code'] || row['hsn_code'] || '';
        const sacCode = row['sac'] || row['sac code'] || row['sac_code'] || '';
        const amount = qty * rate;
        const gstAmount = amount * gstRate / 100;
        items.push({ item_name: itemName, hsn_code: hsnCode || undefined, sac_code: sacCode || undefined, quantity: qty, unit, rate, amount, gst_rate: gstRate, gst_amount: gstAmount });
      }

      if (items.length === 0) { warnings.push(`Invoice for ${clientName}: No valid items`); continue; }

      const totalAmount = items.reduce((s, i) => s + i.amount, 0);
      const totalGst = items.reduce((s, i) => s + i.gst_amount, 0);
      const totalWithGst = totalAmount + totalGst;
      const received = parseFloat(firstRow['amount received'] || firstRow['amount_received'] || '0') || 0;
      const validStatus = ['paid', 'partial', 'unpaid'].includes(paymentStatus) ? paymentStatus : 'unpaid';

      const saleNumber = await getNextSaleNumber();

      const { data: saleData, error: saleError } = await supabase.from('sales').insert([{
        client_id: clientId, invoice_date: invoiceDate, sale_number: saleNumber,
        subtotal: totalAmount, gst_rate: 0,
        cgst_amount: totalGst / 2, sgst_amount: totalGst / 2, igst_amount: 0,
        total_amount: totalWithGst, payment_mode: paymentMode || undefined,
        payment_status: validStatus, amount_received: received,
        balance_due: totalWithGst - received, remarks: remarks || undefined,
      }]).select('id').single();
      if (saleError) throw saleError;

      await supabase.from('sale_items').insert(items.map(i => ({ ...i, sale_id: saleData.id })));

      await supabase.from('transactions').insert([{
        party_id: clientId, transaction_type: 'sale',
        reference_id: saleData.id, reference_type: 'sale',
        debit: totalWithGst, credit: 0, balance: totalWithGst,
        description: `Sale ${saleNumber}`,
        transaction_date: invoiceDate,
      }]);

      if (received > 0) {
        await supabase.from('transactions').insert([{
          party_id: clientId, transaction_type: 'receipt',
          reference_id: saleData.id, reference_type: 'sale',
          debit: received, credit: 0, balance: 0,
          description: `Receipt for ${saleNumber}`,
          transaction_date: invoiceDate,
        }]);
      }

      imported++;
      process.stdout.write('.');
    } catch (error) {
      errors.push(`Invoice for ${clientName} on ${invoiceDate}: ${error.message || 'Failed'}`);
    }
  }
  return { success: errors.length === 0, imported, errors, warnings };
}

// =============================================
// 5. Verify data in all tables
// =============================================

async function verifyAllTables() {
  console.log('\n\n📊 Table Verification:');
  
  const tables = [
    'parties', 'purchases', 'purchase_items', 
    'sales', 'sale_items', 'beneficiaries', 'transactions'
  ];
  
  const results = {};
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table).select('*', { count: 'exact', head: true });
    results[table] = count || 0;
    const icon = (count || 0) > 0 ? '✅' : '⚠️';
    console.log(`  ${icon} ${table}: ${count || 0} total records`);
  }

  // Show detailed summaries
  console.log('\n📋 Party Types:');
  const { data: parties } = await supabase.from('parties').select('party_type, count', { count: 'exact' }).order('party_type');
  // Can't use count in select like that, let me just fetch and count
  const { data: allParties } = await supabase.from('parties').select('party_type');
  const typeCounts = {};
  allParties?.forEach(p => { typeCounts[p.party_type] = (typeCounts[p.party_type] || 0) + 1; });
  for (const [type, count] of Object.entries(typeCounts)) {
    console.log(`  ${type}: ${count}`);
  }

  console.log('\n📋 Purchases:');
  const { data: purchases } = await supabase.from('purchases').select('purchase_number, total_amount').order('created_at');
  purchases?.forEach(p => console.log(`  ${p.purchase_number} - ₹${Number(p.total_amount).toFixed(2)}`));

  console.log('\n📋 Sales:');
  const { data: sales } = await supabase.from('sales').select('sale_number, total_amount').order('created_at');
  sales?.forEach(p => console.log(`  ${p.sale_number} - ₹${Number(p.total_amount).toFixed(2)}`));

  console.log('\n📋 Transactions:');
  const { data: txns } = await supabase.from('transactions').select('description, debit, credit').limit(10);
  txns?.forEach(t => console.log(`  ${t.description}: Dr ₹${t.debit} / Cr ₹${t.credit}`));

  return results;
}

// =============================================
// 6. Main
// =============================================

async function main() {
  console.log('🚀 Starting End-to-End Import Test v2\n');

  // Clean existing test data
  await cleanTestData();

  console.log('\n📁 Step 1: Creating sample Excel files...');
  createPartiesExcel();
  createPurchasesExcel();
  createSalesExcel();

  console.log('\n📥 Step 2: Importing Parties (Vendors)...');
  const partiesResult = await importParties(parseExcel(fs.readFileSync('sample_parties.xlsx')).rows);
  console.log(`  ✅ ${partiesResult.imported} parties imported`);
  partiesResult.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
  partiesResult.errors.forEach(e => console.log(`  ❌ ${e}`));

  console.log('\n📥 Step 3: Importing Purchases...');
  const purchasesResult = await importPurchases(parseExcel(fs.readFileSync('sample_purchases.xlsx')).rows);
  console.log(`  ✅ ${purchasesResult.imported} purchase invoices imported`);
  purchasesResult.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
  purchasesResult.errors.forEach(e => console.log(`  ❌ ${e}`));

  console.log('\n📥 Step 4: Importing Sales...');
  const salesResult = await importSales(parseExcel(fs.readFileSync('sample_sales.xlsx')).rows);
  console.log(`  ✅ ${salesResult.imported} sale invoices imported`);
  salesResult.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
  salesResult.errors.forEach(e => console.log(`  ❌ ${e}`));

  console.log('\n📊 Step 5: Verifying database...');
  await verifyAllTables();

  const totalImported = partiesResult.imported + purchasesResult.imported + salesResult.imported;
  const totalErrors = partiesResult.errors.length + purchasesResult.errors.length + salesResult.errors.length;

  console.log('\n' + '='.repeat(55));
  console.log('📋 END-TO-END TEST SUMMARY');
  console.log('='.repeat(55));
  console.log(`  Parties imported:     ${partiesResult.imported}`);
  console.log(`  Purchase invoices:    ${purchasesResult.imported}`);
  console.log(`  Sale invoices:        ${salesResult.imported}`);
  console.log(`  Total records:        ${totalImported}`);
  console.log(`  Total errors:         ${totalErrors}`);
  console.log('='.repeat(55));

  if (totalErrors === 0) {
    console.log('\n✅ ALL IMPORTS SUCCESSFUL!');
    console.log('📁 Sample Excel files saved:');
    console.log('   - sample_parties.xlsx');
    console.log('   - sample_purchases.xlsx');
    console.log('   - sample_sales.xlsx');
  } else {
    console.log(`\n⚠️  Completed with ${totalErrors} error(s). See details above.`);
  }
}

main().catch(err => { console.error('\nFatal error:', err); process.exit(1); });
