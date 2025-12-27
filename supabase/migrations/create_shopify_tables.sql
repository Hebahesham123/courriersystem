-- Shopify orders table
CREATE TABLE IF NOT EXISTS shopify_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_order_id bigint UNIQUE NOT NULL,
  order_id text NOT NULL,
  order_name text,
  order_number text,
  status text DEFAULT 'pending',
  financial_status text,
  fulfillment_status text,
  total_price numeric NOT NULL DEFAULT 0,
  subtotal_price numeric,
  total_tax numeric,
  total_discounts numeric,
  total_shipping_price numeric,
  currency text DEFAULT 'EGP',
  
  -- Customer info
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  customer_id bigint,
  
  -- Addresses
  address text NOT NULL,
  shipping_address jsonb,
  billing_address jsonb,
  billing_city text,
  shipping_city text,
  
  -- Payment
  payment_method text,
  payment_status text,
  payment_gateway_names text[],
  
  -- Shipping
  shipping_method text,
  tracking_number text,
  tracking_url text,
  
  -- Products
  line_items jsonb,
  product_images jsonb,
  
  -- Metadata
  order_tags text[],
  order_note text,
  customer_note text,
  notes text,
  
  -- Timestamps
  shopify_created_at timestamptz,
  shopify_updated_at timestamptz,
  shopify_cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Shopify order items table
CREATE TABLE IF NOT EXISTS shopify_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES shopify_orders(id) ON DELETE CASCADE,
  shopify_line_item_id bigint,
  shopify_order_id bigint,
  product_id bigint,
  variant_id bigint,
  title text NOT NULL,
  variant_title text,
  quantity integer DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  total_discount numeric DEFAULT 0,
  sku text,
  vendor text,
  product_type text,
  image_url text,
  shopify_raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sync state table (single row)
CREATE TABLE IF NOT EXISTS shopify_sync_state (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_synced_at timestamptz DEFAULT now(),
  last_sync_status text,
  last_sync_error text,
  updated_at timestamptz DEFAULT now()
);

-- Insert initial sync state
INSERT INTO shopify_sync_state (id, last_synced_at)
VALUES (1, now())
ON CONFLICT (id) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopify_orders_shopify_order_id ON shopify_orders(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_order_id ON shopify_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_created_at ON shopify_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_updated_at ON shopify_orders(updated_at);
CREATE INDEX IF NOT EXISTS idx_shopify_order_items_order_id ON shopify_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shopify_order_items_shopify_order_id ON shopify_order_items(shopify_order_id);

-- Enable Row Level Security
ALTER TABLE shopify_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_sync_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage shopify_orders" ON shopify_orders;
DROP POLICY IF EXISTS "Couriers can read assigned shopify_orders" ON shopify_orders;
DROP POLICY IF EXISTS "Admins can manage shopify_order_items" ON shopify_order_items;

-- Allow admins to read/write
CREATE POLICY "Admins can manage shopify_orders" ON shopify_orders
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Allow couriers to read assigned orders
CREATE POLICY "Couriers can read assigned shopify_orders" ON shopify_orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.shopify_order_id = shopify_orders.shopify_order_id
      AND orders.assigned_courier_id = auth.uid()
    )
  );

-- Similar policies for order_items
CREATE POLICY "Admins can manage shopify_order_items" ON shopify_order_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

