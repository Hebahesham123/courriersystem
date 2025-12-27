-- ============================================
-- FIX MISSING COLUMNS FOR ORDERS TABLE
-- ============================================
-- Run this SQL in Supabase SQL Editor
-- This fixes the error: "column orders.original_courier_id does not exist"
-- ============================================

-- Add missing columns that the frontend expects
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS original_courier_id uuid REFERENCES users(id);

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Verify columns were added
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('original_courier_id', 'archived', 'archived_at')
ORDER BY column_name;

