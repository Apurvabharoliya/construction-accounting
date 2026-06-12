/**
 * Import Diagnostic Script
 * Traces the import flow step by step to find why only 'name' is imported
 */

import XLSX from 'xlsx';

// =============================================
// Simulate buildColumnMap from import.ts
// =============================================

const PARTY_COLUMNS = [
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
];

function buildColumnMap(fileHeaders, definitions) {
  const lowerHeaders = fileHeaders.map(h => h.toLowerCase().trim());
  const usedIndices = new Set();
  const map = new Map();

  for (const def of definitions) {
    let found = false;
    // Exact alias match
    for (let i = 0; i < lowerHeaders.length; i++) {
      if (usedIndices.has(i)) continue;
      if (def.aliases.includes(lowerHeaders[i])) {
        map.set(def.field, lowerHeaders[i]);
        usedIndices.add(i);
        found = true;
        break;
      }
    }
    if (found) continue;

    // Keyword match
    for (let i = 0; i < lowerHeaders.length; i++) {
      if (usedIndices.has(i)) continue;
      if (def.keywords.some(kw => lowerHeaders[i].includes(kw))) {
        map.set(def.field, lowerHeaders[i]);
        usedIndices.add(i);
        found = true;
        break;
      }
    }
  }

  return map;
}

// =============================================
// Test with various header formats
// =============================================

const testCases = [
  // Standard exact match headers
  ['Name', 'Type', 'Phone', 'Email', 'Address', 'City', 'State', 'GSTIN', 'Opening Balance', 'Notes'],
  // Common Indian accounting Excel headers
  ['Party Name', 'Party Type', 'Contact No', 'Email ID', 'GST No', 'Address', 'City', 'State', 'Opening Balance'],
  // Short headers
  ['name', 'type', 'phone', 'email'],
  // Headers from a bank/ledger statement
  ['Date', 'Description', 'Debit', 'Credit', 'Balance', 'Party Name'],
  // Purchase headers
  ['Supplier Name', 'Invoice Date', 'Material', 'HSN', 'Quantity', 'Unit', 'Rate', 'GST %'],
  // Sale headers
  ['Client Name', 'Invoice Date', 'Item', 'SAC', 'Quantity', 'Rate', 'GST %'],
];

console.log('='.repeat(70));
console.log('COLUMN MAPPING DIAGNOSTIC');
console.log('='.repeat(70));

for (const headers of testCases) {
  console.log(`\n📋 Headers: ${headers.join(' | ')}`);
  
  // Simulate parseExcelFile (lowercases headers)
  const lowerHeaders = headers.map(h => String(h || '').trim().toLowerCase());
  console.log(`   Lowered: ${lowerHeaders.join(' | ')}`);
  
  const colMap = buildColumnMap(headers, PARTY_COLUMNS);
  const expectedFields = ['name', 'type', 'phone', 'email', 'gstin', 'pan', 'address', 'city', 'state', 'pin_code', 'opening_balance', 'gst_registered', 'notes'];
  
  console.log(`   Column Mappings:`);
  let mappedCount = 0;
  for (const field of expectedFields) {
    const matched = colMap.get(field);
    if (matched) {
      console.log(`     ✅ ${field} ← "${matched}"`);
      mappedCount++;
    } else {
      console.log(`     ❌ ${field} ← NOT MAPPED`);
    }
  }
  console.log(`   Result: ${mappedCount}/${expectedFields} fields mapped`);
}

// =============================================
// Simulate the actual import flow for parties
// =============================================
console.log('\n\n' + '='.repeat(70));
console.log('SIMULATING FULL PARTY IMPORT FLOW');
console.log('='.repeat(70));

// Step 1: Create a sample Excel file with various header names
function testImportFlow(headers, data) {
  console.log(`\n📥 Test: ${headers.join(' | ')}`);
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  // Parse the Excel file
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  const parsedHeaders = jsonData[0].map(h => String(h || '').trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (row.every(c => !c || String(c).trim() === '')) continue;
    const record = {};
    parsedHeaders.forEach((h, idx) => {
      record[h] = row[idx] !== undefined && row[idx] !== null ? String(row[idx]).trim() : '';
    });
    rows.push(record);
  }
  
  // Build column map  
  const colMap = buildColumnMap(parsedHeaders, PARTY_COLUMNS);
  
  // Show what getField would return
  console.log(`   Parsed headers: ${parsedHeaders.join(' | ')}`);
  console.log(`   Row data keys: ${Object.keys(rows[0]).join(' | ')}`);
  console.log(`   Column map:`);
  for (const [field, header] of colMap.entries()) {
    console.log(`     ${field} ← ${header} → "${rows[0][header] || '(empty)'}"`);
  }
  
  // Check which fields would have data in the insert
  console.log(`   Would insert with:`);
  const insert = {
    name: rows[0][colMap.get('name')] || '',
    phone: rows[0][colMap.get('phone')] || null,
    email: rows[0][colMap.get('email')] || null,
    gstin: rows[0][colMap.get('gstin')] || null,
    address: rows[0][colMap.get('address')] || null,
    city: rows[0][colMap.get('city')] || null,
    state: rows[0][colMap.get('state')] || null,
    notes: rows[0][colMap.get('notes')] || null,
  };
  for (const [k, v] of Object.entries(insert)) {
    console.log(`     ${k}: "${v}"`);
  }
  
  const nonNameFields = Object.entries(insert).filter(([k, v]) => k !== 'name' && v);
  if (nonNameFields.length === 0) {
    console.log(`   ❌ BUG DETECTED: Only the 'name' field has data! Other fields are empty!`);
  } else {
    console.log(`   ✅ ${nonNameFields.length} non-name fields have data`);
  }
}

// Test 1: Standard Excel headers (like the template)
testImportFlow(
  ['Name', 'Type', 'Phone', 'Email', 'GSTIN', 'Address', 'City', 'State', 'Notes'],
  [['ABC Constructions', 'Supplier', '9876543210', 'info@abc.com', '27AABCU1234D1Z5', '123 Main Road', 'Mumbai', 'Maharashtra', 'Test note']]
);

// Test 2: Indian accounting format headers
testImportFlow(
  ['Party Name', 'Party Type', 'Contact No', 'Email ID', 'GST No', 'Address', 'City', 'State'],
  [['ABC Constructions', 'Supplier', '9876543210', 'info@abc.com', '27AABCU1234D1Z5', '123 Main Road', 'Mumbai', 'Maharashtra']]
);

// Test 3: Vendor import format
testImportFlow(
  ['Vendor Name', 'Vendor Type', 'Mobile', 'Email Address', 'GSTIN', 'Address Line', 'City/Town', 'State'],
  [['ABC Constructions', 'Supplier', '9876543210', 'info@abc.com', '27AABCU1234D1Z5', '123 Main Road', 'Mumbai', 'Maharashtra']]
);

// Test 4: Headers with spaces and varied casing
testImportFlow(
  ['VENDOR NAME', 'TYPE', 'PHONE NO', 'EMAIL ADDRESS', 'GST NUMBER', 'ADDRESS', 'CITY', 'STATE'],
  [['ABC Constructions', 'Supplier', '9876543210', 'info@abc.com', '27AABCU1234D1Z5', '123 Main Road', 'Mumbai', 'Maharashtra']]
);
