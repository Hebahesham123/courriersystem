# 🔧 Fix Product Images Not Appearing

## Problem
Product images are not showing in the order detail modal.

## Solution Applied

### 1. Updated Image Extraction in Shopify Sync
- Enhanced `server/shopify-sync.js` to better extract images from line_items
- Handles both string URLs and image objects with `src` property
- Stores images in `product_images` field for easy lookup

### 2. Updated Order Detail Modal
- Added `product_images` map lookup to match images to line items
- Improved fallback chain for finding images:
  1. `product_images` map (by variant_id or product_id)
  2. `item.image` (string or object)
  3. `item.variant.image` (string or object)
  4. `item.variant.featured_image`
  5. `item.images` array
  6. `item.product.images` array

### 3. Image URL Normalization
- Converts relative URLs to absolute URLs
- Handles Shopify CDN URLs properly

## Why Images Might Not Appear

### Possible Reasons:
1. **Shopify API Limitation**: The Orders API might not return images in `line_items` by default
2. **Image Format**: Images might be stored as objects (`{src: "url"}`) instead of strings
3. **Missing product_images**: The `product_images` field might not be populated correctly

## How to Verify

1. **Check Database**:
   ```sql
   SELECT 
     order_id,
     product_images,
     line_items
   FROM orders
   WHERE shopify_order_id IS NOT NULL
   LIMIT 1;
   ```

2. **Check Browser Console**:
   - Open browser DevTools (F12)
   - Check for image loading errors
   - Look for console warnings about image parsing

3. **Check Network Tab**:
   - See if image URLs are being requested
   - Check if images return 404 or CORS errors

## Next Steps if Still Not Working

### Option 1: Fetch Images from Shopify Products API
If images are still missing, we can:
1. Make additional API calls to Shopify Products API
2. Fetch product images by product_id
3. Cache images in the database

### Option 2: Use Shopify CDN Directly
We can construct image URLs using:
- Product ID: `https://cdn.shopify.com/s/files/1/{shop_id}/products/{product_id}.jpg`
- Variant ID: Similar pattern with variant_id

### Option 3: Store Images in Supabase Storage
1. Download images from Shopify
2. Upload to Supabase Storage
3. Store URLs in database

## Testing

After the fix:
1. Restart the Shopify sync server: `npm run shopify-sync`
2. Wait for a sync cycle (5 minutes) or trigger manual sync
3. Open an order detail modal
4. Check if images appear

If images still don't appear, check:
- Browser console for errors
- Network tab for failed image requests
- Database to see what's stored in `product_images` and `line_items`

