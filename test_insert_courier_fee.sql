-- Test Insert Courier Fee
-- Run this in your Supabase SQL editor to test the insert operation

-- First, let's see what couriers we have
SELECT 
    'Available Couriers' as info,
    id,
    name,
    email,
    role
FROM users 
WHERE role = 'courier'
ORDER BY name;

-- Now let's try to insert a test fee
-- Replace 'COURIER_UUID_HERE' with an actual courier ID from above
INSERT INTO courier_fees (
    courier_id,
    fee_amount,
    fee_date,
    is_active,
    created_by
) VALUES (
    'COURIER_UUID_HERE',  -- Replace with actual courier ID
    5.50,
    CURRENT_DATE,
    true,
    null
) RETURNING *;

-- If the above fails, let's check what the error is
-- You can also try this simpler version without created_by:
/*
INSERT INTO courier_fees (
    courier_id,
    fee_amount,
    fee_date,
    is_active
) VALUES (
    'COURIER_UUID_HERE',  -- Replace with actual courier ID
    5.50,
    CURRENT_DATE,
    true
) RETURNING *;
*/

-- Check if the insert worked
SELECT 
    'Test Result' as info,
    COUNT(*) as total_fees,
    COUNT(CASE WHEN fee_date = CURRENT_DATE THEN 1 END) as today_fees
FROM courier_fees;

-- Show today's fees
SELECT 
    cf.*,
    u.name as courier_name
FROM courier_fees cf
JOIN users u ON cf.courier_id = u.id
WHERE cf.fee_date = CURRENT_DATE
ORDER BY u.name;
