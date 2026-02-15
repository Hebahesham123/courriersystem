# Fix: Base Order Unassignment for Date-Suffixed Orders

## Problem
When assigning Shopify orders to couriers, the base order was not being unassigned. This caused:
1. Couriers seeing the base order (e.g., `41847`) instead of the date-suffixed order (e.g., `41847-30`)
2. Courier edits affecting the base order instead of the date-suffixed order
3. Base orders being overwritten by Shopify sync, losing courier edits

## Solution
After creating a date-suffixed order, we now **unassign the base order** by setting:
- `assigned_courier_id = null`
- `status = "pending"`
- `assigned_at = null`

This ensures:
- ✅ Only date-suffixed orders are assigned to couriers
- ✅ Couriers only see date-suffixed orders in their list
- ✅ Courier edits affect date-suffixed orders, not base orders
- ✅ Base orders remain unassigned and continue syncing with Shopify

## Files Modified

1. **`src/components/Admin/OrdersManagement.tsx`**
   - `handleAssignOrders()`: Unassigns base order after creating date-suffixed order

2. **`src/components/Admin/OrderDetailModal.tsx`**
   - `handleAssignCourier()`: Unassigns base order after creating/updating date-suffixed order

3. **`src/components/Admin/ReceivePieceOrExchange.tsx`**
   - `handleAssignCourier()`: Unassigns base order after creating/updating date-suffixed order
   - `handleBulkAssign()`: Unassigns base orders after bulk creating date-suffixed orders

## How It Works Now

1. **Admin assigns Shopify order 41847 to courier on day 30**
   - Creates date-suffixed order `41847-30` with `assigned_courier_id = courier_id`
   - **Unassigns base order 41847** (sets `assigned_courier_id = null`)

2. **Courier views orders**
   - Query filters by `assigned_courier_id = courier_id`
   - Only sees `41847-30` (base order is unassigned, so not visible)

3. **Courier edits order**
   - Edits `41847-30` (the date-suffixed order)
   - Base order `41847` remains unchanged

4. **Shopify sync runs**
   - Only updates base order `41847` (where `base_order_id IS NULL`)
   - Date-suffixed order `41847-30` is not affected

## Testing

After this fix:
- [ ] Assign a Shopify order to a courier
- [ ] Verify courier sees order with date suffix (e.g., `41847-30`)
- [ ] Verify base order is unassigned (check in admin panel)
- [ ] Have courier edit the order
- [ ] Verify edits are on date-suffixed order, not base order
- [ ] Run Shopify sync
- [ ] Verify only base order is updated, date-suffixed order unchanged

## Notes

- Existing orders assigned before this fix may still have base orders assigned
- For new assignments, base orders will be automatically unassigned
- If needed, you can manually unassign base orders for existing assignments



