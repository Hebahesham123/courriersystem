-- Simple Split Payments Setup
-- Run this in your Supabase SQL editor

-- 1. Create split_payments table (simple version)
CREATE TABLE IF NOT EXISTS split_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    notes TEXT
);

-- 2. Create basic indexes
CREATE INDEX IF NOT EXISTS idx_split_payments_order_id ON split_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_split_payments_payment_method ON split_payments(payment_method);

-- 3. Enable RLS
ALTER TABLE split_payments ENABLE ROW LEVEL SECURITY;

-- 4. Create basic RLS policy
CREATE POLICY "Allow all authenticated users" ON split_payments
    FOR ALL USING (auth.role() = 'authenticated');

-- 5. Grant permissions
GRANT ALL ON split_payments TO authenticated;

-- 6. Verify table was created
SELECT 'split_payments table created successfully!' as status;

-- 7. Show table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'split_payments' 
ORDER BY column_name;
