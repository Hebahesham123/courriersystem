# Date-Suffixed Orders Implementation

## Overview
This implementation ensures that when Shopify orders are assigned to couriers, they get a date-suffixed ID (e.g., `1789-27` for order 1789 assigned on the 27th day of the month). This prevents issues where courier status changes are lost when an order is reassigned the next day.

## Key Features

1. **Date-Suffixed Assignment Orders**: When a Shopify order is assigned to a courier, a new order is created with a date suffix (e.g., `1789-27`, `1789-28`)
2. **Base Order Preservation**: The original order (e.g., `1789`) remains unchanged and continues to sync with Shopify
3. **Shopify Sync Protection**: Only base orders (where `base_order_id IS NULL`) sync with Shopify, protecting date-suffixed assignment orders from being overwritten

## Database Changes

### New Column: `base_order_id`
- **Type**: UUID (references `orders.id`)
- **Purpose**: Links date-suffixed assignment orders back to their base order
- **NULL**: Base orders (sync with Shopify)
- **NOT NULL**: Date-suffixed assignment orders (don't sync with Shopify)

### Migration
Run the SQL file `ADD_BASE_ORDER_ID_COLUMN.sql` in your Supabase SQL Editor to add the column and index.

## How It Works

### Assignment Flow

1. **Admin assigns a Shopify order to a courier**
   - System checks if order has `shopify_order_id` and `base_order_id IS NULL` (base order)
   - If yes, creates a new order with ID like `1789-27` (base order ID + day of month)
   - Links new order to base via `base_order_id`
   - Sets `shopify_order_id = NULL` on the new order (prevents Shopify sync)
   - Assigns the new order to the courier

2. **Same order assigned again next day**
   - System checks if date-suffixed order exists for today
   - If exists, updates it
   - If not, creates a new one (e.g., `1789-28`)

3. **Shopify sync runs**
   - Only updates orders where `base_order_id IS NULL`
   - Date-suffixed orders are never affected by Shopify sync

### Example Scenario

- **Day 1 (27th)**: Order 1789 assigned → Creates `1789-27`, courier updates status
- **Day 2 (28th)**: Order 1789 assigned again → Creates `1789-28` (new assignment, fresh status)
- **Shopify Update**: Only order `1789` (base) gets updated, `1789-27` and `1789-28` remain unchanged

## Modified Files

### Frontend Components
1. **`src/components/Admin/OrdersManagement.tsx`**
   - `handleAssignOrders()`: Creates date-suffixed orders for bulk assignments

2. **`src/components/Admin/OrderDetailModal.tsx`**
   - `handleAssignCourier()`: Creates date-suffixed orders for single order assignments

3. **`src/components/Admin/ReceivePieceOrExchange.tsx`**
   - `handleAssignCourier()`: Creates date-suffixed orders for receive/exchange orders
   - `handleBulkAssign()`: Handles bulk assignments with date suffixes

### Backend Sync Functions
1. **`server/shopify-sync.js`**
   - Updated to only query base orders (`base_order_id IS NULL`)

2. **`supabase/functions/shopify-sync/index.ts`**
   - Updated to only query base orders (`base_order_id IS NULL`)

3. **`supabase/functions/shopify-webhook/index.ts`**
   - Updated to only query base orders (`base_order_id IS NULL`)

## Usage Notes

### For Admins
- When assigning Shopify orders, the system automatically creates date-suffixed orders
- Base orders remain visible in the admin panel and continue to sync with Shopify
- Date-suffixed orders appear as separate orders with the date suffix in the order ID

### For Couriers
- Couriers see the date-suffixed orders (e.g., `1789-27`) in their order list
- Status changes made by couriers are preserved even if the order is reassigned the next day
- Each day's assignment is a fresh order, preventing confusion from previous day's status

### For Developers
- Always check `base_order_id` when querying orders:
  - Base orders: `base_order_id IS NULL` (sync with Shopify)
  - Assignment orders: `base_order_id IS NOT NULL` (don't sync)
- When creating date-suffixed orders:
  - Copy all order data from base order
  - Set `order_id` to `{base_order_id}-{day_of_month}`
  - Set `base_order_id` to the base order's UUID
  - Set `shopify_order_id` to `NULL`
  - Copy order items if they exist

## Testing Checklist

- [ ] Run SQL migration to add `base_order_id` column
- [ ] Assign a Shopify order to a courier (should create date-suffixed order)
- [ ] Verify base order still exists and is unchanged
- [ ] Assign same order again next day (should create new date-suffixed order)
- [ ] Verify Shopify sync only updates base order
- [ ] Verify courier can see and update date-suffixed orders
- [ ] Verify status changes persist on date-suffixed orders

## Troubleshooting

### Issue: Date-suffixed orders not being created
- Check if order has `shopify_order_id` set
- Check if order has `base_order_id IS NULL` (must be base order)
- Check browser console for errors

### Issue: Shopify sync affecting date-suffixed orders
- Verify sync functions have `.is('base_order_id', null)` filter
- Check that date-suffixed orders have `shopify_order_id = NULL`

### Issue: Order items not copied
- Verify `order_items` table exists
- Check that order items are being copied in assignment functions



