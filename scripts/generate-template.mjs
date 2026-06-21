import * as XLSX from 'xlsx';
import { writeFile } from 'fs';

const TEMPLATES = {
  purchases: {
    headers: ['Supplier name', 'Date', 'Village', 'Invoice number', 'Material', 'Quantity', 'Unit', 'Rate', 'Amount'],
    data: [
      ['M/s Bhardwaj Constructions', '2025-04-01', 'Varnama', 'BIL-001', 'OPC Cement 53 Grade', 200, 'Bag', 380, 76000],
      ['M/s Bhardwaj Constructions', '2025-04-01', 'Dharapura', 'BIL-001', 'TMT Steel Bars 12mm', 100, 'Kg', 78, 7800],
      ['Sharma Traders', '2025-04-05', 'Dodhka', 'ST-001', 'Clay Bricks', 10000, 'Nos', 9, 90000],
    ]
  },
  beneficiaries: {
    headers: ['Application no.', 'Village', 'Name', 'Plinth', 'Lintel', 'Roof', 'Finishing', 'Balance'],
    data: [
      ['APP-001', 'Varnama', 'Ram Prasad Sharma', 120000, 80000, 100000, 50000, -400000],
      ['APP-002', 'Dharapura', 'Sita Devi', 100000, 75000, 90000, 40000, -400000],
      ['APP-003', 'Rayka', 'Lal Bahadur', 150000, 90000, 110000, 60000, -400000],
    ]
  },
  parties: {
    headers: ['Name', 'Type', 'Phone', 'Email', 'Address', 'GSTIN', 'Opening Balance', 'Notes'],
    data: [
      ['ABC Constructions', 'Supplier', '9876543210', 'info@abc.com', 'Plot 45, Sector 12', '27AABCU1234D1Z5', 0, 'Cement supplier'],
      ['Patel Infra', 'Beneficiary', '9876543211', '', '123, Skyline Tower', '', -400000, 'PM Awas Yojana'],
    ]
  },
  sales: {
    headers: ['Client name', 'Date', 'Item', 'Quantity', 'Unit', 'Rate', 'Amount'],
    data: [
      ['Patel Infrastructure', '2025-04-02', 'Construction Service', 1, 'Lump Sum', 250000, 250000],
      ['Verma Developers', '2025-04-08', 'Architecture Consultation', 1, 'Hour', 5000, 5000],
    ]
  },
  transactions: {
    headers: ['Date', "Vendor's name", 'Description/Particulars', 'Debit/Purchase', 'Credit/Payment', 'Balance'],
    data: [
      ['01-04-2025', 'ABC Constructions', 'Cement purchase - foundation work', 59000, 0, 59000],
      ['05-04-2025', 'ABC Constructions', 'Payment for cement purchase', 0, 30000, 29000],
      ['10-04-2025', 'PQR Developers', 'Construction service - floor work', 0, 118000, 118000],
      ['15-04-2025', 'XYZ Traders', 'Steel rods purchase', 45000, 45000, 0],
    ]
  }
};

// Generate individual template files
for (const [type, template] of Object.entries(TEMPLATES)) {
  const ws = XLSX.utils.aoa_to_sheet([template.headers, ...template.data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, type);
  XLSX.writeFile(wb, `${type}_import_template.xlsx`);
  console.log(`✅ Created ${type}_import_template.xlsx`);
}

// Also generate the original combined template for backward compatibility
const legacyHeaders = ['Date', "Vendor's name", 'Description/Particulars', 'Debit/Purchase', 'Credit/Payment', 'Balance'];
const legacyData = TEMPLATES.transactions;
const wsLegacy = XLSX.utils.aoa_to_sheet([legacyHeaders, ...legacyData.data]);
const wbLegacy = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbLegacy, wsLegacy, 'Sheet1');
XLSX.writeFile(wbLegacy, 'import_template.xlsx');
console.log('✅ Created import_template.xlsx (legacy format)');

console.log('\n📋 All templates generated successfully!');
console.log('Files created:');
for (const type of Object.keys(TEMPLATES)) {
  console.log(`  - ${type}_import_template.xlsx`);
}
console.log('  - import_template.xlsx');
