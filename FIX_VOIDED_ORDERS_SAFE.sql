-- Fix Voided Orders to Appear as Canceled (SAFE VERSION)
-- Run this SQL in your Supabase SQL editor
-- This version handles all edge cases and invalid values

-- STEP 0: Check for any invalid financial_status values first
SELECT 
    financial_status,
    COUNT(*) as count
FROM orders 
WHERE financial_status IS NOT NULL
AND LOWER(TRIM(financial_status)) NOT IN ('paid', 'partial', 'pending', 'overdue', 'refunded', 'disputed', 'voided')
GROUP BY financial_status;

-- STEP 1: Drop the constraint FIRST
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_financial_status_check;

-- STEP 2: Normalize and clean financial_status values
-- Handle case variations and whitespace
UPDATE orders 
SET financial_status = CASE 
    WHEN LOWER(TRIM(COALESCE(financial_status, ''))) = 'voided' THEN 'voided'
    WHEN LOWER(TRIM(COALESCE(financial_status, ''))) = 'paid' THEN 'paid'
    WHEN LOWER(TRIM(COALESCE(financial_status, ''))) IN ('partial', 'partially_paid', 'partially paid') THEN 'partial'
    WHEN LOWER(TRIM(COALESCE(financial_status, ''))) IN ('pending', 'pending_payment', 'pending payment') THEN 'pending'
    WHEN LOWER(TRIM(COALESCE(financial_status, ''))) = 'overdue' THEN 'overdue'
    WHEN LOWER(TRIM(COALESCE(financial_status, ''))) = 'refunded' THEN 'refunded'
    WHEN LOWER(TRIM(COALESCE(financial_status, ''))) = 'disputed' THEN 'disputed'
    ELSE NULL
END
WHERE financial_status IS NOT NULL;

-- STEP 3: Set any remaining invalid values to NULL
UPDATE orders 
SET financial_status = NULL
WHERE financial_status IS NOT NULL
AND LOWER(TRIM(financial_status)) NOT IN ('paid', 'partial', 'pending', 'overdue', 'refunded', 'disputed', 'voided');

-- STEP 4: Update all orders with financial_status = 'voided' to have status = 'canceled'
UPDATE orders 
SET 
    status = 'canceled',
    updated_at = NOW()
WHERE LOWER(TRIM(COALESCE(financial_status, ''))) = 'voided' 
AND status != 'canceled';

-- STEP 5: Also check for orders that might have voided in shopify_raw_data
UPDATE orders 
SET 
    status = 'canceled',
    financial_status = 'voided',
    updated_at = NOW()
WHERE (
    LOWER(TRIM(COALESCE(shopify_raw_data->>'financial_status', ''))) = 'voided'
)
AND status != 'canceled'
AND (financial_status IS NULL OR LOWER(TRIM(financial_status)) != 'voided');

-- STEP 6: Final verification - check for any remaining invalid values
-- If this returns any rows, DO NOT proceed to STEP 7
SELECT 
    financial_status,
    COUNT(*) as count
FROM orders 
WHERE financial_status IS NOT NULL
AND LOWER(TRIM(financial_status)) NOT IN ('paid', 'partial', 'pending', 'overdue', 'refunded', 'disputed', 'voided')
GROUP BY financial_status;

-- STEP 7: Only run this if STEP 6 returns NO rows
-- Recreate the constraint with 'voided' included
ALTER TABLE orders 
ADD CONSTRAINT orders_financial_status_check 
CHECK (
    financial_status IS NULL 
    OR LOWER(financial_status) IN ('paid', 'partial', 'pending', 'overdue', 'refunded', 'disputed', 'voided')
);

-- STEP 8: Verify the changes
SELECT 
    COUNT(*) as total_voided_orders,
    COUNT(CASE WHEN status = 'canceled' THEN 1 END) as canceled_orders,
    COUNT(CASE WHEN status != 'canceled' THEN 1 END) as non_canceled_voided
FROM orders 
WHERE LOWER(TRIM(COALESCE(financial_status, ''))) = 'voided' 
   OR LOWER(TRIM(COALESCE(shopify_raw_data->>'financial_status', ''))) = 'voided';

-- STEP 9: Show sample of fixed orders
SELECT 
    order_id,
    customer_name,
    financial_status,
    status,
    shopify_cancelled_at,
    shopify_raw_data->>'financial_status' as raw_financial_status,
    created_at,
    updated_at
FROM orders 
WHERE LOWER(TRIM(COALESCE(financial_status, ''))) = 'voided' 
   OR LOWER(TRIM(COALESCE(shopify_raw_data->>'financial_status', ''))) = 'voided'
ORDER BY updated_at DESC
LIMIT 20;


