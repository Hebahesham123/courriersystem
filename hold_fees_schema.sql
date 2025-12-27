-- Add Hold Fee Fields to Orders Table
-- Run this SQL in your Supabase SQL editor to fix the hold fees functionality

-- Add hold fee columns to the orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS hold_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS hold_fee_comment text,
ADD COLUMN IF NOT EXISTS hold_fee_created_by uuid REFERENCES users(id),
ADD COLUMN IF NOT EXISTS hold_fee_created_at timestamptz,
ADD COLUMN IF NOT EXISTS hold_fee_added_at timestamptz,
ADD COLUMN IF NOT EXISTS hold_fee_removed_at timestamptz;

-- Create index for better performance on hold fee queries
CREATE INDEX IF NOT EXISTS idx_orders_hold_fee ON orders(hold_fee);
CREATE INDEX IF NOT EXISTS idx_orders_hold_fee_created_by ON orders(hold_fee_created_by);
CREATE INDEX IF NOT EXISTS idx_orders_hold_fee_created_at ON orders(hold_fee_created_at);

-- Update RLS policies to allow hold fee operations
-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admin can update hold fees" ON orders;
DROP POLICY IF EXISTS "Couriers can read hold fees on assigned orders" ON orders;

-- Admin users can update hold fee fields
CREATE POLICY "Admin can update hold fees" ON orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Couriers can read hold fee information on their assigned orders
CREATE POLICY "Couriers can read hold fees on assigned orders" ON orders
  FOR SELECT TO authenticated
  USING (assigned_courier_id = auth.uid());

-- Grant necessary permissions
GRANT ALL ON orders TO authenticated;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name LIKE 'hold_fee%'
ORDER BY column_name;
