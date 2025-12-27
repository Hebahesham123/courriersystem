-- ============================================
-- UPDATE ORDERS TABLE FOR COMPLETE SHOPIFY SYNC
-- ============================================
-- Run this SQL in Supabase SQL Editor to add all necessary columns
-- for complete Shopify order data including products, images, customer info, etc.
-- ============================================

-- Add missing columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS financial_status VARCHAR(50);

-- Add Shopify-specific columns
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shopify_order_id BIGINT UNIQUE;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shopify_order_number TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shopify_order_name TEXT;

-- Customer information (complete)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_email TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_id BIGINT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_phone TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS billing_address JSONB;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shipping_address JSONB;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS billing_city TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shipping_city TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS billing_country TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shipping_country TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS billing_zip TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shipping_zip TEXT;

-- Order items/products (stored as JSON for flexibility)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS line_items JSONB;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS product_images JSONB;

-- Financial information
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS subtotal_price NUMERIC DEFAULT 0;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS total_tax NUMERIC DEFAULT 0;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS total_discounts NUMERIC DEFAULT 0;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS total_shipping_price NUMERIC DEFAULT 0;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EGP';

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_gateway_names TEXT[];

-- Shipping information
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shipping_method TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS fulfillment_status TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS tracking_number TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS tracking_url TEXT;

-- Order metadata
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_tags TEXT[];

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_note TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_note TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shopify_created_at TIMESTAMPTZ;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shopify_updated_at TIMESTAMPTZ;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shopify_cancelled_at TIMESTAMPTZ;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shopify_closed_at TIMESTAMPTZ;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Raw Shopify data (for reference)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shopify_raw_data JSONB;

-- Frontend required columns
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS original_courier_id uuid REFERENCES users(id);

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Update payment_method constraint to include more options
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_payment_method_check 
CHECK (payment_method IN ('cash', 'card', 'valu', 'partial', 'paid', 'paymob', 'fawry', 'instapay', 'vodafone_cash', 'orange_cash', 'we_pay', 'visa', 'mastercard', 'stripe', 'paypal') OR payment_method IS NULL);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_shopify_order_id ON orders(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_shopify_created_at ON orders(shopify_created_at);

-- ============================================
-- CREATE ORDER ITEMS TABLE (for detailed product information)
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shopify_line_item_id BIGINT,
  product_id BIGINT,
  variant_id BIGINT,
  title TEXT NOT NULL,
  variant_title TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL DEFAULT 0,
  total_discount NUMERIC DEFAULT 0,
  sku TEXT,
  vendor TEXT,
  product_type TEXT,
  requires_shipping BOOLEAN DEFAULT true,
  taxable BOOLEAN DEFAULT true,
  fulfillment_status TEXT,
  -- Product images
  image_url TEXT,
  image_alt TEXT,
  -- Product properties
  properties JSONB,
  -- Raw Shopify data
  shopify_raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_shopify_line_item_id ON order_items(shopify_line_item_id);

-- Enable RLS on order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for order_items
CREATE POLICY "Admin can do everything with order_items" ON order_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Couriers can read order_items" ON order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.assigned_courier_id = auth.uid()
    )
  );

-- ============================================
-- VERIFY CHANGES
-- ============================================
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

SELECT 
    COUNT(*) as order_items_table_exists
FROM information_schema.tables 
WHERE table_name = 'order_items';

