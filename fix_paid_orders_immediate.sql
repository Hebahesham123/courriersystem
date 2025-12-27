-- IMMEDIATE FIX: Mark all paid orders as delivered
-- Run this in your Supabase SQL Editor to fix the current issue

-- Step 1: See how many orders need to be fixed
SELECT 
    COUNT(*) as orders_to_fix,
    payment_method,
    status
FROM orders 
WHERE (
    -- Online payment methods (always paid)
    payment_method IN ('paymob', 'valu', 'fawry', 'instapay', 'vodafone_cash', 'orange_cash', 'we_pay')
    OR
    -- Card payments (always paid)
    payment_method IN ('visa', 'mastercard', 'card', 'credit', 'debit')
    OR
    -- Explicitly marked as paid
    payment_status = 'paid'
)
AND status != 'delivered'
AND status != 'canceled'
AND status != 'return'
GROUP BY payment_method, status;

-- Step 2: Fix all paid orders by marking them as delivered
UPDATE orders 
SET 
    status = 'delivered',
    updated_at = NOW()
WHERE (
    -- Online payment methods (always paid)
    payment_method IN ('paymob', 'valu', 'fawry', 'instapay', 'vodafone_cash', 'orange_cash', 'we_pay')
    OR
    -- Card payments (always paid)
    payment_method IN ('visa', 'mastercard', 'card', 'credit', 'debit')
    OR
    -- Explicitly marked as paid
    payment_status = 'paid'
)
AND status != 'delivered'
AND status != 'canceled'
AND status != 'return';

-- Step 3: Verify the fix worked
SELECT 
    COUNT(*) as total_paid_orders,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
    COUNT(CASE WHEN status != 'delivered' THEN 1 END) as non_delivered_orders
FROM orders 
WHERE (
    payment_method IN ('paymob', 'valu', 'fawry', 'instapay', 'vodafone_cash', 'orange_cash', 'we_pay')
    OR
    payment_method IN ('visa', 'mastercard', 'card', 'credit', 'debit')
    OR
    payment_status = 'paid'
);

-- Step 4: Show sample of fixed orders
SELECT 
    order_id,
    customer_name,
    payment_method,
    payment_status,
    status,
    created_at,
    updated_at
FROM orders 
WHERE (
    payment_method IN ('paymob', 'valu', 'fawry', 'instapay', 'vodafone_cash', 'orange_cash', 'we_pay')
    OR
    payment_method IN ('visa', 'mastercard', 'card', 'credit', 'debit')
    OR
    payment_status = 'paid'
)
AND status = 'delivered'
ORDER BY updated_at DESC
LIMIT 10;
