# 🔄 Manual Sync Order to Fix Missing Items

## Quick Fix: Sync a Specific Order

If items added/removed in Shopify aren't appearing, manually sync the order:

### Method 1: Using the UI (Easiest)

1. Open the order in the admin panel
2. Click the **"Sync with Shopify"** button (top right)
3. Wait for the sync to complete
4. Refresh the page
5. Check if items now appear

### Method 2: Using the API

If the sync server is running:

```bash
# Replace ORDER_ID with the Shopify order ID (number)
curl -X POST http://localhost:3002/api/shopify/sync-order/ORDER_ID
```

Example:
```bash
curl -X POST http://localhost:3002/api/shopify/sync-order/6564373627093
```

### Method 3: Check Database Directly

Run this SQL to see what items are in the database:

```sql
-- Check items for a specific order
SELECT 
    oi.id,
    oi.title,
    oi.is_new,
    oi.is_removed,
    oi.quantity,
    oi.shopify_line_item_id,
    o.order_id,
    o.shopify_order_id
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.shopify_order_id = 6564373627093  -- Replace with your order ID
ORDER BY oi.is_removed, oi.is_new DESC, oi.created_at;
```

## Verify Items Are Syncing

Run `VERIFY_ITEMS_SYNC.sql` in Supabase SQL Editor to check:
- If items have `is_new` or `is_removed` flags
- If items are being synced at all
- Recent sync activity

## Common Issues

### Issue 1: Items Not Appearing After Sync

**Check:**
1. Is the sync server running? (`npm run shopify-sync`)
2. Did the sync complete successfully? (Check terminal/logs)
3. Are items in the database? (Run SQL query above)
4. Is the UI filtering them out? (Should be fixed now)

### Issue 2: Sync Server Not Running

**Solution:**
```bash
# Start sync server
npm run shopify-sync

# Keep it running, then sync orders
```

### Issue 3: Items in DB But Not Showing in UI

**Check:**
1. Refresh the page
2. Check browser console for errors
3. Verify items have correct `is_removed` or `is_new` flags
4. Check if UI is filtering items (should be fixed)

## Expected Behavior

After syncing:
- ✅ **New items** should show with green "New" badge
- ✅ **Removed items** should show with red "Removed" badge and strikethrough
- ✅ **All items** from Shopify should be visible

## Next Steps

1. Run the SQL fix: `FIX_FINANCIAL_STATUS_CONSTRAINT.sql`
2. Start sync server: `npm run shopify-sync`
3. Manually sync a test order
4. Verify items appear in UI
5. If working, run full resync: `node FORCE_RESYNC_ALL_ORDERS.js`


