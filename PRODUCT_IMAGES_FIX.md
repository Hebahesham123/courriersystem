# 🖼️ Product Images Fix - Fetching from Shopify Products API

## Problem
Product images were not appearing in order details because Shopify's Orders API doesn't return product images in `line_items` by default.

## Solution Implemented

### 1. Added Product Image Fetching Function
- Created `fetchProductImages()` function that fetches product images from Shopify Products API
- Fetches images by product_id and maps them to variant_ids
- Handles multiple API versions with fallback
- Batches requests (up to 250 products per request)

### 2. Batch Image Fetching
- Collects all product IDs from all orders before processing
- Fetches all images in one batch (more efficient)
- Maps images to both product_id and variant_id

### 3. Image Mapping
- Images are stored in `product_images` field as JSON
- Each entry includes: `product_id`, `variant_id`, `image` (URL), `title`
- Images are matched to line items by variant_id (preferred) or product_id

## How It Works

1. **During Sync**:
   - Collects all product_ids and variant_ids from all orders
   - Makes batch API calls to Shopify Products API
   - Fetches product images and maps them to variants
   - Stores images in `product_images` field

2. **In Order Detail Modal**:
   - Reads `product_images` from order
   - Creates a map of variant_id/product_id → image URL
   - Matches images to line items
   - Displays images in the product list

## Testing

1. **Restart the sync server**:
   ```bash
   npm run shopify-sync
   ```

2. **Wait for sync** (or trigger manual sync):
   - The sync will fetch product images from Shopify
   - Check console for: `📸 Fetched images for X products/variants`

3. **Check database**:
   ```sql
   SELECT 
     order_id,
     product_images
   FROM orders
   WHERE shopify_order_id IS NOT NULL
   LIMIT 1;
   ```

4. **Open order detail modal**:
   - Images should now appear for each product

## API Requirements

The sync requires:
- `read_products` scope in Shopify Admin API access token
- Products API access (usually included with Admin API access)

## Performance

- **Batch fetching**: All images fetched in one batch (faster)
- **Caching**: Images stored in database, no need to refetch every time
- **Rate limiting**: Respects Shopify API rate limits (40 requests per app per store per minute)

## Troubleshooting

### Images still not appearing?

1. **Check console logs**:
   - Look for `📸 Fetched images for X products/variants`
   - Check for any error messages

2. **Verify API access**:
   - Ensure access token has `read_products` scope
   - Test API access manually

3. **Check database**:
   - Verify `product_images` field has data
   - Check if image URLs are valid

4. **Browser console**:
   - Check for image loading errors
   - Verify image URLs are accessible

### Common Issues

- **403 Forbidden**: Access token missing `read_products` scope
- **404 Not Found**: Product might be deleted
- **Empty images**: Product might not have images in Shopify

## Next Steps

If images still don't appear:
1. Check browser console for errors
2. Verify product_images field in database
3. Test image URLs directly in browser
4. Check Shopify Admin to confirm products have images

