-- =============================================
-- Migration: Add village_name column to purchase_items
-- Run this in Supabase SQL Editor
-- =============================================

ALTER TABLE purchase_items 
ADD COLUMN IF NOT EXISTS village_name VARCHAR(100);

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'purchase_items' 
ORDER BY ordinal_position;
