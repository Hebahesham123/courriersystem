-- Fix Financial Status Constraint to Accept All Shopify Values
-- Run this SQL in your Supabase SQL editor
-- This fixes the error: "violates check constraint orders_financial_status_check"

-- STEP 1: Drop the existing constraint
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_financial_status_check;

-- STEP 2: Normalize existing financial_status values to match Shopify
-- Convert Shopify values to our standard values
UPDATE orders 
SET financial_status = CASE 
    WHEN LOWER(TRIM(COALESCE(financial_status, ''))) = 'voided' THEN 'voided'
    WHEN LOWER(TRIM(COALESCE(financial_status, ''))) = 'paid' THEN 'paid'
    WHEN LOWER(TRIM(COALESCE(financial_status, ''))) IN ('partial', 'partially_paid', 'partially paid') THEN 'partial'
    WHEN LOWER(TRIM(COALESCE(financial_status, ''))) IN ('pending', 'pending_payment', 'pending payment', 'authorized') THEN 'pending'
    WHEN LOWER(TRIM(COALESCE(financial_status, ''))) = 'overdue' THEN 'overdue'
    WHEN LOWER(TRIM(COALESCE(financial_status, ''))) IN ('refunded', 'partially_refunded') THEN 'refunded'
    WHEN LOWER(TRIM(COALESCE(financial_status, ''))) = 'disputed' THEN 'disputed'
    ELSE NULL
END
WHERE financial_status IS NOT NULL;

-- STEP 3: Add the updated constraint with all valid values
-- Note: The sync function now normalizes Shopify values, but we keep the constraint permissive as a safety net
ALTER TABLE orders 
ADD CONSTRAINT orders_financial_status_check 
CHECK (
    financial_status IS NULL 
    OR LOWER(financial_status) IN (
        'paid', 
        'partial', 
        'partially_paid',  -- Shopify uses this (will be normalized to 'partial' by sync)
        'pending', 
        'pending_payment', -- Shopify uses this (will be normalized to 'pending' by sync)
        'authorized',      -- Shopify uses this (will be normalized to 'pending' by sync)
        'overdue', 
        'refunded',
        'partially_refunded', -- Shopify uses this (will be normalized to 'refunded' by sync)
        'disputed',
        'voided'
    )
);

-- STEP 4: Verify the constraint was added
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'orders_financial_status_check';

-- STEP 5: Check for any remaining invalid values
SELECT 
    financial_status,
    COUNT(*) as count
FROM orders 
WHERE financial_status IS NOT NULL
AND financial_status NOT IN (
    'paid', 'partial', 'partially_paid', 'pending', 'pending_payment', 
    'authorized', 'overdue', 'refunded', 'partially_refunded', 'disputed', 'voided'
)
GROUP BY financial_status;

