-- Delete all removed items from order_items table
-- This will clean up any existing removed items that shouldn't be in the system

DELETE FROM order_items 
WHERE is_removed = true 
   OR quantity = 0 
   OR fulfillment_status = 'removed'
   OR (properties IS NOT NULL AND (properties->>'_is_removed' = 'true' OR properties->>'_is_removed' = 'true'));

-- Show count of remaining items with is_removed flag (should be 0)
SELECT COUNT(*) as remaining_removed_items
FROM order_items 
WHERE is_removed = true;

