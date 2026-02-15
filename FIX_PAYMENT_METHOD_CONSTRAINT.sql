-- Fix Payment Method Constraint to Accept "محفظه" (Arabic for wallet)
-- Run this SQL in your Supabase SQL editor
-- This fixes the error: "violates check constraint orders_payment_method_check"

-- STEP 1: Drop the existing constraint
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_payment_method_check;

-- STEP 2: Add the updated constraint with "محفظه" included
ALTER TABLE orders 
ADD CONSTRAINT orders_payment_method_check 
CHECK (
    payment_method IS NULL 
    OR payment_method IN (
        'cash', 
        'card', 
        'valu', 
        'partial', 
        'split',
        'paymob', 
        'instapay', 
        'wallet', 
        'محفظه',  -- Arabic for wallet
        'visa_machine', 
        'on_hand',
        'paid', 
        'fawry', 
        'vodafone_cash', 
        'orange_cash', 
        'we_pay', 
        'visa', 
        'mastercard', 
        'stripe', 
        'paypal'
    )
);

-- STEP 3: Verify the constraint was added
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'orders_payment_method_check';

-- STEP 4: Check current payment methods in use
SELECT 
    payment_method,
    COUNT(*) as count
FROM orders 
WHERE payment_method IS NOT NULL 
GROUP BY payment_method 
ORDER BY count DESC;


