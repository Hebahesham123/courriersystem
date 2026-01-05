-- RUN THIS IN SUPABASE SQL EDITOR
-- This adds the payment_transactions column to track gift card payments and partial payments from Shopify

-- Add payment_transactions column to orders table
-- This column stores payment transaction data from Shopify, including gift card payments and partial payments
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_transactions JSONB DEFAULT NULL;

-- Add comment to explain the column (if COMMENT ON is supported)
-- COMMENT ON COLUMN orders.payment_transactions IS 'Stores payment transaction data from Shopify API, including gift card payments and partial payment details';

-- Refresh schema cache after running: 
-- Settings -> API -> Refresh Schema Cache

