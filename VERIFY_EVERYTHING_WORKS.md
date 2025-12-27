# ✅ Complete Verification Checklist

## Step-by-Step Testing Guide

---

## 1️⃣ Verify Supabase Secrets Are Set

### Go to Supabase Dashboard:
1. **Open**: https://supabase.com/dashboard/project/bdquuixqypkmbvvfymvm
2. **Click**: Project Settings → Edge Functions → Secrets
3. **Verify you see these 3 secrets:**
   - ✅ `SHOPIFY_STORE_URL` = `your-store-name.myshopify.com`
   - ✅ `SHOPIFY_ACCESS_TOKEN` = `shpat_xxxxx...` (should be long, 70+ chars)
   - ✅ `SHOPIFY_API_VERSION` = `2024-10`

**If any are missing, add them now!**

---

## 2️⃣ Test Shopify Sync Function

### Option A: Manual Test (Recommended)

1. **Go to**: Supabase Dashboard → Edge Functions → `shopify-sync`
2. **Click**: "Invoke function" or "Test" button
3. **Check the logs** (click "Logs" tab)

**✅ Good Signs:**
```
✅ Available SHOPIFY env vars: ['SHOPIFY_STORE_URL', 'SHOPIFY_ACCESS_TOKEN', 'SHOPIFY_API_VERSION']
✅ SHOPIFY_STORE_URL exists: true
✅ SHOPIFY_ACCESS_TOKEN exists: true
✅ Shopify config: { storeUrl: 'your-store.myshopify.com', ... }
✅ Fetching orders from: https://your-store.myshopify.com/admin/api/2024-10/orders.json...
✅ Page 1: Fetched 250 orders, processing...
✅ New orders imported: X
✅ Existing orders updated: Y
✅ Sync completed successfully
```

**❌ Bad Signs (Errors):**
```
❌ SHOPIFY_ACCESS_TOKEN secret is not set
❌ Shopify API error: 401 (token wrong)
❌ Shopify API error: 404 (store URL wrong)
❌ column orders.archived does not exist (need to run SQL)
```

### Option B: Check Sync State in Database

Run this SQL in Supabase SQL Editor:

```sql
SELECT * FROM shopify_sync_state;
```

**Should show:**
- `last_sync_status` = `'success'`
- `last_synced_at` = recent timestamp
- `last_sync_error` = `null`

---

## 3️⃣ Verify Orders Are in Database

### Check Orders Table:

Run this SQL:

```sql
-- Count total orders
SELECT COUNT(*) as total_orders FROM orders;

-- Check recent orders
SELECT 
  order_id, 
  shopify_order_id, 
  customer_name, 
  total_order_fees,
  shopify_created_at,
  created_at
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;
```

**✅ Should see:**
- Orders with `shopify_order_id` populated
- Recent `created_at` timestamps
- Customer names and order totals

---

## 4️⃣ Test Frontend - Orders Management Page

### Open Your Application:

1. **Go to**: Orders Management page in your app
2. **Check these:**

**✅ Default View:**
- Should show orders from last 3 months (not all orders)
- Statistics cards at top should show numbers
- Orders table should display orders

**✅ Search Function:**
- Search for a specific order number (e.g., "38737" or "38738")
- Should find the order
- Try searching by customer name
- Try searching by phone number

**✅ Date Filter:**
- Click date picker
- Select "Today" - should show today's orders
- Select "Yesterday" - should show yesterday's orders
- Times should match Shopify times (Africa/Cairo timezone)

**✅ Order Status Filter:**
- Filter by "Open" - should show only open orders
- Filter by "Archived" - should show archived orders
- Filter by "Canceled" - should show canceled orders

**✅ Tag Filter:**
- All available tags should appear in dropdown
- Filtering by tag should work
- Tags should appear even if current day's orders don't have them

**✅ Payment Status Filter:**
- Should filter by payment status correctly

**✅ Fulfillment Status Filter:**
- Should filter by fulfillment status correctly

