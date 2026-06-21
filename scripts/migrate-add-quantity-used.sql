-- =============================================
-- Migration: Add missing quantity_used column
-- Run this in Supabase SQL Editor
-- =============================================

ALTER TABLE village_materials 
ADD COLUMN IF NOT EXISTS quantity_used DECIMAL(15,3) DEFAULT 0;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'village_materials' 
ORDER BY ordinal_position;
