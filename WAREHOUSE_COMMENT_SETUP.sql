-- =============================================================================
-- Warehouse receipt comment (optional note the warehouse staff can add)
-- Run once in the Supabase SQL Editor.
-- =============================================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS warehouse_received_comment text;
