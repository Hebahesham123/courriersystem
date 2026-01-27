-- Fix Voided Orders to Appear as Canceled
-- Run this SQL in your Supabase SQL editor

-- STEP 0: Check for any invalid financial_status values first
SELECT 
    financial_status,
    COUNT(*) as count
FROM orders 
WHERE financial_status IS NOT NULL
AND financial_status NOT IN ('paid', 'partial', 'pending', 'overdue', 'refunded', 'disputed', 'voided')
GROUP BY financial_status;

-- STEP 1: First, drop the constraint to allow updates
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_financial_status_check;

-- STEP 1.5: Normalize financial_status values (trim whitespace and handle case)
-- First, normalize common variations to valid values
UPDATE orders 
SET financial_status = CASE 
    WHEN LOWER(TRIM(financial_status)) = 'voided' THEN 'voided'
    WHEN LOWER(TRIM(financial_status)) = 'paid' THEN 'paid'
    WHEN LOWER(TRIM(financial_status)) = 'partial' OR LOWER(TRIM(financial_status)) = 'partially_paid' THEN 'partial'
    WHEN LOWER(TRIM(financial_status)) = 'pending' OR LOWER(TRIM(financial_status)) = 'pending_payment' THEN 'pending'
    WHEN LOWER(TRIM(financial_status)) = 'overdue' THEN 'overdue'
    WHEN LOWER(TRIM(financial_status)) = 'refunded' THEN 'refunded'
    WHEN LOWER(TRIM(financial_status)) = 'disputed' THEN 'disputed'
    ELSE NULL
END
WHERE financial_status IS NOT NULL
AND LOWER(TRIM(financial_status)) NOT IN ('paid', 'partial', 'pending', 'overdue', 'refunded', 'disputed', 'voided');

-- STEP 1.6: Clean up any remaining invalid financial_status values
-- Set any remaining invalid values to NULL (they will be handled by the sync process)
UPDATE orders 
SET financial_status = NULL
WHERE financial_status IS NOT NULL
AND financial_status NOT IN ('paid', 'partial', 'pending', 'overdue', 'refunded', 'disputed', 'voided');

-- STEP 2: Update all orders with financial_status = 'voided' to have status = 'canceled'
-- This must be done BEFORE recreating the constraint
UPDATE orders 
SET 
    status = 'canceled',
    updated_at = NOW()
WHERE financial_status = 'voided' 
AND status != 'canceled';

-- STEP 3: Also check for orders that might have voided in shopify_raw_data but not in financial_status
-- This handles cases where the financial_status wasn't properly saved
UPDATE orders 
SET 
    status = 'canceled',
    financial_status = 'voided',
    updated_at = NOW()
WHERE (
    shopify_raw_data->>'financial_status' = 'voided'
    OR shopify_raw_data->>'financial_status' = 'Voided'
    OR shopify_raw_data->>'financial_status' = 'VOIDED'
)
AND status != 'canceled'
AND (financial_status IS NULL OR financial_status != 'voided');

-- STEP 3.5: Verify all financial_status values are valid before recreating constraint
-- This will show any remaining invalid values
SELECT 
    financial_status,
    COUNT(*) as count
FROM orders 
WHERE financial_status IS NOT NULL
AND financial_status NOT IN ('paid', 'partial', 'pending', 'overdue', 'refunded', 'disputed', 'voided')
GROUP BY financial_status;

-- If the above query returns any rows, those need to be fixed first
-- If it returns no rows, proceed to STEP 4

-- STEP 4: Now recreate the constraint with 'voided' included
-- Only run this if STEP 3.5 shows no invalid values
ALTER TABLE orders 
ADD CONSTRAINT orders_financial_status_check 
CHECK (financial_status IN (
    'paid', 'partial', 'pending', 'overdue', 'refunded', 'disputed', 'voided'
) OR financial_status IS NULL);

-- STEP 5: Verify the changes
SELECT 
    COUNT(*) as total_voided_orders,
    COUNT(CASE WHEN status = 'canceled' THEN 1 END) as canceled_orders,
    COUNT(CASE WHEN status != 'canceled' THEN 1 END) as non_canceled_voided
FROM orders 
WHERE financial_status = 'voided' 
   OR shopify_raw_data->>'financial_status' IN ('voided', 'Voided', 'VOIDED');

-- STEP 6: Show sample of fixed orders
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
WHERE financial_status = 'voided' 
   OR shopify_raw_data->>'financial_status' IN ('voided', 'Voided', 'VOIDED')
ORDER BY updated_at DESC
LIMIT 20;

