-- Quick Split Payments Schema Check
-- Run this in your Supabase SQL editor

-- 1. Check if split_payments table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'split_payments'
) as split_payments_table_exists;

-- 2. Check if orders table allows 'split' as payment_method
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints 
WHERE constraint_name = 'orders_payment_method_check';

-- 3. Check current payment methods in use
SELECT 
  payment_method,
  COUNT(*) as count
FROM orders 
GROUP BY payment_method
ORDER BY count DESC;

-- 4. Check if there are any split payments
SELECT COUNT(*) as total_split_payments FROM split_payments;

-- 5. Check if any orders have split_payments data
SELECT COUNT(*) as orders_with_splits
FROM orders o
WHERE EXISTS (
  SELECT 1 FROM split_payments sp WHERE sp.order_id = o.id
);
