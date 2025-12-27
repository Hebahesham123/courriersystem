-- ============================================
-- CREATE ORDER_PROOFS TABLE
-- ============================================
-- This table stores proof images uploaded by couriers for orders
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- Create the order_proofs table
CREATE TABLE IF NOT EXISTS order_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  courier_id UUID REFERENCES users(id) ON DELETE SET NULL,
  image_data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_proofs_order_id ON order_proofs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_proofs_courier_id ON order_proofs(courier_id);
CREATE INDEX IF NOT EXISTS idx_order_proofs_created_at ON order_proofs(created_at);

-- Enable Row Level Security
ALTER TABLE order_proofs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can do everything with order_proofs" ON order_proofs;
DROP POLICY IF EXISTS "Couriers can read order_proofs for assigned orders" ON order_proofs;
DROP POLICY IF EXISTS "Couriers can insert order_proofs for assigned orders" ON order_proofs;
DROP POLICY IF EXISTS "Couriers can delete own order_proofs" ON order_proofs;

-- Create policies for order_proofs
-- Admins can do everything
CREATE POLICY "Admin can do everything with order_proofs" ON order_proofs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Couriers can read proofs for their assigned orders
CREATE POLICY "Couriers can read order_proofs for assigned orders" ON order_proofs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_proofs.order_id 
      AND orders.assigned_courier_id = auth.uid()
    )
  );

-- Couriers can insert proofs for their assigned orders
CREATE POLICY "Couriers can insert order_proofs for assigned orders" ON order_proofs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_proofs.order_id 
      AND orders.assigned_courier_id = auth.uid()
    )
    AND courier_id = auth.uid()
  );

-- Couriers can delete their own proofs
CREATE POLICY "Couriers can delete own order_proofs" ON order_proofs
  FOR DELETE TO authenticated
  USING (
    courier_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_proofs.order_id 
      AND orders.assigned_courier_id = auth.uid()
    )
  );

-- Create trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_order_proofs_updated_at ON order_proofs;
CREATE TRIGGER update_order_proofs_updated_at 
  BEFORE UPDATE ON order_proofs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON order_proofs TO authenticated;

-- ============================================
-- ✅ ORDER_PROOFS TABLE CREATED!
-- ============================================

