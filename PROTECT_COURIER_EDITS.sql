-- Protect Courier Edits - Prevent Status and Payment Info from Being Reset
-- Run this SQL in your Supabase SQL Editor

-- This trigger prevents orders with courier edits from being reset to pending
-- It protects: status, delivery_fee, partial_paid_amount, collected_by, payment_sub_type, internal_comment

CREATE OR REPLACE FUNCTION protect_courier_edits()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if order has courier edits (delivery_fee, partial_paid_amount, collected_by, etc.)
  -- If it does, prevent status from being reset to pending/assigned
  IF (
    OLD.delivery_fee IS NOT NULL OR
    OLD.partial_paid_amount IS NOT NULL OR
    OLD.collected_by IS NOT NULL OR
    OLD.payment_sub_type IS NOT NULL OR
    OLD.internal_comment IS NOT NULL OR
    (OLD.status IS NOT NULL AND OLD.status NOT IN ('pending', 'assigned'))
  ) THEN
    -- Order has courier edits - protect them
    
    -- Protect status - never allow downgrade from processed to pending/assigned
    IF (
      OLD.status IN ('delivered', 'partial', 'canceled', 'return', 'hand_to_hand', 'receiving_part') AND
      NEW.status IN ('pending', 'assigned')
    ) THEN
      RAISE WARNING 'Attempted to reset status from % to % for order with courier edits - BLOCKED', OLD.status, NEW.status;
      NEW.status := OLD.status;
    END IF;
    
    -- Protect delivery_fee if courier set it
    IF OLD.delivery_fee IS NOT NULL AND NEW.delivery_fee IS NULL THEN
      NEW.delivery_fee := OLD.delivery_fee;
    END IF;
    
    -- Protect partial_paid_amount if courier set it
    IF OLD.partial_paid_amount IS NOT NULL AND NEW.partial_paid_amount IS NULL THEN
      NEW.partial_paid_amount := OLD.partial_paid_amount;
    END IF;
    
    -- Protect collected_by if courier set it
    IF OLD.collected_by IS NOT NULL AND NEW.collected_by IS NULL THEN
      NEW.collected_by := OLD.collected_by;
    END IF;
    
    -- Protect payment_sub_type if courier set it
    IF OLD.payment_sub_type IS NOT NULL AND NEW.payment_sub_type IS NULL THEN
      NEW.payment_sub_type := OLD.payment_sub_type;
    END IF;
    
    -- Protect internal_comment if courier set it
    IF OLD.internal_comment IS NOT NULL AND NEW.internal_comment IS NULL THEN
      NEW.internal_comment := OLD.internal_comment;
    END IF;
    
    -- Protect payment_status if courier set it to paid
    IF OLD.payment_status = 'paid' AND NEW.payment_status != 'paid' THEN
      NEW.payment_status := OLD.payment_status;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_protect_courier_edits ON orders;

-- Create trigger to protect courier edits
CREATE TRIGGER trigger_protect_courier_edits
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION protect_courier_edits();

-- Verify the trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_protect_courier_edits';

-- Test query to see orders with courier edits
SELECT 
  id,
  order_id,
  status,
  delivery_fee,
  partial_paid_amount,
  collected_by,
  payment_sub_type,
  internal_comment,
  updated_at
FROM orders
WHERE (
  delivery_fee IS NOT NULL OR
  partial_paid_amount IS NOT NULL OR
  collected_by IS NOT NULL OR
  payment_sub_type IS NOT NULL OR
  internal_comment IS NOT NULL OR
  status IN ('delivered', 'partial', 'canceled', 'return', 'hand_to_hand', 'receiving_part')
)
AND assigned_courier_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;


