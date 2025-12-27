-- ============================================
-- ADD MISSING COLUMNS TO ORDERS TABLE
-- ============================================
-- This script adds missing columns that are used by the application
-- Run this SQL in Supabase SQL Editor
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
-- ✅ MISSING COLUMNS ADDED!
-- ============================================
-- The following columns have been added:
-- - collected_by: Tracks who collected the payment (e.g., 'courier', 'valu', 'paymob', etc.)
-- - payment_sub_type: Specific payment sub-method for courier collections
-- - order_note: Admin notes about the order
-- - customer_note: Customer notes/comments
--
-- Status constraint has been updated to include:
-- - return: For returned orders
-- - hand_to_hand: For hand-to-hand delivery
-- - receiving_part: For partial receiving
-- ============================================

