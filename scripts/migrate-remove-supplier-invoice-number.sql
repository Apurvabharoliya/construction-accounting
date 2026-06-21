-- =============================================
-- Migration: Remove supplier_invoice_number from purchases
-- Run this in Supabase SQL Editor
-- =============================================

ALTER TABLE purchases 
DROP COLUMN IF EXISTS supplier_invoice_number;

-- Verify the column was removed
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'purchases' 
ORDER BY ordinal_position;