---

## 5️⃣ Verify Order Details

### Click on an Order:

1. **Open an order** from the list
2. **Check:**
   - ✅ Order number matches Shopify
   - ✅ Customer name is correct
   - ✅ Order total matches Shopify
   - ✅ Order date/time matches Shopify (Africa/Cairo timezone)
   - ✅ Product images load (if available)
   - ✅ Line items are displayed
   - ✅ Payment method is correct
   - ✅ Shipping address is correct

---

## 6️⃣ Test Specific Order Search

### Search for Order #38737 or #38738:

1. **In Orders Management**, use the search box
2. **Type**: `38737` or `38738`
3. **Should find the order** (if it exists in Shopify)

**If order not found:**
- Check if it was synced: Run SQL to check `shopify_order_id = 38737`
- If not synced, trigger sync again
- Check if order is archived/canceled (might be filtered out)

---

## 7️⃣ Verify Statistics Are Correct

### Check Dashboard Statistics:

1. **Go to Dashboard** (if you have one)
2. **Check:**
   - ✅ "Paid Orders" count is correct
   - ✅ "COD Orders" count is correct
   - ✅ "Total Value" matches sum of orders
   - ✅ "Today's Orders" shows orders from 12 AM to 12 AM (Africa/Cairo time)

---

## 8️⃣ Test Sync Completeness

### Verify All Orders Are Synced:

Run this SQL to check:

```sql
-- Check if we have orders from different time periods
SELECT 
  DATE(shopify_created_at) as order_date,
  COUNT(*) as order_count
FROM orders
WHERE shopify_created_at IS NOT NULL
GROUP BY DATE(shopify_created_at)
ORDER BY order_date DESC
LIMIT 30;
```

**Should show:**
- Orders from multiple dates
- Recent orders
- Older orders (if sync fetched all orders)

---

## 9️⃣ Check for Errors in Logs

### Check Supabase Function Logs:

1. **Go to**: Supabase Dashboard → Edge Functions → `shopify-sync` → Logs
2. **Look for:**
   - ❌ Any red error messages
   - ❌ 401 errors (token issue)
   - ❌ 404 errors (store URL issue)
   - ❌ Column errors (missing database columns)

**If you see errors, note them down and fix them.**

---

## 🔟 Final Checklist

- [ ] Supabase Secrets are set (all 3)
- [ ] Sync function runs without errors
- [ ] Orders appear in database
- [ ] Frontend shows orders correctly
- [ ] Search works (can find orders)
- [ ] Date filters work correctly
- [ ] Order status filters work (Open/Archived/Canceled)
- [ ] Tag filters work
- [ ] Order details display correctly
- [ ] Statistics are accurate
- [ ] Times match Shopify (Africa/Cairo timezone)
- [ ] No errors in logs

---

## 🆘 If Something Doesn't Work

### Common Issues:

1. **"401 Unauthorized"**
   - Token is wrong → Check Supabase Secrets
   - Token format wrong → Should start with `shpat_`

2. **"404 Not Found"**
   - Store URL wrong → Check format (no `https://`, no trailing `/`)

3. **"Column does not exist"**
   - Run the SQL migration scripts:
     - `ADD_SHOPIFY_CLOSED_AT_COLUMN.sql`
     - `ADD_ARCHIVED_TO_SHOPIFY_ORDERS.sql`

4. **Orders not appearing**
   - Check if sync ran successfully
   - Check if orders are archived/canceled (might be filtered)
   - Check date range filter

5. **Search not finding orders**
   - Check if order exists in database
   - Check if order is archived (search should bypass archive filter)

---

## ✅ Success Criteria

Everything is working if:
- ✅ Sync function completes successfully
- ✅ Orders appear in frontend
- ✅ Search finds orders
- ✅ Filters work correctly
- ✅ No errors in logs
- ✅ Statistics are accurate

---

**Run through this checklist and let me know what works and what doesn't!**

