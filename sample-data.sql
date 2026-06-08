-- =============================================
-- Construction Accounting App - Sample Data
-- Run this AFTER supabase-schema.sql
-- UUID prefixes: a=suppliers, b=clients, c=beneficiaries, d=debtors, e=purchases, f=sales
-- =============================================

-- =============================================
-- 1. PARTIES - Suppliers, Clients, Beneficiaries, Debtors
-- =============================================

-- SUPPLIERS (Construction Material Dealers)
INSERT INTO parties (id, name, phone, email, gstin, pan, address, city, state, pin_code, party_type, opening_balance, gst_registered, bank_name, bank_account, ifsc_code) VALUES
('a1000000-0000-0000-0000-000000000001', 'Shree Cement Traders', '9876543210', 'shree.cement@gmail.com', '27AABFS1234M1ZP', 'AABFS1234M', '123, Main Market, Near Bus Stand', 'Nagpur', 'Maharashtra', '440001', 'supplier', 25000.00, true, 'State Bank of India', '30123456789', 'SBIN0001234'),
('a1000000-0000-0000-0000-000000000002', 'Jai Steel & Hardware', '9876543211', 'jai.steel@gmail.com', '27AABFJ5678M1ZQ', 'AABFJ5678M', '456, Industrial Area Phase 2', 'Nagpur', 'Maharashtra', '440002', 'supplier', 18500.00, true, 'HDFC Bank', '50123456789', 'HDFC0001234'),
('a1000000-0000-0000-0000-000000000003', 'Kamal Sand & Gravel Co.', '9876543212', 'kamal.sand@gmail.com', '27AABFK9012M1ZR', 'AABFK9012M', '789, Riverside Road', 'Wardha', 'Maharashtra', '442001', 'supplier', 12000.00, true, 'Punjab National Bank', '40123456789', 'PUNB0001234'),
('a1000000-0000-0000-0000-000000000004', 'Patel Electricals', '9876543213', 'patel.electricals@gmail.com', '27AABFP3456M1ZS', 'AABFP3456M', '101, MG Road, Dharampeth', 'Nagpur', 'Maharashtra', '440010', 'supplier', 8500.00, true, 'Bank of Maharashtra', '60123456789', 'MAHB0001234'),
('a1000000-0000-0000-0000-000000000005', 'Raj Paints & Chemicals', '9876543214', 'raj.paints@gmail.com', '27AABFR7890M1ZT', 'AABFR7890M', '202, Sadar Bazaar', 'Nagpur', 'Maharashtra', '440003', 'supplier', 6500.00, true, 'Central Bank of India', '70123456789', 'CBIN0001234'),
('a1000000-0000-0000-0000-000000000006', 'Om Pipes & Fittings', '9876543215', 'om.pipes@gmail.com', '27AABFP2345M1ZU', 'AABFP2345M', '333, Ring Road, Sitabuldi', 'Nagpur', 'Maharashtra', '440012', 'supplier', 4200.00, true, 'UCO Bank', '80123456789', 'UCBA0001234'),
('a1000000-0000-0000-0000-000000000007', 'Ganesh Tiles & Marble', '9876543216', 'ganesh.tiles@gmail.com', '27AABFG6789M1ZV', 'AABFG6789M', '444, Ganeshpeth', 'Nagpur', 'Maharashtra', '440018', 'supplier', 9800.00, true, 'Indian Bank', '90123456789', 'IDIB0001234');

