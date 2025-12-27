-- Add missing columns to shopify_orders table
-- Run this in Supabase SQL Editor

-- Add archived column
ALTER TABLE shopify_orders 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Add shopify_closed_at column (for archived orders)
ALTER TABLE shopify_orders 
ADD COLUMN IF NOT EXISTS shopify_closed_at TIMESTAMPTZ;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shopify_orders_archived ON shopify_orders(archived);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_shopify_closed_at ON shopify_orders(shopify_closed_at);

