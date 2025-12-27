# 🔧 Fix pg_cron 401 Error

## ❌ Problem

The pg_cron job is getting 401 because the SQL still has `YOUR_ANON_KEY` placeholder instead of your actual anon key.

## ✅ Solution: Update pg_cron SQL

### Step 1: Get Your Anon Key

1. **Go to Supabase Dashboard**
2. **Settings** → **API**
3. **Copy the anon/public key** (the long JWT token)

### Step 2: Update pg_cron SQL

Go to **Supabase Dashboard** → **SQL Editor** and run this SQL (replace `YOUR_ACTUAL_ANON_KEY` with your real anon key):

```sql
-- Drop existing cron job
SELECT cron.unschedule('shopify-sync-every-5-min');

-- Schedule with your actual anon key
SELECT cron.schedule(
  'shopify-sync-every-5-min',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://bdquuixqypkmbvvfymvm.supabase.co/functions/v1/shopify-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_ACTUAL_ANON_KEY',
        'apikey', 'YOUR_ACTUAL_ANON_KEY'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

**Important:** Replace `YOUR_ACTUAL_ANON_KEY` with your real anon key from Dashboard → Settings → API.

### Step 3: Verify

```sql
SELECT * FROM cron.job WHERE jobname = 'shopify-sync-every-5-min';
```

### Step 4: Test

Wait 5 minutes, then check:
```sql
SELECT * FROM shopify_sync_state;
```

Should show `last_sync_status = 'success'`

---

## 🎯 Quick Fix

1. **Get anon key** from Dashboard → Settings → API
2. **Copy the SQL above**
3. **Replace `YOUR_ACTUAL_ANON_KEY`** with your real key
4. **Run the SQL** in Supabase SQL Editor
5. **Wait 5 minutes** and check sync state

That's it! 🎉

