-- Add assigned_at column to track when orders were assigned to couriers
-- This field is separate from updated_at and won't be overwritten by Shopify sync

-- Step 1: Add the assigned_at column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- Step 2: For existing assigned orders, set assigned_at to their current updated_at
UPDATE orders 
SET assigned_at = updated_at 
WHERE assigned_courier_id IS NOT NULL 
  AND assigned_at IS NULL;

-- Step 3: Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_assigned_at ON orders(assigned_at);

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'assigned_at';

