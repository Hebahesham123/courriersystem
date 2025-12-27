-- Debug Courier Fees Table Issues
-- Run this in your Supabase SQL editor to identify problems

-- 1. Check if table exists and its structure
SELECT 
    'Table Status' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courier_fees') 
        THEN 'Table exists' 
        ELSE 'Table does not exist' 
    END as result;

-- 2. If table exists, show its structure
SELECT 
    'Table Structure' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'courier_fees'
ORDER BY ordinal_position;

-- 3. Check if there are any courier users
SELECT 
    'Courier Users' as check_type,
    COUNT(*) as courier_count
FROM users 
WHERE role = 'courier';

-- 4. Show sample courier users
SELECT 
    'Sample Couriers' as check_type,
    id,
    name,
    email,
    role
FROM users 
WHERE role = 'courier'
LIMIT 5;

-- 5. Check if there are any existing fees
SELECT 
    'Existing Fees' as check_type,
    COUNT(*) as fee_count
FROM courier_fees;

-- 6. Check RLS status
SELECT 
    'RLS Status' as check_type,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'courier_fees';

-- 7. Check RLS policies
SELECT 
    'RLS Policies' as check_type,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'courier_fees';

-- 8. Check permissions
SELECT 
    'Permissions' as check_type,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'courier_fees';

-- 9. Test inserting a sample fee (replace with actual courier ID)
-- First, get a courier ID
SELECT 
    'Test Insert' as check_type,
    'Use this courier ID for testing: ' || id as instruction
FROM users 
WHERE role = 'courier'
LIMIT 1;

-- 10. Check for any constraint violations
SELECT 
    'Constraints' as check_type,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'courier_fees';
