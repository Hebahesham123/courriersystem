-- Add Financial Status Column to Orders Table
-- Run this SQL in your Supabase SQL editor

-- 1. Add the financial_status column to the orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS financial_status VARCHAR(50);

-- 2. Add a check constraint to ensure valid financial status values
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_financial_status_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_financial_status_check 
CHECK (financial_status IN (
    'paid', 'partial', 'pending', 'overdue', 'refunded', 'disputed'
) OR financial_status IS NULL);

-- 3. Create an index for better performance on financial status queries
CREATE INDEX IF NOT EXISTS idx_orders_financial_status ON orders(financial_status);

-- 4. Update existing orders to set a default financial status based on payment_status
UPDATE orders 
SET financial_status = CASE 
    WHEN payment_status = 'paid' THEN 'paid'
    WHEN payment_status = 'pending' THEN 'pending'
    WHEN payment_status = 'cod' THEN 'pending'
    ELSE 'pending'
END
WHERE financial_status IS NULL;

-- 5. Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'financial_status';

-- 6. Show sample data with the new column
SELECT 
    order_id,
    customer_name,
    payment_status,
    financial_status,
    created_at
FROM orders 
LIMIT 10;
