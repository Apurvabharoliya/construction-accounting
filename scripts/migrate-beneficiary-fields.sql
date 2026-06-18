-- =============================================
-- Migration: Update beneficiaries table and party_type constraint
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Rename aadhaar_number to beneficiary_number (if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'beneficiaries' AND column_name = 'aadhaar_number') THEN
    ALTER TABLE beneficiaries RENAME COLUMN aadhaar_number TO beneficiary_number;
  END IF;
END $$;

-- 2. Add new beneficiary columns
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS application_number VARCHAR(50);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS plinth DECIMAL(15,2) DEFAULT 0;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS lintel DECIMAL(15,2) DEFAULT 0;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS roof DECIMAL(15,2) DEFAULT 0;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS finishing DECIMAL(15,2) DEFAULT 0;

-- 3. Migrate existing data: convert 'client' and 'debtor' types to 'beneficiary'
UPDATE parties SET party_type = 'beneficiary' WHERE party_type IN ('client', 'debtor');

-- 4. Update party_type CHECK constraint to only allow 'supplier' and 'beneficiary'
ALTER TABLE parties DROP CONSTRAINT IF EXISTS parties_party_type_check;
ALTER TABLE parties ADD CONSTRAINT parties_party_type_check CHECK (party_type IN ('supplier', 'beneficiary'));
