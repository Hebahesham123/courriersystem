-- Verify Items Are Syncing Correctly
-- Run this SQL in Supabase SQL Editor to check if items are being synced

-- 1. Check if is_new column exists
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name = 'is_new';

-- 2. Count items with is_new or is_removed flags
SELECT 
    COUNT(*) as total_items,
    COUNT(CASE WHEN is_new = true THEN 1 END) as new_items_count,
    COUNT(CASE WHEN is_removed = true THEN 1 END) as removed_items_count,
    COUNT(CASE WHEN is_new = true OR is_removed = true THEN 1 END) as flagged_items_count
FROM order_items;

-- 3. Show sample of items with flags
SELECT 
    oi.id,
    oi.title,
    oi.is_new,
    oi.is_removed,
    oi.quantity,
    oi.shopify_line_item_id,
    o.order_id,
    o.shopify_order_id,
    oi.updated_at
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE (oi.is_new = true OR oi.is_removed = true)
  AND o.shopify_order_id IS NOT NULL
ORDER BY oi.updated_at DESC
LIMIT 20;

-- 4. Check for orders with items that should be flagged but aren't
-- (Items that exist in Shopify but not in DB, or vice versa)
SELECT 
    o.order_id,
    o.shopify_order_id,
    COUNT(oi.id) as db_items_count,
    COUNT(CASE WHEN oi.is_removed = true THEN 1 END) as removed_count,
    COUNT(CASE WHEN oi.is_new = true THEN 1 END) as new_count
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.shopify_order_id IS NOT NULL
GROUP BY o.id, o.order_id, o.shopify_order_id
HAVING COUNT(oi.id) = 0  -- Orders with no items
   OR COUNT(CASE WHEN oi.is_removed = true THEN 1 END) > 0  -- Or orders with removed items
   OR COUNT(CASE WHEN oi.is_new = true THEN 1 END) > 0  -- Or orders with new items
ORDER BY o.updated_at DESC
LIMIT 20;

-- 5. Check recent sync activity
SELECT 
    o.order_id,
    o.shopify_order_id,
    o.updated_at as order_updated,
    MAX(oi.updated_at) as latest_item_updated,
    COUNT(oi.id) as item_count
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.shopify_order_id IS NOT NULL
  AND o.updated_at > NOW() - INTERVAL '7 days'
GROUP BY o.id, o.order_id, o.shopify_order_id, o.updated_at
ORDER BY o.updated_at DESC
LIMIT 20;

