-- Add shopify_closed_at column to orders table
-- This column stores when an order was closed/archived in Shopify
-- Run this SQL in Supabase SQL Editor

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shopify_closed_at TIMESTAMPTZ;

-- Create index for better performance when filtering by archived orders
CREATE INDEX IF NOT EXISTS idx_orders_shopify_closed_at ON orders(shopify_closed_at);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'shopify_closed_at';

