/**
 * Diagnose the user's specific file: Date, Particulars/Description, Debit/Purchase, Credit/payment, Balance
 * Tests the actual import.ts functions to find the bug
 */

// Copy of the relevant functions from import.ts
function buildColumnMap(fileHeaders, definitions) {
  const lowerHeaders = fileHeaders.map(h => h.toLowerCase().trim());
  const usedIndices = new Set();
  const map = new Map();
  for (const def of definitions) {
    let found = false;
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

function headerContains(headers, ...keywords) {
  return keywords.some(kw => headers.some(h => h.toLowerCase().trim().includes(kw)));
}

function headerMatches(headers, ...names) {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  return names.some(n => lowerHeaders.includes(n));
}

function detectEntityType(headers) {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  const headerSet = new Set(lowerHeaders);

  let partyScore = 0, purchaseScore = 0, saleScore = 0, txnScore = 0;

  if (headerSet.has('name') || headerSet.has('party')) partyScore += 3;
  if (headerContains(lowerHeaders, 'type')) partyScore += 2;
  if (headerContains(lowerHeaders, 'phone', 'mobile', 'contact')) partyScore += 1;
  if (headerContains(lowerHeaders, 'gstin', 'gst', 'gst no')) partyScore += 1;
  if (headerContains(lowerHeaders, 'email')) partyScore += 1;
  if (headerContains(lowerHeaders, 'address')) partyScore += 1;
  if (headerContains(lowerHeaders, 'opening balance', 'opening_balance')) partyScore += 1;

  if (headerContains(lowerHeaders, 'supplier', 'vendor')) purchaseScore += 3;
  if (headerContains(lowerHeaders, 'material', 'item', 'product', 'goods')) purchaseScore += 3;
  if (headerContains(lowerHeaders, 'quantity', 'qty')) purchaseScore += 1;
  if (headerContains(lowerHeaders, 'rate', 'price', 'unit price')) purchaseScore += 1;
  if (headerContains(lowerHeaders, 'purchase', 'invoice no', 'bill no')) purchaseScore += 1;

  if (headerContains(lowerHeaders, 'client', 'customer')) saleScore += 3;
  if (headerContains(lowerHeaders, 'material', 'item', 'product', 'service', 'work')) saleScore += 3;
  if (headerContains(lowerHeaders, 'quantity', 'qty')) saleScore += 1;
  if (headerContains(lowerHeaders, 'rate', 'price', 'unit price')) saleScore += 1;
  if (headerContains(lowerHeaders, 'sale', 'invoice no', 'bill no')) saleScore += 1;

  if (headerContains(lowerHeaders, 'debit', 'dr')) txnScore += 4;
  if (headerContains(lowerHeaders, 'credit', 'cr')) txnScore += 4;
  if (headerContains(lowerHeaders, 'balance', 'bal')) txnScore += 2;
  if (headerContains(lowerHeaders, 'description', 'particulars', 'narration', 'particular')) txnScore += 1;
  if (headerContains(lowerHeaders, 'voucher', 'ref', 'cheque')) txnScore += 1;

  if (headerSet.has('name') && (headerSet.has('type') || headerSet.has('party type') || headerSet.has('vendor type') || headerSet.has('party_type'))) {
    partyScore += 5;
  }
  if (headerMatches(lowerHeaders, 'supplier name', 'vendor name', 'supplier') &&
      headerMatches(lowerHeaders, 'material', 'item', 'item name', 'material name', 'product')) {
    purchaseScore += 5;
  }
  if (headerMatches(lowerHeaders, 'client name', 'customer name', 'client', 'customer') &&
      headerMatches(lowerHeaders, 'material', 'item', 'item name', 'material name', 'product')) {
    saleScore += 5;
  }
  if (headerContains(lowerHeaders, 'date') && 
      headerContains(lowerHeaders, 'debit', 'dr') &&
      headerContains(lowerHeaders, 'credit', 'cr')) {
    txnScore += 5;
  }

  if (partyScore >= 2 && txnScore >= 3 && txnScore >= purchaseScore && txnScore >= saleScore) {
    return 'transactions';
  }
  if (txnScore >= 5 && txnScore > partyScore && txnScore > purchaseScore && txnScore > saleScore) return 'transactions';
  if (purchaseScore >= 5 && purchaseScore > partyScore && purchaseScore > saleScore && purchaseScore > txnScore) return 'purchases';
  if (saleScore >= 5 && saleScore > partyScore && saleScore > purchaseScore && saleScore > txnScore) return 'sales';
  if (partyScore >= 3 && partyScore >= purchaseScore && partyScore >= saleScore && partyScore > txnScore) return 'parties';
  if (txnScore >= 4 && txnScore >= partyScore && txnScore >= purchaseScore && txnScore >= saleScore) return 'transactions';
  if (purchaseScore >= 3 && purchaseScore >= saleScore && purchaseScore >= txnScore) return 'purchases';
  if (saleScore >= 3 && saleScore >= purchaseScore && saleScore >= txnScore) return 'sales';

  return 'unknown';
}

// =============================================
// Column defs (from import.ts)
// =============================================

const TRANSACTION_COLUMNS = [
  { field: 'date', aliases: ['date', 'transaction date', 'txn date', 'entry date', 'posting date', 'value date', 'voucher date'], keywords: ['date'] },
  { field: 'description', aliases: ['description', 'particulars', 'narration', 'details', 'remarks', 'notes', 'remark', 'note', 'transaction description'], keywords: ['description', 'particular', 'narration'] },
  { field: 'debit', aliases: ['debit', 'debit amount', 'dr', 'debit/purchase', 'debit/ purchase', 'debit amount'], keywords: ['debit', 'dr'] },
  { field: 'credit', aliases: ['credit', 'credit amount', 'cr', 'credit/purchase', 'credit/ purchase', 'credit/payment', 'credit/ payment', 'credit amount'], keywords: ['credit', 'cr'] },
  { field: 'balance', aliases: ['balance', 'running balance', 'closing balance', 'bal', 'balance amount', 'total amount'], keywords: ['balance', 'bal', 'total'] },
  { field: 'party', aliases: ['party', 'party name', 'name', 'account name', 'ledger name', 'account', 'supplier', 'vendor', 'client', 'customer'], keywords: ['party', 'account', 'ledger'] },
  { field: 'voucher_type', aliases: ['voucher type', 'type', 'transaction type', 'voucher', 'txn type', 'voucher_type'], keywords: ['voucher', 'transaction type'] },
  { field: 'voucher_no', aliases: ['voucher no', 'voucher number', 'voucher no.', 'ref no', 'reference no', 'ref', 'cheque no', 'check no'], keywords: ['voucher', 'ref', 'cheque'] },
];

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

const PURCHASE_COLUMNS = [
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
];

console.log('='.repeat(70));
console.log('USER FILE DIAGNOSTIC');
console.log('='.repeat(70));

const headers = ['Date', 'Particulars/Description', 'Debit/Purchase', 'Credit/payment', 'Balance'];
console.log(`Headers: ${headers.join(' | ')}`);
console.log(`Lowered: ${headers.map(h => h.toLowerCase().trim()).join(' | ')}`);

// 1. Test detection
const detected = detectEntityType(headers);
console.log(`\n1. Detected type: "${detected}"`);

// 2. Test transaction column mapping
console.log('\n2. TRANSACTION column mapping:');
const txnMap = buildColumnMap(headers, TRANSACTION_COLUMNS);
for (const def of TRANSACTION_COLUMNS) {
  const matched = txnMap.get(def.field);
  console.log(`   ${matched ? '✅' : '❌'} ${def.field} ← "${matched || 'NOT MAPPED'}"`);
}

// 3. Test party column mapping (in case user forces as parties)
console.log('\n3. PARTY column mapping (if forced):');
const partyMap = buildColumnMap(headers, PARTY_COLUMNS);
for (const def of PARTY_COLUMNS) {
  const matched = partyMap.get(def.field);
  if (matched) console.log(`   ✅ ${def.field} ← "${matched}"`);
}
console.log(`   (${partyMap.size} fields mapped out of ${PARTY_COLUMNS.length})`);

// 4. Check if importTransactions would work
console.log('\n4. Would importTransactions work?');
const hasParty = txnMap.has('party');
console.log(`   Has party column? ${hasParty}`);
if (!hasParty) {
  console.log('   ❌ FAILS: No party/account column found!');
  console.log('   Since this is a single-account statement, there is no party column.');
  console.log('   The import would return an error without importing anything.');
}

// 5. Show row parsing
console.log('\n5. If rows were parsed, fields accessible via getField:');
const row = { 
  'date': '01-04-2025', 
  'particulars/description': 'Cement purchase from ABC Constructions',
  'debit/purchase': '50000',
  'credit/payment': '',
  'balance': '100000'
};

function getField(rowData, columnMap, field) {
  const header = columnMap.get(field);
  return header ? (rowData[header] || '') : '';
}

console.log(`   date: "${getField(row, txnMap, 'date')}"`);
console.log(`   description: "${getField(row, txnMap, 'description')}"`);
console.log(`   debit: "${getField(row, txnMap, 'debit')}"`);
console.log(`   credit: "${getField(row, txnMap, 'credit')}"`);
console.log(`   balance: "${getField(row, txnMap, 'balance')}"`);
console.log(`   party: "${getField(row, txnMap, 'party')}"`);

console.log('\n' + '='.repeat(70));
console.log('CONCLUSION:');
console.log('='.repeat(70));
console.log(`
Your file has a ledger/bank statement format with these columns:
  - Date, Particulars/Description, Debit/Purchase, Credit/payment, Balance

The auto-detection correctly identifies this as "transactions" (score: high).
The column mapping correctly maps: date ✓, description ✓, debit ✓, credit ✓, balance ✓

BUT the problem is: there is NO party/account column in your file.
The importTransactions() requires a party name column, so it fails.

Your file appears to be a single-account statement (like a bank statement or 
a specific party's ledger). Since it doesn't say WHICH party each entry 
belongs to, the import can't associate transactions with parties.

What would you like to do with this data?
`);
