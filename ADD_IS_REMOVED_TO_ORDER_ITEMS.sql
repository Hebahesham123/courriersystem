-- RUN THIS IN SUPABASE SQL EDITOR
-- This adds the necessary columns to track Shopify edits

-- 1. Add columns to order_items to track removed/refunded items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS is_removed BOOLEAN DEFAULT false;

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS refunded_quantity INTEGER DEFAULT 0;

-- 2. Add columns to orders to track total balance/outstanding from Shopify
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS total_paid DECIMAL(10,2) DEFAULT 0;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2) DEFAULT 0;

-- Also add a column for raw shopify data if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shopify_raw_data JSONB;

-- Refresh schema cache after running: 
-- Settings -> API -> Refresh Schema Cache

