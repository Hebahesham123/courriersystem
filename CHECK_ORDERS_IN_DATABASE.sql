-- Check if orders exist in database
-- Run this in Supabase SQL Editor to verify orders were imported

-- 1. Count total orders
SELECT COUNT(*) as total_orders FROM orders;

-- 2. Check if any orders have shopify_order_id (means they came from Shopify)
SELECT COUNT(*) as shopify_orders 
FROM orders 
WHERE shopify_order_id IS NOT NULL;

-- 3. Show recent orders (last 10)
SELECT 
    order_id,
    shopify_order_id,
    customer_name,
    total_order_fees,
    payment_method,
    payment_status,
    status,
    created_at,
    shopify_created_at
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Check order_items table
SELECT COUNT(*) as total_order_items FROM order_items;

-- 5. Show orders with their items
SELECT 
    o.order_id,
    o.customer_name,
    COUNT(oi.id) as item_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.order_id, o.customer_name
ORDER BY o.created_at DESC
LIMIT 10;

