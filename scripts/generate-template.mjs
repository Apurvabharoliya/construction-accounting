import * as XLSX from 'xlsx';
import { writeFile } from 'fs';

const headers = ['Date', "Vendor's name", 'Description/Particulars', 'Debit/Purchase', 'Credit/Payment', 'Balance'];
const data = [
  headers,
  ['01-04-2025', 'ABC Constructions', 'Cement purchase - foundation work', 59000, 0, 59000],
  ['05-04-2025', 'ABC Constructions', 'Payment for cement purchase', 0, 30000, 29000],
  ['10-04-2025', 'PQR Developers', 'Construction service - floor work', 0, 118000, 118000],
  ['15-04-2025', 'XYZ Traders', 'Steel rods purchase', 45000, 45000, 0],
];

const ws = XLSX.utils.aoa_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
XLSX.writeFile(wb, 'import_template.xlsx');
console.log('Template created: import_template.xlsx');
