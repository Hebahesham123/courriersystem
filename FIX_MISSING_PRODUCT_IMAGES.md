# 🖼️ Fix Missing Product Images

## Problem
Some products show images while others don't appear.

## Root Causes
1. **Products deleted from Shopify** - The Products API doesn't return deleted products
2. **Products without images in Shopify** - Some products may not have images assigned
3. **Images not extracted from line_items** - Shopify sometimes includes images directly in order line_items in different formats

## Solution Applied

### Updated Supabase Edge Functions
Both `shopify-sync` and `shopify-webhook` functions now have improved image extraction that checks multiple sources:

1. `item.image` (string or object with src/url)
2. `item.variant.image`
3. `item.variant.featured_image`
4. `item.images[]` array
5. `item.product.images[]` array
6. `item.product.image`

The code also:
- Handles both string URLs and object formats `{src: "url"}`
- Normalizes relative URLs to absolute Shopify CDN URLs
- Cleans invalid values like `"null"` or empty strings

## How to Fix Existing Orders

### Option 1: Re-deploy Edge Functions and Re-sync

#### Step 1: Deploy Updated Edge Functions
```bash
# Deploy the updated functions to Supabase
supabase functions deploy shopify-sync
supabase functions deploy shopify-webhook
```

#### Step 2: Trigger a Full Re-sync
Call the sync function to re-sync all orders with improved image extraction:

From Supabase Dashboard:
1. Go to **Edge Functions** → **shopify-sync**
2. Click **Invoke** or use the invoke URL

Or via curl:
```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/shopify-sync" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Option 2: Update Images via SQL (Quick Fix)

Run this SQL in Supabase SQL Editor to see which orders have missing images:

```sql
-- Check orders with missing images
SELECT 
  order_id,
  jsonb_array_length(COALESCE(product_images::jsonb, '[]'::jsonb)) as total_items,
  (
    SELECT COUNT(*) 
    FROM jsonb_array_elements(COALESCE(product_images::jsonb, '[]'::jsonb)) elem 
    WHERE elem->>'image' IS NOT NULL 
      AND elem->>'image' != 'null'
      AND elem->>'image' != ''
  ) as items_with_images
FROM orders
WHERE shopify_order_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;
```

## Verification

### Check Browser Console
Open the application in browser (F12 for DevTools):
- Look for `✅ Image loaded:` messages
- Check for `⚠️ No image found:` warnings

### Check Database
```sql
-- Check a specific order's images
SELECT 
  order_id,
  product_images
FROM orders 
WHERE order_id = 'YOUR_ORDER_ID';
```

## Still Not Working?

### Possible Issues:

1. **Product deleted from Shopify**
   - The product no longer exists in Shopify
   - The line_items data doesn't include image info
   - No way to fetch the image

2. **Product has no image in Shopify**
   - Check Shopify Admin → Products → [Product]
   - Add an image to the product in Shopify
   - Re-sync after adding

3. **Old Orders**
   - Orders synced before this fix won't have images
   - Need to trigger a full re-sync

4. **Network/CORS Issues**
   - Check browser console for CORS errors
   - Verify Shopify CDN URLs are accessible

## For New Orders

New orders coming through webhooks or sync will automatically have improved image extraction. No action needed.

## For Existing Orders

You need to re-sync orders by calling the `shopify-sync` Edge Function. This will:
1. Fetch all orders from Shopify again
2. Extract images using the improved logic
3. Update the `product_images` field in the database

## Important Notes

- **Shopify doesn't always include images in Orders API** - This is a Shopify limitation
- Some products may genuinely have no images in Shopify
- Deleted products cannot have their images recovered

