-- ============================================
-- ADD BASE_ORDER_ID COLUMN FOR DATE-SUFFIXED ORDERS
-- ============================================
-- This column tracks the original base order for date-suffixed orders
-- When a Shopify order is assigned to a courier, a new order is created with ID like "1789-27"
-- The base_order_id links back to the original order (1789)
-- Only base orders (where base_order_id IS NULL) sync with Shopify
-- ============================================

-- Add base_order_id column to track original orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS base_order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_base_order_id ON orders(base_order_id);

-- Add comment to explain the column
COMMENT ON COLUMN orders.base_order_id IS 'References the original base order for date-suffixed assignment orders. NULL means this is a base order that syncs with Shopify.';



