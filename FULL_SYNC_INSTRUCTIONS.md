# 🔄 Sync All Orders from Shopify

## 🎯 Goal

Sync **ALL** orders from Shopify, not just new ones.

## ✅ Solution: Reset Sync State

### Step 1: Reset Last Synced Date

Go to **Supabase Dashboard** → **SQL Editor** and run:

```sql
-- Reset to fetch all orders from the beginning
UPDATE shopify_sync_state
SET 
  last_synced_at = '2020-01-01T00:00:00Z'::timestamptz,
  last_sync_status = NULL,
  last_sync_error = NULL,
  updated_at = now()
WHERE id = 1;
```

This will make the next sync fetch **all orders** from Shopify (from 2020 onwards).

### Step 2: Trigger Sync

**Option A: Wait for Cron Job**
- Wait 5 minutes for the next automatic sync
- It will fetch all orders

**Option B: Manual Trigger (Faster)**
```bash
curl -X POST https://bdquuixqypkmbvvfymvm.supabase.co/functions/v1/shopify-sync \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Step 3: Monitor Progress

Check how many orders are being synced:

```sql
-- Count total orders synced
SELECT COUNT(*) as total_orders FROM shopify_orders;

-- Check recent syncs
SELECT 
  last_synced_at,
  last_sync_status,
  last_sync_error
FROM shopify_sync_state;
```

### Step 4: Check Logs

Go to **Dashboard** → **Functions** → **shopify-sync** → **Logs**

You should see:
```
Syncing X orders from Shopify
```

---

## ⚠️ Important Notes

1. **Large Order Count:** If you have thousands of orders, this might take multiple sync cycles (Shopify API limit is 250 orders per request)

2. **Multiple Syncs:** The function will fetch 250 orders at a time. If you have more, it will need multiple runs to get them all.

3. **After Full Sync:** Once all orders are synced, the function will automatically only fetch new orders going forward.

---

## 🔄 How It Works

- **Before:** Only syncs orders created after `last_synced_at` (recent orders)
- **After reset:** Syncs all orders from 2020-01-01 onwards
- **Next syncs:** Will only get new orders (after the latest `last_synced_at`)

---

## 📊 Verify All Orders Synced

After the sync completes:

```sql
-- Compare with Shopify (approximate)
SELECT COUNT(*) as synced_orders FROM shopify_orders;

-- Check latest order
SELECT 
  order_id,
  customer_name,
  total_price,
  shopify_created_at
FROM shopify_orders
ORDER BY shopify_created_at DESC
LIMIT 1;
```

---

## 🎯 Quick Steps

1. **Run SQL:** Reset `last_synced_at` to `2020-01-01`
2. **Trigger sync:** Manual curl or wait for cron
3. **Monitor:** Check logs and `shopify_orders` table
4. **Done:** All orders will be synced!

That's it! 🎉

