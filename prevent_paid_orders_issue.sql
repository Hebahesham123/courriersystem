-- PREVENTION: Ensure paid orders are automatically marked as delivered
-- This script prevents the issue from happening again

-- Step 1: Create a function to automatically mark orders as delivered when they're marked as paid
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
        
        -- Log the automatic status change
        RAISE NOTICE 'Order % automatically marked as delivered due to payment method: %', NEW.order_id, NEW.payment_method;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create a trigger to automatically call this function
DROP TRIGGER IF EXISTS trigger_auto_mark_paid_orders_delivered ON orders;

CREATE TRIGGER trigger_auto_mark_paid_orders_delivered
    BEFORE INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_mark_paid_orders_delivered();

-- Step 3: Verify the trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auto_mark_paid_orders_delivered';

-- Step 4: Test the trigger by creating a test order
-- (This will show how the trigger works)
INSERT INTO orders (
    order_id,
    customer_name,
    address,
    mobile_number,
    total_order_fees,
    payment_method,
    payment_status,
    status,
    created_at,
    updated_at
) VALUES (
    'TEST-TRIGGER-' || EXTRACT(EPOCH FROM NOW())::INT,
    'Test Customer',
    'Test Address',
    '123456789',
    100.00,
    'paymob',
    'paid',
    'assigned',
    NOW(),
    NOW()
);

-- Step 5: Check if the trigger worked
SELECT 
    order_id,
    customer_name,
    payment_method,
    payment_status,
    status,
    created_at,
    updated_at
FROM orders 
WHERE order_id LIKE 'TEST-TRIGGER-%'
ORDER BY created_at DESC
LIMIT 1;

-- Step 6: Clean up test order
DELETE FROM orders WHERE order_id LIKE 'TEST-TRIGGER-%';

-- Step 7: Create a view to easily monitor paid vs delivered orders
CREATE OR REPLACE VIEW paid_orders_status AS
SELECT 
    order_id,
    customer_name,
    payment_method,
    payment_status,
    status,
    CASE 
        WHEN status = 'delivered' THEN '✅ Delivered'
        WHEN status IN ('canceled', 'return') THEN '❌ Cancelled/Returned'
        ELSE '⚠️ Needs Attention'
    END as status_alert,
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
ORDER BY 
    CASE WHEN status != 'delivered' THEN 0 ELSE 1 END, -- Show problematic orders first
    created_at DESC;

-- Step 8: Test the view
SELECT * FROM paid_orders_status LIMIT 10;

-- Step 9: Create a function to manually fix any remaining issues
CREATE OR REPLACE FUNCTION fix_paid_orders_status()
RETURNS INTEGER AS $$
DECLARE
    fixed_count INTEGER;
BEGIN
    UPDATE orders 
    SET 
        status = 'delivered',
        updated_at = NOW()
    WHERE (
        payment_method IN ('paymob', 'valu', 'fawry', 'instapay', 'vodafone_cash', 'orange_cash', 'we_pay')
        OR
        payment_method IN ('visa', 'mastercard', 'card', 'credit', 'debit')
        OR
        payment_status = 'paid'
    )
    AND status != 'delivered'
    AND status != 'canceled'
    AND status != 'return';
    
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    
    RAISE NOTICE 'Fixed % orders by marking them as delivered', fixed_count;
    
    RETURN fixed_count;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Test the fix function
SELECT fix_paid_orders_status();

-- Step 11: Final verification
SELECT 
    'Total paid orders' as metric,
    COUNT(*) as count
FROM orders 
WHERE (
    payment_method IN ('paymob', 'valu', 'fawry', 'instapay', 'vodafone_cash', 'orange_cash', 'we_pay')
    OR
    payment_method IN ('visa', 'mastercard', 'card', 'credit', 'debit')
    OR
    payment_status = 'paid'
)

UNION ALL

SELECT 
    'Delivered paid orders' as metric,
    COUNT(*) as count
FROM orders 
WHERE (
    payment_method IN ('paymob', 'valu', 'fawry', 'instapay', 'vodafone_cash', 'orange_cash', 'we_pay')
    OR
    payment_method IN ('visa', 'mastercard', 'card', 'credit', 'debit')
    OR
    payment_status = 'paid'
)
AND status = 'delivered'

UNION ALL

SELECT 
    'Non-delivered paid orders' as metric,
    COUNT(*) as count
FROM orders 
WHERE (
    payment_method IN ('paymob', 'valu', 'fawry', 'instapay', 'vodafone_cash', 'orange_cash', 'we_pay')
    OR
    payment_method IN ('visa', 'mastercard', 'card', 'credit', 'debit')
    OR
    payment_status = 'paid'
)
AND status != 'delivered'
AND status != 'canceled'
AND status != 'return';
