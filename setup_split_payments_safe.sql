-- Safe Split Payments Setup
-- Run this in your Supabase SQL editor

-- 1. Check if split_payments table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'split_payments') THEN
        -- Create split_payments table
        CREATE TABLE split_payments (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            order_id UUID NOT NULL,
            payment_method VARCHAR(50) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_by UUID,
            notes TEXT
        );
        RAISE NOTICE 'split_payments table created successfully';
    ELSE
        RAISE NOTICE 'split_payments table already exists';
    END IF;
END $$;

-- 2. Create indexes (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_split_payments_order_id ON split_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_split_payments_payment_method ON split_payments(payment_method);

-- 3. Enable RLS (if not already enabled)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'split_payments' 
        AND table_schema = 'public'
    ) THEN
        RETURN;
    END IF;
    
    -- Check if RLS is already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'split_payments' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE split_payments ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on split_payments table';
    ELSE
        RAISE NOTICE 'RLS already enabled on split_payments table';
    END IF;
END $$;

-- 4. Create RLS policies (drop existing ones first to avoid conflicts)
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'split_payments' 
        AND policyname = 'Allow all authenticated users'
    ) THEN
        DROP POLICY "Allow all authenticated users" ON split_payments;
        RAISE NOTICE 'Dropped existing policy "Allow all authenticated users"';
    END IF;
    
    -- Create new policy
    CREATE POLICY "Allow all authenticated users" ON split_payments
        FOR ALL USING (auth.role() = 'authenticated');
    RAISE NOTICE 'Created new policy "Allow all authenticated users"';
END $$;

-- 5. Grant permissions
GRANT ALL ON split_payments TO authenticated;

-- 6. Verify everything worked
SELECT 'Setup complete!' as status;

-- 7. Show table structure
SELECT 
    'split_payments table structure:' as info,
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'split_payments' 
ORDER BY column_name;

-- 8. Show RLS status
SELECT 
    'RLS Status:' as info,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'split_payments';

-- 9. Show policies
SELECT 
    'Policies:' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'split_payments';
