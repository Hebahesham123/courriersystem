# 🔍 Final Image Debugging Steps

## The Problem
Images are being fetched from Shopify and stored in the database, but they're not appearing in the UI.

## What We've Done
1. ✅ Added image fetching from Shopify Products API
2. ✅ Fixed ID matching (string vs number issue)
3. ✅ Added comprehensive debugging logs
4. ✅ Improved image URL validation

## Next Steps - Debug Checklist

### Step 1: Check Browser Console
When you open an order detail modal, check the browser console (F12) for these logs:

1. **Order Data Received:**
   ```
   🔍 Order data received: {
     id: "...",
     has_product_images: true/false,
     has_line_items: true/false,
     product_images_type: "string" or "object",
     product_images_value: [...]
   }
   ```

2. **Product Images Parsing:**
   ```
   📸 Parsing product_images: [...]
   📸 Mapped variant_id X to image: ...
   📸 Final productImagesMap: {...}
   ```

3. **Line Items Parsing:**
   ```
   📦 Parsed line_items: {
     count: X,
     first_item: {...}
   }
   ```

4. **Image Matching:**
   ```
   ✅ Found image via variant_id X: ...
   ✅ Item "..." has image: ...
   ```

### Step 2: Check What's Actually in Database

Run this SQL in Supabase:

```sql
SELECT 
  order_id,
  shopify_order_id,
  jsonb_array_length(COALESCE(product_images::jsonb, '[]'::jsonb)) as image_count,
  product_images::jsonb->0 as first_image_entry,
  jsonb_array_length(COALESCE(line_items::jsonb, '[]'::jsonb)) as line_items_count,
  line_items::jsonb->0->>'variant_id' as first_variant_id,
  line_items::jsonb->0->>'product_id' as first_product_id
FROM orders
WHERE shopify_order_id IS NOT NULL
  AND product_images IS NOT NULL
ORDER BY created_at DESC
LIMIT 3;
```

### Step 3: Verify Image URLs Work

Open one of the image URLs directly in your browser. For example:
- `https://cdn.shopify.com/s/files/1/0484/5489/3719/files/celine-hippo-drawstring-cuile-triomphe-822660.webp?v=1721268684`

If the image loads in the browser, the URL is valid.

### Step 4: Check Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "Img"
4. Open an order detail modal
5. Check if image requests are being made
6. Check if they return 200 (success) or errors (404, 403, CORS)

### Step 5: Common Issues

#### Issue 1: product_images is NULL
**Solution:** Wait for sync to complete, or manually trigger sync

#### Issue 2: IDs don't match
**Symptom:** Console shows `⚠️ No image in map for variant X`
**Solution:** Check if variant_id/product_id types match (string vs number)

#### Issue 3: Image URLs are invalid
**Symptom:** Network tab shows 404 or CORS errors
**Solution:** Images might be deleted from Shopify

#### Issue 4: Images load but don't display
**Symptom:** Network shows 200, but no image in UI
**Solution:** Check CSS/styling, image might be hidden

## Quick Test

1. Open browser console (F12)
2. Open an order detail modal
3. Copy and paste ALL console logs here
4. This will help identify the exact issue

## Expected Console Output

For an order WITH images, you should see:
```
🔍 Order data received: { has_product_images: true, ... }
📸 Parsing product_images: [{ variant_id: X, image: "https://...", ... }]
📸 Mapped variant_id X to image: https://...
📦 Parsed line_items: { count: 1, first_item: { variant_id: X, ... } }
✅ Found image via variant_id X: https://...
✅ Item "Product Name" has image: https://...
✅ Successfully loaded image: https://...
```

If you see `⚠️` warnings instead of `✅`, that's where the problem is!

