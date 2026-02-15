# 🔧 Fix: Financial Status Constraint Error

## The Problem

When syncing orders with edited/removed items, you're getting this error:

```
new row for relation "orders" violates check constraint "orders_financial_status_check"
```

This happens because Shopify uses `partially_paid` but the database constraint only allows `partial`.

## Solution

### Step 1: Run the SQL Fix

Run this SQL in your Supabase SQL Editor:

```sql
-- File: FIX_FINANCIAL_STATUS_CONSTRAINT.sql
```

This will:
1. Drop the old constraint
2. Normalize existing values
3. Add a new constraint that accepts both Shopify values and our standard values

### Step 2: The Sync Function is Already Fixed

The sync function (`server/shopify-sync.js`) now normalizes Shopify financial_status values:
- `partially_paid` → `partial`
- `pending_payment` → `pending`
- `partially_refunded` → `refunded`

### Step 3: Re-run the Sync

After running the SQL fix, re-run your sync:

```bash
node FORCE_RESYNC_ALL_ORDERS.js
```

## What Changed

### Database Constraint
- Now accepts both Shopify values (`partially_paid`) and our standard values (`partial`)
- Case-insensitive matching
- More permissive to prevent future errors

### Sync Function
- Normalizes Shopify values to our standard values before saving
- Handles all Shopify financial_status variations
- Defaults to `pending` for unknown values

## Expected Result

After the fix:
- ✅ Orders with `partially_paid` will sync successfully
- ✅ Values are normalized to `partial` in the database
- ✅ No more constraint violation errors
- ✅ All orders with edited/removed items will sync properly

## Verification

After running the fix, verify it worked:

```sql
-- Check that constraint allows the values
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'orders_financial_status_check';

-- Check for any orders with problematic values
SELECT 
    financial_status,
    COUNT(*) as count
FROM orders 
WHERE financial_status IS NOT NULL
AND LOWER(financial_status) NOT IN (
    'paid', 'partial', 'partially_paid', 'pending', 'pending_payment', 
    'authorized', 'overdue', 'refunded', 'partially_refunded', 'disputed', 'voided'
)
GROUP BY financial_status;
```

If the second query returns no rows, the fix worked! ✅


