-- ============================================
-- FIX ALL MISSING TABLES AND COLUMNS
-- ============================================
-- This script fixes all missing database objects:
-- 1. Creates the order_proofs table
-- 2. Adds missing columns to orders table
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: CREATE ORDER_PROOFS TABLE
-- ============================================

-- Create the order_proofs table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS order_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  courier_id UUID REFERENCES users(id) ON DELETE SET NULL,
  image_data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance (only if they don't exist)
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
-- PART 2: ADD MISSING COLUMNS TO ORDERS TABLE
-- ============================================

-- Add collected_by column (tracks who collected the payment)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS collected_by TEXT;

-- Add payment_sub_type column (tracks specific payment sub-method for courier collections)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_sub_type TEXT;

-- Add order_note column (admin notes about the order)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_note TEXT;

-- Add customer_note column (customer notes/comments)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_note TEXT;

-- Add notes column if it doesn't exist (general notes field)
-- This might already exist, but adding IF NOT EXISTS to be safe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'notes'
  ) THEN
    ALTER TABLE orders ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Update status constraint to include all possible statuses
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN (
  'pending', 
  'assigned', 
  'delivered', 
  'canceled', 
  'partial',
  'return',
  'hand_to_hand',
  'receiving_part'
) OR status IS NULL);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_collected_by ON orders(collected_by);
CREATE INDEX IF NOT EXISTS idx_orders_payment_sub_type ON orders(payment_sub_type);

-- ============================================
-- ✅ ALL FIXES APPLIED!
-- ============================================
-- The following have been created/added:
--
-- 1. ORDER_PROOFS TABLE:
--    - Table created with proper structure
--    - RLS policies configured
--    - Indexes created for performance
--
-- 2. ORDERS TABLE COLUMNS:
--    - collected_by: Tracks who collected the payment
--    - payment_sub_type: Specific payment sub-method
--    - order_note: Admin notes about the order
--    - customer_note: Customer notes/comments
--
-- 3. STATUS CONSTRAINT UPDATED:
--    - Added: return, hand_to_hand, receiving_part
--
-- After running this script, refresh your Supabase schema cache:
-- Settings → API → Refresh Schema Cache
-- ============================================

