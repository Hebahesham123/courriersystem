-- =============================================================================
-- Repair: per-item support (send a single item of a multi-item order to repair)
--
-- Run this once in the Supabase SQL Editor. Safe to re-run.
-- (Already included in REPAIR_SETUP.sql for fresh setups; this file is just the
--  incremental change for databases where REPAIR_SETUP.sql was already applied.)
-- =============================================================================

-- NULL   => the whole order is under repair
-- object => a single line item: { index, title, variant_title, sku, quantity, product_id }
ALTER TABLE orders ADD COLUMN IF NOT EXISTS repair_item jsonb;

-- Snapshot of the customer request this repair came from, so the repair user
-- sees the customer's note / photos / video. Shape:
--   { comment, image_url, video_url, notes: [{ note, image_url, author }] }
ALTER TABLE orders ADD COLUMN IF NOT EXISTS repair_request jsonb;
