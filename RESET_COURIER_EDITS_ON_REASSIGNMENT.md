# Reset Courier Edits on Reassignment - Complete Fix

## Problem
When reassigning a base order to a new courier, the new courier was seeing the previous courier's edits (status, delivery fee, payment info, etc.).

## Solution
When reassigning a base order (either creating a new date-suffixed order or updating an existing one), we now **completely reset ALL courier-editable fields** to ensure the new courier sees a fresh order.

## Fields That Are Reset

### Always Reset to Defaults:
1. **`status`** → Always set to `"assigned"` (never copy from previous courier)
2. **`delivery_fee`** → `null`
3. **`partial_paid_amount`** → `null`
4. **`collected_by`** → `null`
5. **`payment_sub_type`** → `null`
6. **`internal_comment`** → `null`

### Restored from Base Order (Shopify Original):
7. **`payment_method`** → From base order (original from Shopify)
8. **`payment_status`** → From base order (original from Shopify)
9. **`financial_status`** → From base order (original from Shopify)

## Implementation Details

### When Creating NEW Date-Suffixed Order:
- Explicitly sets each field (doesn't use spread operator)
- Always sets `status: "assigned"`
- Always sets all courier-editable fields to `null`
- Gets payment info from base order

### When UPDATING Existing Date-Suffixed Order (Same Day Reassignment):
- Explicitly resets `status` to `"assigned"`
- Explicitly resets all courier-editable fields to `null`
- Restores payment fields from base order
- Updates `assigned_at` and `updated_at` timestamps

## Files Modified

1. **`src/components/Admin/OrdersManagement.tsx`**
   - `handleAssignOrders()`: Resets all fields when creating/updating date-suffixed orders

2. **`src/components/Admin/OrderDetailModal.tsx`**
   - `handleAssignCourier()`: Resets all fields when creating/updating date-suffixed orders

3. **`src/components/Admin/ReceivePieceOrExchange.tsx`**
   - `handleAssignCourier()`: Resets all fields when creating/updating date-suffixed orders
   - `handleBulkAssign()`: Resets all fields when bulk creating/updating date-suffixed orders

## Testing Checklist

- [ ] Assign base order to Courier A
- [ ] Courier A edits status to "delivered" and adds delivery fee
- [ ] Reassign base order to Courier B (same day)
- [ ] Verify Courier B sees:
  - Status: "assigned" (not "delivered")
  - Delivery fee: `null` (not Courier A's value)
  - Payment info: Original from Shopify
  - All other courier edits: Reset to defaults
- [ ] Reassign base order to Courier C (different day)
- [ ] Verify Courier C sees fresh order with no edits from Courier A or B

## Debugging

Console logs have been added to track when date-suffixed orders are being reset:
- Look for: `🔄 Reassigning date-suffixed order - resetting all courier edits`
- Check browser console when reassigning orders

## Important Notes

1. **Base Order Protection**: The base order is always unassigned after creating a date-suffixed order, so it never gets courier edits
2. **Shopify Sync**: Only base orders sync with Shopify, so payment info is always original
3. **Status Reset**: Status is ALWAYS reset to "assigned" - never copied from previous courier
4. **Complete Reset**: ALL courier-editable fields are reset, not just some



