-- Auto-Mark Paid Orders as Delivered
-- This script fixes the issue where paid orders appear in payment breakdown but aren't marked as delivered

-- 1. First, let's see the current state of paid orders that aren't delivered
SELECT 
    id,
    order_id,
    customer_name,
    payment_method,
    payment_status,
    status,
    created_at
FROM orders 
WHERE (
    -- Orders with online payment methods (these are always paid)
    payment_method IN ('paymob', 'valu', 'fawry', 'instapay', 'vodafone_cash', 'orange_cash', 'we_pay')
    OR
    -- Orders with card payments
    payment_method IN ('visa', 'mastercard', 'card', 'credit', 'debit')
    OR
    -- Orders explicitly marked as paid
    payment_status = 'paid'
)
AND status != 'delivered'
AND status != 'canceled'
AND status != 'return'
ORDER BY created_at DESC;

-- 2. Update all existing paid orders to delivered status
UPDATE orders 
SET 
    status = 'delivered',
    updated_at = NOW()
WHERE (
    -- Orders with online payment methods (these are always paid)
    payment_method IN ('paymob', 'valu', 'fawry', 'instapay', 'vodafone_cash', 'orange_cash', 'we_pay')
    OR
    -- Orders with card payments
    payment_method IN ('visa', 'mastercard', 'card', 'credit', 'debit')
    OR
    -- Orders explicitly marked as paid
    payment_status = 'paid'
)
AND status != 'delivered'
AND status != 'canceled'
AND status != 'return';

-- 3. Create a function to automatically mark orders as delivered when they're marked as paid
CREATE OR REPLACE FUNCTION auto_mark_paid_orders_delivered()
RETURNS TRIGGER AS $$
BEGIN
    -- If payment_status is being set to 'paid' or payment_method is an online payment method
    IF (
        NEW.payment_status = 'paid' 
        OR 
        NEW.payment_method IN ('paymob', 'valu', 'fawry', 'instapay', 'vodafone_cash', 'orange_cash', 'we_pay', 'visa', 'mastercard', 'card', 'credit', 'debit')
    ) AND NEW.status != 'delivered' AND NEW.status != 'canceled' AND NEW.status != 'return' THEN
        NEW.status := 'delivered';
        NEW.updated_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create a trigger to automatically call this function
DROP TRIGGER IF EXISTS trigger_auto_mark_paid_orders_delivered ON orders;

CREATE TRIGGER trigger_auto_mark_paid_orders_delivered
    BEFORE INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_mark_paid_orders_delivered();

-- 5. Verify the trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auto_mark_paid_orders_delivered';

-- 6. Test the trigger by updating a few orders
-- (Uncomment and modify as needed for testing)
/*
UPDATE orders 
SET payment_status = 'paid'
WHERE order_id = 'TEST-ORDER-123'
AND status != 'delivered';
*/

-- 7. Check the results after running the update
SELECT 
    id,
    order_id,
    customer_name,
    payment_method,
    payment_status,
    status,
    created_at,
    updated_at
FROM orders 
WHERE (
    payment_method IN ('paymob', 'valu', 'fawry', 'instapay', 'vodafone_cash', 'orange_cash', 'we_pay')
    OR
    payment_method IN ('visa', 'mastercard', 'card', 'credit', 'debit')
    OR
    payment_status = 'paid'
)
ORDER BY created_at DESC
LIMIT 10;
