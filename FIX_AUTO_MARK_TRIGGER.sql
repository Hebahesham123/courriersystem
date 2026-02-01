-- Fix the auto_mark_paid_orders_delivered trigger to not reset courier-set statuses
-- Run this SQL in your Supabase SQL Editor

-- Update the trigger function to check for courier edits before changing status
CREATE OR REPLACE FUNCTION auto_mark_paid_orders_delivered()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if order has courier edits - if so, don't auto-change status
  -- Courier edits include: delivery_fee, partial_paid_amount, collected_by, payment_sub_type, internal_comment
  -- Or if status is already set to something other than pending/assigned
  IF (
    OLD.delivery_fee IS NOT NULL OR
    OLD.partial_paid_amount IS NOT NULL OR
    OLD.collected_by IS NOT NULL OR
    OLD.payment_sub_type IS NOT NULL OR
    OLD.internal_comment IS NOT NULL OR
    (OLD.status IS NOT NULL AND OLD.status NOT IN ('pending', 'assigned'))
  ) THEN
    -- Order has courier edits - preserve current status, don't auto-change
    RETURN NEW;
  END IF;
  
  -- Only auto-mark as delivered if:
  -- 1. Payment status is being set to 'paid' OR payment_method is an online payment method
  -- 2. AND status is not already delivered/canceled/return
  -- 3. AND order doesn't have courier edits (checked above)
  IF (
    NEW.payment_status = 'paid' 
    OR 
    NEW.payment_method IN ('paymob', 'valu', 'fawry', 'instapay', 'vodafone_cash', 'orange_cash', 'we_pay', 'visa', 'mastercard', 'card', 'credit', 'debit')
  ) AND NEW.status NOT IN ('delivered', 'canceled', 'return') THEN
    NEW.status := 'delivered';
    NEW.updated_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auto_mark_paid_orders_delivered';



