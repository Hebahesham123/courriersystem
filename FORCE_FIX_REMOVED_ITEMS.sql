-- URGENT: Force fix removed items and totals
-- Run this in Supabase SQL Editor

-- Step 1: Delete ALL removed items
DELETE FROM order_items 
WHERE is_removed = true 
   OR quantity = 0 
   OR fulfillment_status = 'removed'
   OR (properties IS NOT NULL AND (
     properties->>'_is_removed' = 'true' OR 
     properties->>'_is_removed' = 'true'
   ));

-- Step 2: Update all order totals to use Shopify's current_total_price
-- This ensures totals exclude removed items
UPDATE orders
SET total_order_fees = COALESCE(
  (shopify_raw_data->>'current_total_price')::numeric,
  (shopify_raw_data->>'total_price')::numeric,
  total_order_fees
)
WHERE shopify_raw_data IS NOT NULL
  AND (
    (shopify_raw_data->>'current_total_price') IS NOT NULL OR
    (shopify_raw_data->>'total_price') IS NOT NULL
  );

-- Step 3: Verify cleanup
SELECT 
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE is_removed = true) as removed_items_count,
  COUNT(*) FILTER (WHERE quantity = 0) as zero_quantity_count
FROM order_items;

-- Step 4: Show orders that might have incorrect totals
SELECT 
  order_id,
  total_order_fees,
  (shopify_raw_data->>'current_total_price')::numeric as shopify_total,
  (shopify_raw_data->>'total_price')::numeric as shopify_old_total
FROM orders
WHERE shopify_raw_data IS NOT NULL
  AND ABS(
    total_order_fees - COALESCE(
      (shopify_raw_data->>'current_total_price')::numeric,
      (shopify_raw_data->>'total_price')::numeric,
      0
    )
  ) > 0.01
LIMIT 20;