-- CLIENTS (People getting houses built)
INSERT INTO parties (id, name, phone, email, address, city, state, pin_code, party_type, opening_balance) VALUES
('b1000000-0000-0000-0000-000000000001', 'Rajesh Kumar Sharma', '9123456780', 'rajesh.sharma@gmail.com', '15, Nehru Nagar, Ward No. 8', 'Nagpur', 'Maharashtra', '440008', 'client', 125000.00),
('b1000000-0000-0000-0000-000000000002', 'Suresh Baburao Deshmukh', '9123456781', 'suresh.deshmukh@gmail.com', '28, Rajiv Colony, Near School', 'Wardha', 'Maharashtra', '442002', 'client', 85000.00),
('b1000000-0000-0000-0000-000000000003', 'Prakash Ratanlal Jain', '9123456782', 'prakash.jain@gmail.com', '5, Lakdi Pul, Mahal', 'Nagpur', 'Maharashtra', '440006', 'client', 45000.00),
('b1000000-0000-0000-0000-000000000004', 'Sunil Vinodrao Bawane', '9123456783', 'sunil.bawane@gmail.com', '42, Mahatma Phule Ward', 'Chandrapur', 'Maharashtra', '442401', 'client', 92000.00),
('b1000000-0000-0000-0000-000000000005', 'Anita Vijaykumar Tiwari', '9123456784', 'anita.tiwari@gmail.com', '78, Subhash Nagar, Hingna Road', 'Nagpur', 'Maharashtra', '440016', 'client', 67000.00);

-- DEBTORS (Outstanding balance holders)
INSERT INTO parties (id, name, phone, address, city, state, pin_code, party_type, opening_balance) VALUES
('d1000000-0000-0000-0000-000000000001', 'Vikram Mohan Nair', '9234567890', '12, Shankar Nagar, Nagpur', 'Nagpur', 'Maharashtra', '440010', 'debtor', 35000.00),
('d1000000-0000-0000-0000-000000000002', 'Manoj Subhash Chaudhari', '9234567891', '56, New Colony, Katol Road', 'Nagpur', 'Maharashtra', '440013', 'debtor', 22000.00);

-- =============================================
-- 2. BENEFICIARIES (Government Subsidy - PMAY)
-- =============================================

