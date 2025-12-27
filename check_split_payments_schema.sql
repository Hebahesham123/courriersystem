-- Check Split Payments Schema
-- Run this in your Supabase SQL editor to verify the setup

-- 1. Check if split_payments table exists
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name = 'split_payments';

-- 2. Check split_payments table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'split_payments'
ORDER BY ordinal_position;

-- 3. Check if orders table has 'split' in payment_method constraint
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints 
WHERE constraint_name = 'orders_payment_method_check';

-- 4. Check current payment_method values in orders table
SELECT 
  payment_method,
  COUNT(*) as count
FROM orders 
GROUP BY payment_method
ORDER BY count DESC;

-- 5. Check if there are any orders with split payments
SELECT 
  o.id,
  o.order_id,
  o.payment_method,
  o.total_order_fees,
  COUNT(sp.id) as split_payments_count
FROM orders o
LEFT JOIN split_payments sp ON o.id = sp.order_id
GROUP BY o.id, o.order_id, o.payment_method, o.total_order_fees
HAVING COUNT(sp.id) > 0
ORDER BY split_payments_count DESC;

-- 6. Check split_payments table content
SELECT 
  sp.*,
  o.order_id,
  o.payment_method as order_payment_method
FROM split_payments sp
JOIN orders o ON sp.order_id = o.id
ORDER BY sp.created_at DESC
LIMIT 10;
