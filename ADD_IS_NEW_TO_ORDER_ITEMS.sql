-- RUN THIS IN SUPABASE SQL EDITOR
-- This adds the necessary column to track newly added items from Shopify

-- Add column to order_items to track newly added items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_order_items_is_new ON order_items(is_new) WHERE is_new = true;

-- Refresh schema cache after running: 
-- Settings -> API -> Refresh Schema Cache

