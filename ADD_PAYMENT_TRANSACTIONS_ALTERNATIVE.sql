-- RUN THIS IN SUPABASE SQL EDITOR
-- Simple version - just try to add the column
-- If this fails, run the diagnostic query below first

-- First, try to add the column directly
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_transactions JSONB DEFAULT NULL;

-- If the above fails, try with public schema:
-- ALTER TABLE public.orders
-- ADD COLUMN IF NOT EXISTS payment_transactions JSONB DEFAULT NULL;

-- Refresh schema cache after running: 
-- Settings -> API -> Refresh Schema Cache

-- ============================================
-- DIAGNOSTIC QUERIES (run these if the above fails):
-- ============================================
-- 1. Check what tables exist in public schema:
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name LIKE '%order%'
-- ORDER BY table_name;

-- 2. Check all schemas for orders table:
-- SELECT table_schema, table_name 
-- FROM information_schema.tables 
-- WHERE table_name LIKE '%order%'
-- ORDER BY table_schema, table_name;

-- 3. List all tables you have access to:
-- SELECT table_schema, table_name 
-- FROM information_schema.tables 
-- WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
-- ORDER BY table_schema, table_name;

