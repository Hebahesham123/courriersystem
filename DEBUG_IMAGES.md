# 🐛 Debug Product Images Not Appearing

## Steps to Debug

### 1. Check Browser Console
Open the order detail modal and check the browser console (F12). You should see logs like:
- `📸 Product images from order: [...]`
- `📸 Final productImagesMap: {...}`
- `🔍 Processing item 0: {...}`
- `✅ Found image via variant_id X: ...` or `⚠️ No image in map...`

### 2. Check Sync Server Logs
When the sync runs, check the terminal where `npm run shopify-sync` is running. Look for:
- `📸 Fetching products batch X: Y products`
- `📸 Received X products with image data`
- `📸 Mapped product X to image: ...`
- `📸 Fetched images for X products/variants across all orders`
- `📸 Product images for order X: [...]`

### 3. Check Database
Run this SQL in Supabase SQL Editor:

```sql
-- Check if product_images field has data
SELECT 
  order_id,
  shopify_order_id,
  customer_name,
  product_images,
  jsonb_array_length(COALESCE(product_images::jsonb, '[]'::jsonb)) as image_count
FROM orders
WHERE shopify_order_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

### 4. Check if Images are Being Fetched
Look for these in sync logs:
- `📸 Fetching images for order X: {productIds: X, variantIds: Y}`
- `📸 Fetched X images`

### 5. Verify API Access
The sync needs `read_products` scope. Check if you see 403 errors in sync logs.

## Common Issues

### Issue 1: No product_images in database
**Symptom**: `product_images` field is NULL or empty
**Solution**: 
- Restart sync server
- Wait for next sync cycle
- Check sync logs for errors

### Issue 2: Images fetched but not displayed
**Symptom**: Database has `product_images` but modal shows placeholder
**Solution**:
- Check browser console for image URL errors
- Verify image URLs are valid (try opening in browser)
- Check CORS issues

### Issue 3: 403 Forbidden errors
**Symptom**: Sync logs show `403 Forbidden` when fetching products
**Solution**:
- Add `read_products` scope to Shopify Admin API access token
- Regenerate access token
- Update `.env` file

### Issue 4: Images are null/empty
**Symptom**: `product_images` exists but all images are null
**Solution**:
- Products might not have images in Shopify
- Check Shopify Admin to verify products have images
- Some products might be deleted

## Quick Test

1. **Open browser console** (F12)
2. **Open an order detail modal**
3. **Check console logs** - you should see:
   ```
   📸 Product images from order: [...]
   📸 Final productImagesMap: {...}
   🔍 Processing item 0: {...}
   ```

4. **If you see `⚠️ No product_images field in order`**:
   - Images haven't been fetched yet
   - Restart sync server
   - Wait for sync to complete

5. **If you see `⚠️ No image in map`**:
   - Check database to see if `product_images` has data
   - Check if variant_id/product_id match

## Manual Test

To manually trigger image fetch for existing orders:

1. Stop sync server (Ctrl+C)
2. Restart it: `npm run shopify-sync`
3. Wait for sync to complete
4. Check database again
5. Refresh page and open order modal

## Still Not Working?

If images still don't appear after checking all above:

1. **Share browser console logs** (screenshot or copy/paste)
2. **Share sync server logs** (the terminal output)
3. **Share database query results** (from step 3 above)

This will help identify the exact issue.

