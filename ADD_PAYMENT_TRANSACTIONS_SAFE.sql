-- RUN THIS IN SUPABASE SQL EDITOR
-- Safe version that handles different scenarios

-- Option 1: Try without schema (most common in Supabase)
DO $$
BEGIN
    -- Try to add column to orders table
    BEGIN
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS payment_transactions JSONB DEFAULT NULL;
        RAISE NOTICE 'SUCCESS: Column added to orders table';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to add to orders, trying public.orders...';
        -- Try with public schema
        BEGIN
            ALTER TABLE public.orders
            ADD COLUMN IF NOT EXISTS payment_transactions JSONB DEFAULT NULL;
            RAISE NOTICE 'SUCCESS: Column added to public.orders table';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: Could not add column. Error: %', SQLERRM;
            RAISE NOTICE 'Please run FIND_ORDERS_TABLE.sql to find your table name';
        END;
    END;
END $$;

-- After running, check if it worked:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'orders' AND column_name = 'payment_transactions';

-- Refresh schema cache after running: 
-- Settings -> API -> Refresh Schema Cache


