-- Fix for Orders Table Status Constraint
-- Run this SQL in your Supabase SQL Editor to fix the status constraint issue

-- Step 1: Check what statuses currently exist in the orders table
SELECT DISTINCT status, COUNT(*) as count
FROM orders 
GROUP BY status 
ORDER BY status;

-- Step 2: Check if there are any orders with 'deleted' status
SELECT COUNT(*) as deleted_orders_count
FROM orders 
WHERE status = 'deleted';

-- Step 3: Remove the problematic constraint if it exists
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS check_status;

-- Step 4: Add the correct constraint with all existing statuses
ALTER TABLE orders 
ADD CONSTRAINT check_status 
CHECK (status IN (
  'pending', 
  'assigned', 
  'delivered', 
  'canceled', 
  'partial', 
  'return',
  'hand_to_hand',
  'receiving_part',
  'deleted'
));

-- Step 5: Verify the constraint was added successfully
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'check_status';

-- Step 6: Test the constraint by trying to insert an invalid status
-- This should fail:
-- INSERT INTO orders (order_id, customer_name, address, mobile_number, total_order_fees, payment_method, status) 
-- VALUES ('TEST-001', 'Test Customer', 'Test Address', '123456789', 100, 'cash', 'invalid_status');

-- Step 7: Verify all existing orders comply with the new constraint
SELECT COUNT(*) as total_orders,
       COUNT(CASE WHEN status IN ('pending', 'assigned', 'delivered', 'canceled', 'partial', 'return', 'hand_to_hand', 'receiving_part', 'deleted') THEN 1 END) as valid_status_orders,
       COUNT(CASE WHEN status NOT IN ('pending', 'assigned', 'delivered', 'canceled', 'partial', 'return', 'hand_to_hand', 'receiving_part', 'deleted') THEN 1 END) as invalid_status_orders
FROM orders;