INSERT INTO beneficiaries (id, party_id, aadhaar_number, property_address, subsidy_scheme, subsidy_amount_sanctioned, subsidy_status, subsidy_disbursement_date, construction_progress, total_amount_received, total_amount_due, payment_installments, notes) VALUES
('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '123456789012', '15, Nehru Nagar, Plot No. 42, Ward No. 8, Nagpur', 'PMAY-Urban', 267000.00, 'received', '2024-12-15', 75, 180000.00, 87000.00, 4, 'First installment of 67,000 received. Foundation completed.'),
('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', '234567890123', '28, Rajiv Colony, Near Z.P. School, Wardha', 'PMAY-Urban', 150000.00, 'approved', NULL, 45, 67000.00, 83000.00, 4, 'First installment approved. Waiting for disbursement.'),
('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', '345678901234', '5, Lakdi Pul, Mahal, Nagpur', 'PMAY-Urban', 200000.00, 'disbursed', '2024-11-20', 60, 133500.00, 66500.00, 4, 'Two installments received. Walls plastered.'),
('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000004', '456789012345', '42, Mahatma Phule Ward, Chandrapur', 'PMAY-Urban', 267000.00, 'pending', NULL, 20, 0.00, 267000.00, 4, 'Application submitted. Awaiting approval.'),
('c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000005', '567890123456', '78, Subhash Nagar, Hingna Road, Nagpur', 'PMAY-Urban', 220000.00, 'received', '2024-10-10', 90, 165000.00, 55000.00, 4, 'Three installments received. Roofing done.');

-- =============================================
-- 3. PURCHASES - Material purchases from suppliers
-- All dates in FY 2024-25 (April 2024 to March 2025)
-- Invoice numbers: PUR-2425-XXXX
-- Purchase UUIDs: e1000000-...
-- =============================================

-- PURCHASE 1: Cement (April 2024)
INSERT INTO purchases (id, purchase_number, supplier_id, invoice_date, supplier_invoice_number, subtotal, gst_rate, cgst_amount, sgst_amount, igst_amount, total_amount, payment_mode, payment_status, amount_paid, balance_due, remarks) VALUES
('e1000000-0000-0000-0000-000000000001', 'PUR-2425-0001', 'a1000000-0000-0000-0000-000000000001', '2024-04-15', 'SCT-001', 35000.00, 18, 3150.00, 3150.00, 0, 41300.00, 'Cash', 'paid', 41300.00, 0, 'OPC 43 grade cement bags for foundation work');
INSERT INTO purchase_items (purchase_id, material_name, hsn_code, quantity, unit, rate, amount, gst_rate, gst_amount) VALUES
('e1000000-0000-0000-0000-000000000001', 'OPC Cement 43 Grade', '2523', 100, 'Bag', 350.00, 35000.00, 18, 6300.00);

-- PURCHASE 2: Steel (April 2024)
INSERT INTO purchases (id, purchase_number, supplier_id, invoice_date, supplier_invoice_number, subtotal, gst_rate, cgst_amount, sgst_amount, igst_amount, total_amount, payment_mode, payment_status, amount_paid, balance_due, remarks) VALUES
('e1000000-0000-0000-0000-000000000002', 'PUR-2425-0002', 'a1000000-0000-0000-0000-000000000002', '2024-04-20', 'JS-015', 75000.00, 18, 6750.00, 6750.00, 0, 88500.00, 'Bank Transfer', 'paid', 88500.00, 0, 'TMT bars for columns and beams');
INSERT INTO purchase_items (purchase_id, material_name, hsn_code, quantity, unit, rate, amount, gst_rate, gst_amount) VALUES
('e1000000-0000-0000-0000-000000000002', 'TMT Bars 12mm', '7214', 50, 'Kg', 60.00, 30000.00, 18, 5400.00),
('e1000000-0000-0000-0000-000000000002', 'TMT Bars 16mm', '7214', 50, 'Kg', 58.00, 29000.00, 18, 5220.00),
('e1000000-0000-0000-0000-000000000002', 'TMT Bars 8mm', '7214', 30, 'Kg', 50.00, 16000.00, 18, 2880.00);

-- PURCHASE 3: Sand (May 2024)
INSERT INTO purchases (id, purchase_number, supplier_id, invoice_date, supplier_invoice_number, subtotal, gst_rate, cgst_amount, sgst_amount, igst_amount, total_amount, payment_mode, payment_status, amount_paid, balance_due, remarks) VALUES
('e1000000-0000-0000-0000-000000000003', 'PUR-2425-0003', 'a1000000-0000-0000-0000-000000000003', '2024-05-01', 'KSG-045', 18000.00, 5, 450.00, 450.00, 0, 18900.00, 'Cash', 'paid', 18900.00, 0, 'River sand for concrete mixing');
INSERT INTO purchase_items (purchase_id, material_name, hsn_code, quantity, unit, rate, amount, gst_rate, gst_amount) VALUES
('e1000000-0000-0000-0000-000000000003', 'Natural River Sand', '2505', 60, 'Qtl', 300.00, 18000.00, 5, 900.00);

-- PURCHASE 4: Electricals (May 2024)
INSERT INTO purchases (id, purchase_number, supplier_id, invoice_date, supplier_invoice_number, subtotal, gst_rate, cgst_amount, sgst_amount, igst_amount, total_amount, payment_mode, payment_status, amount_paid, balance_due, remarks) VALUES
('e1000000-0000-0000-0000-000000000004', 'PUR-2425-0004', 'a1000000-0000-0000-0000-000000000004', '2024-05-10', 'PE-089', 12000.00, 18, 1080.00, 1080.00, 0, 14160.00, 'UPI', 'partial', 10000.00, 4160.00, 'Wiring and switches for ground floor');
INSERT INTO purchase_items (purchase_id, material_name, hsn_code, quantity, unit, rate, amount, gst_rate, gst_amount) VALUES
('e1000000-0000-0000-0000-000000000004', 'Electrical Wire 2.5mm', '8536', 150, 'Metre', 40.00, 6000.00, 18, 1080.00),
('e1000000-0000-0000-0000-000000000004', 'Modular Switches', '8536', 25, 'Nos', 80.00, 2000.00, 18, 360.00),
('e1000000-0000-0000-0000-000000000004', 'MCB Circuit Breakers', '8537', 4, 'Nos', 250.00, 1000.00, 18, 180.00),
('e1000000-0000-0000-0000-000000000004', 'Distribution Board', '8537', 1, 'Nos', 3000.00, 3000.00, 18, 540.00);

-- PURCHASE 5: Pipes (June 2024)
INSERT INTO purchases (id, purchase_number, supplier_id, invoice_date, supplier_invoice_number, subtotal, gst_rate, cgst_amount, sgst_amount, igst_amount, total_amount, payment_mode, payment_status, amount_paid, balance_due, remarks) VALUES
('e1000000-0000-0000-0000-000000000005', 'PUR-2425-0005', 'a1000000-0000-0000-0000-000000000006', '2024-06-15', 'OPF-112', 8500.00, 18, 765.00, 765.00, 0, 10030.00, 'NEFT', 'paid', 10030.00, 0, 'Plumbing pipes and fittings');
INSERT INTO purchase_items (purchase_id, material_name, hsn_code, quantity, unit, rate, amount, gst_rate, gst_amount) VALUES
('e1000000-0000-0000-0000-000000000005', 'PVC Pipes 4 inch', '3917', 15, 'Metre', 200.00, 3000.00, 18, 540.00),
('e1000000-0000-0000-0000-000000000005', 'CPVC Pipes 1/2 inch', '3917', 10, 'Metre', 150.00, 1500.00, 18, 270.00),
('e1000000-0000-0000-0000-000000000005', 'PVC Elbows & Fittings', '3917', 20, 'Nos', 80.00, 1600.00, 18, 288.00),
('e1000000-0000-0000-0000-000000000005', 'Teflon Tape', '3917', 10, 'Nos', 30.00, 300.00, 18, 54.00),
('e1000000-0000-0000-0000-000000000005', 'PVC Solvent Cement', '3917', 5, 'Nos', 200.00, 1000.00, 18, 180.00);

-- PURCHASE 6: Tiles (July 2024)
INSERT INTO purchases (id, purchase_number, supplier_id, invoice_date, supplier_invoice_number, subtotal, gst_rate, cgst_amount, sgst_amount, igst_amount, total_amount, payment_mode, payment_status, amount_paid, balance_due, remarks) VALUES
('e1000000-0000-0000-0000-000000000006', 'PUR-2425-0006', 'a1000000-0000-0000-0000-000000000007', '2024-07-20', 'GT-201', 15000.00, 18, 1350.00, 1350.00, 0, 17700.00, 'Cash', 'paid', 17700.00, 0, 'Flooring tiles for bathroom and kitchen');
INSERT INTO purchase_items (purchase_id, material_name, hsn_code, quantity, unit, rate, amount, gst_rate, gst_amount) VALUES
('e1000000-0000-0000-0000-000000000006', 'Ceramic Floor Tiles 2x2', '6802', 30, 'Nos', 150.00, 4500.00, 18, 810.00),
('e1000000-0000-0000-0000-000000000006', 'Wall Tiles 2x1', '6802', 25, 'Nos', 120.00, 3000.00, 18, 540.00),
('e1000000-0000-0000-0000-000000000006', 'Bathroom Fittings Set', '7004', 2, 'Nos', 3500.00, 7000.00, 18, 1260.00),
('e1000000-0000-0000-0000-000000000006', 'Tile Adhesive', '3506', 10, 'Bag', 50.00, 500.00, 18, 90.00);

-- =============================================
-- 4. SALES - Sales to clients
-- All dates in FY 2024-25 (April 2024 to March 2025)
-- Invoice numbers: INV-2425-XXXX
-- Sale UUIDs: f1000000-...
-- =============================================

-- SALE 1: Rajesh - House Construction (April 2024)
INSERT INTO sales (id, sale_number, client_id, invoice_date, subtotal, gst_rate, cgst_amount, sgst_amount, igst_amount, total_amount, payment_mode, payment_status, amount_received, balance_due, remarks) VALUES
('f1000000-0000-0000-0000-000000000001', 'INV-2425-0001', 'b1000000-0000-0000-0000-000000000001', '2024-04-25', 250000.00, 18, 22500.00, 22500.00, 0, 295000.00, 'Bank Transfer', 'partial', 125000.00, 170000.00, 'Construction of 2 BHK house - Phase 1 (Foundation & Walls)');
INSERT INTO sale_items (sale_id, item_name, hsn_code, quantity, unit, rate, amount, gst_rate, gst_amount) VALUES
('f1000000-0000-0000-0000-000000000001', 'Construction Labour - Foundation', '9954', 1, 'Nos', 50000.00, 50000.00, 18, 9000.00),
('f1000000-0000-0000-0000-000000000001', 'Construction Labour - Walls', '9954', 1, 'Nos', 80000.00, 80000.00, 18, 14400.00),
('f1000000-0000-0000-0000-000000000001', 'Construction Labour - Slab', '9954', 1, 'Nos', 120000.00, 120000.00, 18, 21600.00);

-- SALE 2: Suresh - House Construction (May 2024)
INSERT INTO sales (id, sale_number, client_id, invoice_date, subtotal, gst_rate, cgst_amount, sgst_amount, igst_amount, total_amount, payment_mode, payment_status, amount_received, balance_due, remarks) VALUES
('f1000000-0000-0000-0000-000000000002', 'INV-2425-0002', 'b1000000-0000-0000-0000-000000000002', '2024-05-05', 180000.00, 18, 16200.00, 16200.00, 0, 212400.00, 'Cheque', 'partial', 85000.00, 127400.00, 'Construction of 1 BHK house - Phase 1 (Foundation)');
INSERT INTO sale_items (sale_id, item_name, hsn_code, quantity, unit, rate, amount, gst_rate, gst_amount) VALUES
('f1000000-0000-0000-0000-000000000002', 'Construction Labour - Foundation', '9954', 1, 'Nos', 40000.00, 40000.00, 18, 7200.00),
('f1000000-0000-0000-0000-000000000002', 'Construction Labour - Walls', '9954', 1, 'Nos', 60000.00, 60000.00, 18, 10800.00),
('f1000000-0000-0000-0000-000000000002', 'Construction Labour - Roofing', '9954', 1, 'Nos', 80000.00, 80000.00, 18, 14400.00);

-- SALE 3: Prakash - House Construction (July 2024)
INSERT INTO sales (id, sale_number, client_id, invoice_date, subtotal, gst_rate, cgst_amount, sgst_amount, igst_amount, total_amount, payment_mode, payment_status, amount_received, balance_due, remarks) VALUES
('f1000000-0000-0000-0000-000000000003', 'INV-2425-0003', 'b1000000-0000-0000-0000-000000000003', '2024-07-20', 150000.00, 18, 13500.00, 13500.00, 0, 177000.00, 'Cash', 'paid', 177000.00, 0, 'Construction of 1 BHK house - Complete');
INSERT INTO sale_items (sale_id, item_name, hsn_code, quantity, unit, rate, amount, gst_rate, gst_amount) VALUES
('f1000000-0000-0000-0000-000000000003', 'Full House Construction - 1 BHK', '9954', 1, 'Nos', 150000.00, 150000.00, 18, 27000.00);

-- SALE 4: Sunil - House Construction (September 2024)
INSERT INTO sales (id, sale_number, client_id, invoice_date, subtotal, gst_rate, cgst_amount, sgst_amount, igst_amount, total_amount, payment_mode, payment_status, amount_received, balance_due, remarks) VALUES
('f1000000-0000-0000-0000-000000000004', 'INV-2425-0004', 'b1000000-0000-0000-0000-000000000004', '2024-09-10', 200000.00, 18, 18000.00, 18000.00, 0, 236000.00, 'Bank Transfer', 'unpaid', 0.00, 236000.00, 'Construction of 2 BHK house - Phase 1');
INSERT INTO sale_items (sale_id, item_name, hsn_code, quantity, unit, rate, amount, gst_rate, gst_amount) VALUES
('f1000000-0000-0000-0000-000000000004', 'Construction Labour - Foundation', '9954', 1, 'Nos', 50000.00, 50000.00, 18, 9000.00),
('f1000000-0000-0000-0000-000000000004', 'Construction Labour - Walls', '9954', 1, 'Nos', 75000.00, 75000.00, 18, 13500.00),
('f1000000-0000-0000-0000-000000000004', 'Construction Labour - Slab', '9954', 1, 'Nos', 75000.00, 75000.00, 18, 13500.00);

-- SALE 5: Anita - House Construction (November 2024)
INSERT INTO sales (id, sale_number, client_id, invoice_date, subtotal, gst_rate, cgst_amount, sgst_amount, igst_amount, total_amount, payment_mode, payment_status, amount_received, balance_due, remarks) VALUES
('f1000000-0000-0000-0000-000000000005', 'INV-2425-0005', 'b1000000-0000-0000-0000-000000000005', '2024-11-15', 180000.00, 18, 16200.00, 16200.00, 0, 212400.00, 'NEFT', 'partial', 67000.00, 145400.00, 'Construction of 1.5 BHK house - Phase 1 & 2');
INSERT INTO sale_items (sale_id, item_name, hsn_code, quantity, unit, rate, amount, gst_rate, gst_amount) VALUES
('f1000000-0000-0000-0000-000000000005', 'Construction Labour - Foundation', '9954', 1, 'Nos', 35000.00, 35000.00, 18, 6300.00),
('f1000000-0000-0000-0000-000000000005', 'Construction Labour - Walls', '9954', 1, 'Nos', 65000.00, 65000.00, 18, 11700.00),
('f1000000-0000-0000-0000-000000000005', 'Construction Labour - Roofing & Flooring', '9954', 1, 'Nos', 80000.00, 80000.00, 18, 14400.00);

-- =============================================
-- 5. TRANSACTIONS (Ledger entries)
-- Dates matching the purchase/sale dates above
-- =============================================

-- Purchase transactions (Debits from suppliers)
INSERT INTO transactions (party_id, transaction_type, reference_id, reference_type, debit, credit, balance, description, transaction_date) VALUES
-- Shree Cement
('a1000000-0000-0000-0000-000000000001', 'purchase', 'e1000000-0000-0000-0000-000000000001', 'purchase', 41300.00, 0, 41300.00, 'Purchase PUR-2425-0001', '2024-04-15'),
('a1000000-0000-0000-0000-000000000001', 'payment', NULL, NULL, 0, 41300.00, 0, 'Payment for PUR-2425-0001', '2024-04-15'),

-- Jai Steel
('a1000000-0000-0000-0000-000000000002', 'purchase', 'e1000000-0000-0000-0000-000000000002', 'purchase', 88500.00, 0, 88500.00, 'Purchase PUR-2425-0002', '2024-04-20'),
('a1000000-0000-0000-0000-000000000002', 'payment', NULL, NULL, 0, 88500.00, 0, 'Payment for PUR-2425-0002', '2024-04-20'),

-- Kamal Sand
('a1000000-0000-0000-0000-000000000003', 'purchase', 'e1000000-0000-0000-0000-000000000003', 'purchase', 18900.00, 0, 18900.00, 'Purchase PUR-2425-0003', '2024-05-01'),
('a1000000-0000-0000-0000-000000000003', 'payment', NULL, NULL, 0, 18900.00, 0, 'Payment for PUR-2425-0003', '2024-05-01'),

-- Patel Electricals
('a1000000-0000-0000-0000-000000000004', 'purchase', 'e1000000-0000-0000-0000-000000000004', 'purchase', 14160.00, 0, 14160.00, 'Purchase PUR-2425-0004', '2024-05-10'),
('a1000000-0000-0000-0000-000000000004', 'payment', NULL, NULL, 0, 10000.00, 4160.00, 'Partial payment PUR-2425-0004', '2024-05-10'),

-- Om Pipes
('a1000000-0000-0000-0000-000000000006', 'purchase', 'e1000000-0000-0000-0000-000000000005', 'purchase', 10030.00, 0, 10030.00, 'Purchase PUR-2425-0005', '2024-06-15'),
('a1000000-0000-0000-0000-000000000006', 'payment', NULL, NULL, 0, 10030.00, 0, 'Payment for PUR-2425-0005', '2024-06-15'),

-- Ganesh Tiles
('a1000000-0000-0000-0000-000000000007', 'purchase', 'e1000000-0000-0000-0000-000000000006', 'purchase', 17700.00, 0, 17700.00, 'Purchase PUR-2425-0006', '2024-07-20'),
('a1000000-0000-0000-0000-000000000007', 'payment', NULL, NULL, 0, 17700.00, 0, 'Payment for PUR-2425-0006', '2024-07-20');

-- Sale transactions (Credits to clients)
INSERT INTO transactions (party_id, transaction_type, reference_id, reference_type, debit, credit, balance, description, transaction_date) VALUES
-- Rajesh Sharma
('b1000000-0000-0000-0000-000000000001', 'sale', 'f1000000-0000-0000-0000-000000000001', 'sale', 0, 295000.00, 295000.00, 'Sale INV-2425-0001', '2024-04-25'),
('b1000000-0000-0000-0000-000000000001', 'receipt', NULL, NULL, 125000.00, 0, 170000.00, 'Receipt from Rajesh Sharma', '2024-04-25'),

-- Suresh Deshmukh
('b1000000-0000-0000-0000-000000000002', 'sale', 'f1000000-0000-0000-0000-000000000002', 'sale', 0, 212400.00, 212400.00, 'Sale INV-2425-0002', '2024-05-05'),
('b1000000-0000-0000-0000-000000000002', 'receipt', NULL, NULL, 85000.00, 0, 127400.00, 'Receipt from Suresh Deshmukh', '2024-05-05'),

-- Prakash Jain
('b1000000-0000-0000-0000-000000000003', 'sale', 'f1000000-0000-0000-0000-000000000003', 'sale', 0, 177000.00, 177000.00, 'Sale INV-2425-0003', '2024-07-20'),
('b1000000-0000-0000-0000-000000000003', 'receipt', NULL, NULL, 177000.00, 0, 0, 'Full payment from Prakash Jain', '2024-07-20'),

-- Sunil Bawane
('b1000000-0000-0000-0000-000000000004', 'sale', 'f1000000-0000-0000-0000-000000000004', 'sale', 0, 236000.00, 236000.00, 'Sale INV-2425-0004', '2024-09-10'),

-- Anita Tiwari
('b1000000-0000-0000-0000-000000000005', 'sale', 'f1000000-0000-0000-0000-000000000005', 'sale', 0, 212400.00, 212400.00, 'Sale INV-2425-0005', '2024-11-15'),
('b1000000-0000-0000-0000-000000000005', 'receipt', NULL, NULL, 67000.00, 0, 145400.00, 'Receipt from Anita Tiwari', '2024-11-15');

-- =============================================
-- 6. VERIFICATION QUERIES (Uncomment to run)
-- =============================================

-- SELECT 'Parties' as table_name, COUNT(*) as count FROM parties
-- UNION ALL SELECT 'Beneficiaries', COUNT(*) FROM beneficiaries
-- UNION ALL SELECT 'Purchases', COUNT(*) FROM purchases
-- UNION ALL SELECT 'Purchase Items', COUNT(*) FROM purchase_items
-- UNION ALL SELECT 'Sales', COUNT(*) FROM sales
-- UNION ALL SELECT 'Sale Items', COUNT(*) FROM sale_items
-- UNION ALL SELECT 'Transactions', COUNT(*) FROM transactions;
