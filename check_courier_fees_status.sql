-- Diagnostic Script for Courier Fees Table
-- Run this first to see what's currently in your database

-- Check if the table exists
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'courier_fees';

-- If table exists, check its current structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'courier_fees'
ORDER BY ordinal_position;

-- Check if there are any constraints
SELECT 
    constraint_name, 
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'courier_fees';

-- Check if there are any indexes
SELECT 
    indexname, 
    indexdef
FROM pg_indexes 
WHERE tablename = 'courier_fees';

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'courier_fees';

-- Check if there are any RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'courier_fees';

-- Check if there's any data in the table
SELECT COUNT(*) as total_rows FROM courier_fees;

-- If there are rows, show a sample
SELECT * FROM courier_fees LIMIT 5;
