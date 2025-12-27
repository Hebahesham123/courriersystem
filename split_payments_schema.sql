-- Add Split Payment Functionality
-- Run this SQL in your Supabase SQL editor

-- 1. Add 'split' to the payment_method check constraint
-- First, let's see what payment methods currently exist
SELECT DISTINCT payment_method FROM orders WHERE payment_method IS NOT NULL;

-- Update the constraint to include ALL payment methods currently in use
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_payment_method_check 
CHECK (payment_method IN (
    'cash', 'card', 'valu', 'partial', 'split',
    'paymob', 'instapay', 'wallet', 'visa_machine', 'on_hand'
));

-- 2. Create split_payments table to store individual payment splits
CREATE TABLE IF NOT EXISTS split_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'card', 'valu', 'paymob', 'instapay', 'wallet', 'visa_machine', 'on_hand')),
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    notes TEXT
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_split_payments_order_id ON split_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_split_payments_payment_method ON split_payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_split_payments_created_at ON split_payments(created_at);

-- 4. Enable RLS for split_payments table
ALTER TABLE split_payments ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for split_payments
CREATE POLICY "Allow authenticated users to read split payments" ON split_payments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert split payments" ON split_payments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update split payments" ON split_payments
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete split payments" ON split_payments
    FOR DELETE USING (auth.role() = 'authenticated');

-- 6. Grant necessary permissions
GRANT ALL ON split_payments TO authenticated;

-- 7. Create a function to validate split payment totals
CREATE OR REPLACE FUNCTION validate_split_payment_total()
RETURNS TRIGGER AS $$
DECLARE
    order_total DECIMAL(10,2);
    split_total DECIMAL(10,2);
BEGIN
    -- Get the order total
    SELECT total_order_fees INTO order_total 
    FROM orders 
    WHERE id = NEW.order_id;
    
    -- Get the total of all split payments for this order
    SELECT COALESCE(SUM(amount), 0) INTO split_total 
    FROM split_payments 
    WHERE order_id = NEW.order_id;
    
    -- Check if the new split payment would exceed the order total
    IF (split_total + NEW.amount) > order_total THEN
        RAISE EXCEPTION 'Split payment total (% + %) exceeds order total (%)', split_total, NEW.amount, order_total;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to validate split payment totals
CREATE TRIGGER validate_split_payment_total_trigger
    BEFORE INSERT OR UPDATE ON split_payments
    FOR EACH ROW
    EXECUTE FUNCTION validate_split_payment_total();

-- 9. Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'payment_method';

-- 10. Show the new split_payments table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'split_payments' 
ORDER BY column_name;

-- 11. Show current payment methods in use
SELECT 
    payment_method, 
    COUNT(*) as order_count
FROM orders 
WHERE payment_method IS NOT NULL 
GROUP BY payment_method 
ORDER BY order_count DESC;
