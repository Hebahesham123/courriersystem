# Shopify Items Sync Fix - New/Removed Items Tracking

## Problem
When items are added or removed in Shopify, they were not appearing in the system with proper indicators. The system needed to:
- Show removed items with a dash/strikethrough
- Show newly added items with a "New" badge

## Solution Implemented

### 1. Database Schema Update
Added `is_new` column to `order_items` table to track newly added items.

**Action Required:** Run the SQL migration file:
```sql
-- File: ADD_IS_NEW_TO_ORDER_ITEMS.sql
-- Run this in Supabase SQL Editor
```

### 2. Backend Sync Functions Updated
Updated all sync functions to detect and mark newly added items:

- **`server/shopify-sync.js`**: Updated `syncOrderItems()` function
- **`supabase/functions/shopify-sync/index.ts`**: Updated sync function
- **`supabase/functions/shopify-webhook/index.ts`**: Updated webhook handler

**How it works:**
- When syncing items, the system compares existing DB items with Shopify items
- Items that exist in Shopify but not in the database are marked as `is_new: true`
- Items that were removed from Shopify are marked as `is_removed: true`
- Existing items have `is_new: false`

### 3. UI Components Updated

#### OrderDetailModal (`src/components/Admin/OrderDetailModal.tsx`)
- Added `is_new` field to `OrderItem` interface
- Added green "New" badge for newly added items
- Added green highlight styling for new items
- Added informational message: "✨ This item was newly added to the order in Shopify"

#### OrdersList (`src/components/Courier/OrdersList.tsx`)
- Updated query to include `is_new` field
- Added green "New" badge for newly added items
- Added green highlight styling for new items
- Added Arabic message: "✨ تم إضافة هذا المنتج إلى الطلب في Shopify"

### 4. Visual Indicators

**Removed Items:**
- Red badge with "Removed" text
- Red strikethrough on text and prices
- Red background with reduced opacity
- Warning message: "⚠️ This item was removed from the order in Shopify"

**Newly Added Items:**
- Green badge with "New" text
- Green text color for titles and prices
- Green background highlight
- Success message: "✨ This item was newly added to the order in Shopify"

## Testing

After running the SQL migration:

1. **Test Adding Items:**
   - Add an item to an order in Shopify
   - Sync the order (or wait for webhook)
   - Check that the item appears with a green "New" badge

2. **Test Removing Items:**
   - Remove an item from an order in Shopify
   - Sync the order (or wait for webhook)
   - Check that the item appears with red strikethrough and "Removed" badge

3. **Test Existing Items:**
   - Items that were already in the order should not show any badge
   - They should display normally

## Notes

- The `is_new` flag is automatically set to `false` after the first sync
- Manually removed items (removed by admin in the system) are preserved
- The sync functions handle edge cases like fulfillments and refunds
- All changes are backward compatible - existing items will have `is_new: false` by default

## Files Modified

1. `ADD_IS_NEW_TO_ORDER_ITEMS.sql` (new file)
2. `server/shopify-sync.js`
3. `supabase/functions/shopify-sync/index.ts`
4. `supabase/functions/shopify-webhook/index.ts`
5. `src/components/Admin/OrderDetailModal.tsx`
6. `src/components/Courier/OrdersList.tsx`

