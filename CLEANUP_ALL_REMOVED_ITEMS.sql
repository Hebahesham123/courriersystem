-- Cleanup script to delete ALL removed items from order_items table
-- This ensures that items removed in Shopify are completely removed from the system

-- Delete all items that are marked as removed or have indicators of being removed
DELETE FROM order_items 
WHERE is_removed = true 
   OR quantity = 0 
   OR fulfillment_status = 'removed'
   OR (properties IS NOT NULL AND (
      properties->>'_is_removed' = 'true' OR 
      properties->>'_is_removed' = 'true'
    ));

-- Show count of remaining items
SELECT 
  COUNT(*) as total_items,
  COUNT(CASE WHEN is_removed = true THEN 1 END) as removed_items_count,
  COUNT(CASE WHEN quantity = 0 THEN 1 END) as zero_quantity_items
FROM order_items;

