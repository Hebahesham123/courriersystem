# 🔄 Complete Solution: Sync All Items from Shopify Exactly

## Problem
Items added or removed in Shopify are not appearing in the system. You need all orders to match Shopify exactly.

## ✅ Complete Solution

### Step 1: Run Database Migration

Run this SQL in Supabase SQL Editor:

```sql
-- Add is_new column to track newly added items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_order_items_is_new ON order_items(is_new) WHERE is_new = true;
```

### Step 2: Force Re-sync All Orders

**Option A: Use the Force Resync Script (Recommended)**

1. Make sure your sync server is running:
   ```bash
   npm run shopify-sync
   # or
   node server/shopify-sync.js
   ```

2. Run the force resync:
   ```bash
   node FORCE_RESYNC_ALL_ORDERS.js
   ```

This will re-sync ALL orders from Shopify and ensure items match exactly.

**Option B: Manual Sync Individual Orders**

In the admin panel, open any order and click "Sync with Shopify" button.

**Option C: Reset Sync State and Full Sync**

1. Reset sync state:
   ```sql
   UPDATE shopify_sync_state
   SET 
     last_synced_at = '2020-01-01T00:00:00Z'::timestamptz,
     last_sync_status = NULL,
     last_sync_error = NULL,
     updated_at = now()
   WHERE id = 1;
   ```

2. Trigger full sync:
   ```bash
   curl -X POST http://localhost:3002/api/shopify/sync
   ```

### Step 3: Verify Items Are Syncing

Check the database:

```sql
-- Check items with is_new or is_removed flags
SELECT 
  oi.id,
  oi.title,
  oi.is_new,
  oi.is_removed,
  oi.quantity,
  o.order_id,
  o.shopify_order_id
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE (oi.is_new = true OR oi.is_removed = true)
  AND o.shopify_order_id IS NOT NULL
ORDER BY oi.updated_at DESC
LIMIT 50;
```

## What Was Fixed

### 1. Backend Sync Functions

**`server/shopify-sync.js`:**
- ✅ Now includes ALL items from Shopify, even if quantity is 0
- ✅ Items removed from Shopify are marked with `is_removed: true` and still appear
- ✅ Newly added items are marked with `is_new: true`
- ✅ Items that exist in DB but not in Shopify are marked as removed
- ✅ Added logging to track removed items

**`supabase/functions/shopify-sync/index.ts`:**
- ✅ Same improvements as above
- ✅ Ensures all items from Shopify are included

**`supabase/functions/shopify-webhook/index.ts`:**
- ✅ Updated to track newly added items
- ✅ Properly marks removed items

### 2. UI Components

**OrderDetailModal:**
- ✅ Shows ALL items (including removed ones)
- ✅ Green "New" badge for newly added items
- ✅ Red "Removed" badge with strikethrough for removed items
- ✅ Green highlight for new items
- ✅ Red highlight for removed items

**OrdersList:**
- ✅ Shows "New" badge for newly added items
- ✅ Shows "Removed" badge for removed items
- ✅ Arabic messages for new/removed items

### 3. Database Schema

- ✅ Added `is_new` column to `order_items` table
- ✅ Indexed for better query performance

## How It Works

### When an Item is Added in Shopify:

1. Shopify sends webhook or sync fetches order
2. System detects item doesn't exist in DB
3. Item is inserted with `is_new: true`
4. UI shows green "New" badge

### When an Item is Removed in Shopify:

1. Item is no longer in Shopify's `line_items` array
2. System detects item exists in DB but not in Shopify
3. Item is marked with `is_removed: true` and `quantity: 0`
4. Item still appears in system with red "Removed" badge and strikethrough

### When an Item is Already in Both:

1. Item exists in both Shopify and DB
2. System updates item data from Shopify
3. `is_new: false` (not newly added)
4. Item displays normally (no badge)

## Expected Behavior After Fix

✅ **All orders match Shopify exactly**
- Every item in Shopify appears in the system
- Items removed from Shopify still appear (marked as removed)
- Items added to Shopify appear with "New" badge

✅ **Visual Indicators:**
- **New items:** Green "New" badge, green text highlight
- **Removed items:** Red "Removed" badge, red strikethrough, red background
- **Normal items:** No badge, normal styling

✅ **Data Accuracy:**
- Quantities match Shopify exactly
- Prices match Shopify exactly
- All items from Shopify are visible

## Troubleshooting

### Items Still Not Appearing

1. **Check if sync is running:**
   ```bash
   # Check sync server logs
   tail -f shopify-sync.log
   # or
   pm2 logs shopify-sync
   ```

2. **Manually sync an order:**
   - Open order in admin panel
   - Click "Sync with Shopify" button
   - Check if items appear

3. **Check database directly:**
   ```sql
   -- Check items for a specific order
   SELECT 
     title,
     is_new,
     is_removed,
     quantity,
     shopify_line_item_id
   FROM order_items
   WHERE order_id = 'YOUR_ORDER_ID'
   ORDER BY is_removed, is_new DESC;
   ```

4. **Verify Shopify connection:**
   ```bash
   curl http://localhost:3002/api/shopify/health
   ```

### Sync Server Not Running

1. **Start sync server:**
   ```bash
   npm run shopify-sync
   # or with PM2
   pm2 start server/shopify-sync.js --name shopify-sync
   ```

2. **Check environment variables:**
   Make sure `.env` has correct values:
   ```
   SHOPIFY_STORE_URL=your-store.myshopify.com
   SHOPIFY_ACCESS_TOKEN=your-token
   SHOPIFY_API_VERSION=2024-10
   SUPABASE_URL=your-url
   SUPABASE_SERVICE_ROLE_KEY=your-key
   ```

## Files Modified

1. `ADD_IS_NEW_TO_ORDER_ITEMS.sql` - Database migration
2. `server/shopify-sync.js` - Main sync function
3. `supabase/functions/shopify-sync/index.ts` - Supabase sync function
4. `supabase/functions/shopify-webhook/index.ts` - Webhook handler
5. `src/components/Admin/OrderDetailModal.tsx` - UI for admin
6. `src/components/Courier/OrdersList.tsx` - UI for courier
7. `FORCE_RESYNC_ALL_ORDERS.js` - Force resync script
8. `FORCE_RESYNC_INSTRUCTIONS.md` - Detailed instructions

## Next Steps

1. ✅ Run the SQL migration
2. ✅ Run the force resync script
3. ✅ Verify items appear in UI
4. ✅ Test adding/removing items in Shopify
5. ✅ Confirm items sync correctly

## Notes

- The `is_new` flag is automatically set to `false` after the first sync
- Removed items remain in the database with `is_removed: true` so they're still visible
- The sync includes ALL items from Shopify, even if quantity is 0
- Items are sorted with removed items at the bottom in the UI

