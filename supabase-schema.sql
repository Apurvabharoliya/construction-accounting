-- =============================================
-- Construction Accounting App - Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. PARTIES TABLE
-- =============================================
CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  gstin VARCHAR(20),
  pan VARCHAR(15),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pin_code VARCHAR(10),
  party_type VARCHAR(20) CHECK (party_type IN ('supplier', 'client', 'beneficiary', 'debtor')),
  opening_balance DECIMAL(15,2) DEFAULT 0,
  gst_registered BOOLEAN DEFAULT false,
  bank_name VARCHAR(255),
  bank_account VARCHAR(50),
  ifsc_code VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. PURCHASES TABLE
-- =============================================
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID REFERENCES parties(id),
  invoice_date DATE NOT NULL,
  supplier_invoice_number VARCHAR(100),
  subtotal DECIMAL(15,2) NOT NULL,
  gst_rate DECIMAL(5,2) DEFAULT 0,
  cgst_amount DECIMAL(15,2) DEFAULT 0,
  sgst_amount DECIMAL(15,2) DEFAULT 0,
  igst_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  payment_mode VARCHAR(20),
  payment_status VARCHAR(20) CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
  amount_paid DECIMAL(15,2) DEFAULT 0,
  balance_due DECIMAL(15,2) DEFAULT 0,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. PURCHASE ITEMS TABLE
-- =============================================
CREATE TABLE purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
  material_name VARCHAR(255) NOT NULL,
  hsn_code VARCHAR(20),
  quantity DECIMAL(15,3) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  rate DECIMAL(15,2) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  gst_rate DECIMAL(5,2) NOT NULL,
  gst_amount DECIMAL(15,2) NOT NULL
);

-- =============================================
-- 4. SALES TABLE
-- =============================================
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number VARCHAR(50) UNIQUE NOT NULL,
  client_id UUID REFERENCES parties(id),
  invoice_date DATE NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  gst_rate DECIMAL(5,2) DEFAULT 0,
  cgst_amount DECIMAL(15,2) DEFAULT 0,
  sgst_amount DECIMAL(15,2) DEFAULT 0,
  igst_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  payment_mode VARCHAR(20),
  payment_status VARCHAR(20) CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
  amount_received DECIMAL(15,2) DEFAULT 0,
  balance_due DECIMAL(15,2) DEFAULT 0,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 5. SALE ITEMS TABLE
-- =============================================
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  hsn_code VARCHAR(20),
  sac_code VARCHAR(20),
  quantity DECIMAL(15,3) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  rate DECIMAL(15,2) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  gst_rate DECIMAL(5,2) NOT NULL,
  gst_amount DECIMAL(15,2) NOT NULL
);

-- =============================================
-- 6. BENEFICIARIES TABLE
-- =============================================
CREATE TABLE beneficiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
  aadhaar_number VARCHAR(20),
  property_address TEXT,
  subsidy_scheme VARCHAR(100),
  subsidy_amount_sanctioned DECIMAL(15,2),
  subsidy_status VARCHAR(20) CHECK (subsidy_status IN ('pending', 'approved', 'disbursed', 'received')),
  subsidy_disbursement_date DATE,
  construction_progress INTEGER DEFAULT 0,
  total_amount_received DECIMAL(15,2) DEFAULT 0,
  total_amount_due DECIMAL(15,2) DEFAULT 0,
  payment_installments INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 7. TRANSACTIONS TABLE (Ledger Entries)
-- =============================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES parties(id),
  transaction_type VARCHAR(20) CHECK (transaction_type IN ('purchase', 'sale', 'payment', 'receipt', 'subsidy')),
  reference_id UUID,
  reference_type VARCHAR(50),
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  balance DECIMAL(15,2) NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 8. GST CONFIGURATION TABLE
-- =============================================
CREATE TABLE gst_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hsn_code VARCHAR(20) UNIQUE NOT NULL,
  description VARCHAR(255) NOT NULL,
  gst_rate DECIMAL(5,2) NOT NULL,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true
);

-- =============================================
-- 9. BUSINESS SETTINGS TABLE
-- =============================================
CREATE TABLE business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 10. AUDIT LOG TABLE
-- =============================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_parties_name ON parties(name);
CREATE INDEX idx_parties_type ON parties(party_type);
CREATE INDEX idx_parties_gstin ON parties(gstin);
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_purchases_date ON purchases(invoice_date);
CREATE INDEX idx_sales_client ON sales(client_id);
CREATE INDEX idx_sales_date ON sales(invoice_date);
CREATE INDEX idx_transactions_party ON transactions(party_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_beneficiaries_party ON beneficiaries(party_id);

-- =============================================
-- ROW LEVEL SECURITY (Single User Mode)
-- =============================================
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on parties" ON parties FOR ALL USING (true);
CREATE POLICY "Allow all on purchases" ON purchases FOR ALL USING (true);
CREATE POLICY "Allow all on purchase_items" ON purchase_items FOR ALL USING (true);
CREATE POLICY "Allow all on sales" ON sales FOR ALL USING (true);
CREATE POLICY "Allow all on sale_items" ON sale_items FOR ALL USING (true);
CREATE POLICY "Allow all on beneficiaries" ON beneficiaries FOR ALL USING (true);
CREATE POLICY "Allow all on transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all on gst_config" ON gst_config FOR ALL USING (true);
CREATE POLICY "Allow all on business_settings" ON business_settings FOR ALL USING (true);
CREATE POLICY "Allow all on audit_log" ON audit_log FOR ALL USING (true);

-- =============================================
-- DEFAULT GST RATES FOR CONSTRUCTION MATERIALS
-- =============================================
INSERT INTO gst_config (hsn_code, description, gst_rate, category) VALUES
('2523', 'Cement', 18, 'Building Material'),
('7214', 'Steel Bars (TMT)', 18, 'Building Material'),
('7216', 'Steel Sections', 18, 'Building Material'),
('2505', 'Natural Sand', 5, 'Building Material'),
('6901', 'Clay Bricks', 12, 'Building Material'),
('6904', 'Ceramic Bricks', 12, 'Building Material'),
('6815', 'Fly Ash Bricks', 12, 'Building Material'),
('2515', 'Marble Blocks', 5, 'Building Material'),
('2516', 'Granite Blocks', 5, 'Building Material'),
('3917', 'PVC Pipes', 18, 'Plumbing'),
('8536', 'Electrical Switches', 18, 'Electrical'),
('8537', 'Electrical Panels', 18, 'Electrical'),
('3208', 'Paints (Oil-based)', 18, 'Finishing'),
('3209', 'Paints (Water-based)', 18, 'Finishing'),
('4407', 'Timber', 18, 'Wood'),
('4412', 'Plywood', 18, 'Wood'),
('3506', 'Adhesives', 18, 'Chemicals'),
('3824', 'Construction Chemicals', 18, 'Chemicals'),
('6802', 'Granite/Tiles', 18, 'Finishing'),
('6905', 'Roofing Tiles', 12, 'Building Material'),
('7005', 'Glass', 18, 'Finishing'),
('7318', 'Hardware (Nuts/Bolts)', 18, 'Hardware'),
('9403', 'Furniture', 18, 'Furniture');

-- =============================================
-- SETTINGS (Default values)
-- =============================================
INSERT INTO business_settings (setting_key, setting_value) VALUES
('business_name', 'My Construction Business'),
('state_code', '27'),
('financial_year_start', 'April');

-- =============================================
-- VERIFICATION QUERY
-- =============================================
-- Run this to verify everything was created:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT COUNT(*) as gst_rates FROM gst_config;
