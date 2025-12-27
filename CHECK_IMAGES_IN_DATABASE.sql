-- Check if product images are being stored in the database
-- Run this in Supabase SQL Editor

-- Check a sample order with product_images
SELECT 
  order_id,
  shopify_order_id,
  customer_name,
  product_images,
  jsonb_array_length(COALESCE(product_images::jsonb, '[]'::jsonb)) as image_count
FROM orders
WHERE shopify_order_id IS NOT NULL
  AND product_images IS NOT NULL
LIMIT 5;

-- Check line_items structure
SELECT 
  order_id,
  shopify_order_id,
  jsonb_array_length(COALESCE(line_items::jsonb, '[]'::jsonb)) as line_items_count,
  line_items::jsonb->0 as first_line_item
FROM orders
WHERE shopify_order_id IS NOT NULL
  AND line_items IS NOT NULL
LIMIT 3;

-- Check if images are in product_images
SELECT 
  order_id,
  product_images::jsonb->0 as first_product_image,
  product_images::jsonb->0->>'image' as first_image_url,
  product_images::jsonb->0->>'variant_id' as first_variant_id,
  product_images::jsonb->0->>'product_id' as first_product_id
FROM orders
WHERE shopify_order_id IS NOT NULL
  AND product_images IS NOT NULL
LIMIT 3;

