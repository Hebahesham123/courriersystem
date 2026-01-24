-- DIAGNOSTIC QUERIES - Run these first to find your orders table
-- Copy and run each query one at a time

-- 1. Check what tables exist in public schema (most common):
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%order%'
ORDER BY table_name;

-- 2. Check all schemas for any table with "order" in the name:
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%order%'
ORDER BY table_schema, table_name;

-- 3. List ALL tables in public schema:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 4. Try to query the orders table directly (if it exists):
-- SELECT COUNT(*) FROM orders;

-- 5. Try with public schema:
-- SELECT COUNT(*) FROM public.orders;


