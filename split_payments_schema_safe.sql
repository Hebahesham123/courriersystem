-- Safe Split Payment Schema Update
-- This version checks existing data before making changes

-- Step 1: Check what payment methods currently exist in your orders table
SELECT 'Current payment methods in orders table:' as info;
SELECT DISTINCT payment_method, COUNT(*) as count 
FROM orders 
WHERE payment_method IS NOT NULL 
GROUP BY payment_method 
ORDER BY count DESC;

-- Step 2: Check if the constraint exists and what it currently allows
SELECT 'Current constraint info:' as info;
SELECT 
    tc.constraint_name,
    tc.table_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'orders' 
AND tc.constraint_type = 'CHECK'
AND tc.constraint_name LIKE '%payment_method%';

-- Step 3: Safely update the payment_method constraint
-- First, drop the existing constraint if it exists
DO $$ 
BEGIN
    -- Check if constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'orders' 
        AND constraint_name = 'orders_payment_method_check'
        AND constraint_type = 'CHECK'
    ) THEN
        -- Drop the existing constraint
        ALTER TABLE orders DROP CONSTRAINT orders_payment_method_check;
        RAISE NOTICE 'Dropped existing payment_method check constraint';
    ELSE
        RAISE NOTICE 'No existing payment_method check constraint found';
    END IF;
    
    -- Add the new constraint with ALL payment methods
    ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check 
    CHECK (payment_method IN (
        'cash', 'card', 'valu', 'partial', 'split',
        'paymob', 'instapay', 'wallet', 'visa_machine', 'on_hand'
    ));
    RAISE NOTICE 'Added new payment_method check constraint with all methods';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating constraint: %', SQLERRM;
        -- If there's an error, try to add constraint without 'split' first
        BEGIN
            ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check 
            CHECK (payment_method IN (
                'cash', 'card', 'valu', 'partial',
                'paymob', 'instapay', 'wallet', 'visa_machine', 'on_hand'
            ));
            RAISE NOTICE 'Added constraint without split method (can be added later)';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not add constraint: %', SQLERRM;
        END;
END $$;

-- Step 4: Verify the constraint was added successfully
SELECT 'Verifying constraint update:' as info;
SELECT 
    tc.constraint_name,
    tc.table_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'orders' 
AND tc.constraint_type = 'CHECK'
AND tc.constraint_name LIKE '%payment_method%';

-- Step 5: Create split_payments table
CREATE TABLE IF NOT EXISTS split_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'card', 'valu', 'paymob', 'instapay', 'wallet', 'visa_machine', 'on_hand')),
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    notes TEXT
);

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_split_payments_order_id ON split_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_split_payments_payment_method ON split_payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_split_payments_created_at ON split_payments(created_at);

-- Step 7: Enable RLS
ALTER TABLE split_payments ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies
CREATE POLICY "Allow authenticated users to read split payments" ON split_payments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert split payments" ON split_payments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update split payments" ON split_payments
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete split payments" ON split_payments
    FOR DELETE USING (auth.role() = 'authenticated');

-- Step 9: Grant permissions
GRANT ALL ON split_payments TO authenticated;

-- Step 10: Create validation function
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

-- Step 11: Create trigger
CREATE TRIGGER validate_split_payment_total_trigger
    BEFORE INSERT OR UPDATE ON split_payments
    FOR EACH ROW
    EXECUTE FUNCTION validate_split_payment_total();

-- Step 12: Final verification
SELECT 'Final verification:' as info;
SELECT 'Orders table constraint:' as check_type, 
       tc.constraint_name, 
       cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'orders' 
AND tc.constraint_type = 'CHECK'
AND tc.constraint_name LIKE '%payment_method%';

SELECT 'Split payments table created:' as check_type,
       COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_name = 'split_payments';

SELECT 'Split payments columns:' as check_type,
       column_name, 
       data_type, 
       is_nullable
FROM information_schema.columns 
WHERE table_name = 'split_payments' 
ORDER BY column_name;
