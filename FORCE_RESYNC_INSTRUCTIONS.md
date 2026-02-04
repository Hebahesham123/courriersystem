# 🔄 Force Re-sync All Orders from Shopify

## Problem
Items added or removed in Shopify are not appearing in the system. You need all orders to match Shopify exactly.

## Solution: Force Re-sync All Orders

### Step 1: Run the SQL Migration (if not done already)

Run this in Supabase SQL Editor:
```sql
-- File: ADD_IS_NEW_TO_ORDER_ITEMS.sql
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_order_items_is_new ON order_items(is_new) WHERE is_new = true;
```

### Step 2: Force Re-sync All Orders

**Option A: Using the Script (Recommended)**

1. Make sure your sync server is running:
   ```bash
   npm run shopify-sync
   # or
   node server/shopify-sync.js
   ```

2. Run the force resync script:
   ```bash
   node FORCE_RESYNC_ALL_ORDERS.js
   ```

This will:
- Fetch ALL orders that have a `shopify_order_id`
- Re-sync each order from Shopify
- Update all items to match Shopify exactly (including removed items)
- Show progress and summary

**Option B: Manual Sync via API**

If you have the sync server running, you can manually sync individual orders:

```bash
# Sync a specific order
curl -X POST http://localhost:3002/api/shopify/sync-order/SHOPIFY_ORDER_ID
```

**Option C: Reset and Full Sync**

1. Reset the sync state to fetch all orders:
   ```sql
   UPDATE shopify_sync_state
   SET 
     last_synced_at = '2020-01-01T00:00:00Z'::timestamptz,
     last_sync_status = NULL,
     last_sync_error = NULL,
     updated_at = now()
   WHERE id = 1;
   ```

2. Trigger a full sync:
   ```bash
   curl -X POST http://localhost:3002/api/shopify/sync
   ```

### Step 3: Verify Items Are Syncing

After running the sync, check that items are appearing:

```sql
-- Check items with is_new flag
SELECT 
  oi.id,
  oi.title,
  oi.is_new,
  oi.is_removed,
  oi.quantity,
  o.order_id
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE oi.is_new = true OR oi.is_removed = true
ORDER BY oi.updated_at DESC
LIMIT 20;
```

### Step 4: Check UI

1. Open an order in the admin panel
2. Check if:
   - **New items** show with green "New" badge
   - **Removed items** show with red "Removed" badge and strikethrough
   - All items from Shopify are visible

## What Changed

### Backend Sync Functions
- ✅ `syncOrderItems()` now includes ALL items from Shopify, even if quantity is 0
- ✅ Items removed from Shopify are marked with `is_removed: true` and still appear in the system
- ✅ Newly added items are marked with `is_new: true`
- ✅ Items that exist in DB but not in Shopify are marked as removed

### UI Components
- ✅ OrderDetailModal shows "New" badge for newly added items
- ✅ OrderDetailModal shows "Removed" badge with strikethrough for removed items
- ✅ OrdersList shows badges and messages for new/removed items

## Troubleshooting

### Items Still Not Appearing

1. **Check if sync is running:**
   ```bash
   # Check sync server logs
   tail -f shopify-sync.log
   # or check PM2 logs
   pm2 logs shopify-sync
   ```

2. **Manually sync a specific order:**
   - Go to OrderDetailModal
   - Click "Sync with Shopify" button
   - Check if items appear

3. **Check database:**
   ```sql
   -- Check if items exist in order_items table
   SELECT COUNT(*) FROM order_items WHERE order_id = 'YOUR_ORDER_ID';
   
   -- Check if items have is_new or is_removed flags
   SELECT 
     title,
     is_new,
     is_removed,
     quantity
   FROM order_items
   WHERE order_id = 'YOUR_ORDER_ID';
   ```

### Sync Server Not Running

If the sync server is not running:

1. **Start it:**
   ```bash
   npm run shopify-sync
   # or with PM2
   pm2 start server/shopify-sync.js --name shopify-sync
   ```

2. **Check environment variables:**
   Make sure `.env` has:
   ```
   SHOPIFY_STORE_URL=your-store.myshopify.com
   SHOPIFY_ACCESS_TOKEN=your-token
   SHOPIFY_API_VERSION=2024-10
   SUPABASE_URL=your-url
   SUPABASE_SERVICE_ROLE_KEY=your-key
   ```

## Expected Behavior

After running the force resync:

1. ✅ All orders match Shopify exactly
2. ✅ Newly added items show with green "New" badge
3. ✅ Removed items show with red "Removed" badge and strikethrough
4. ✅ All items from Shopify are visible in the system
5. ✅ Items that were removed from Shopify still appear (marked as removed)

## Notes

- The force resync may take time if you have many orders
- Rate limiting: The script includes delays to avoid Shopify API rate limits
- The `is_new` flag is automatically set to `false` after the first sync
- Removed items remain in the database with `is_removed: true` so they're still visible

