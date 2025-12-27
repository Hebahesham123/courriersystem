# 🔧 Fix 401 "Missing authorization header" Error

## Problem

You're getting `{"code":401,"message":"Missing authorization header"}` when calling Edge Functions.

## ✅ Solution

Supabase Edge Functions require authentication headers. Here's how to fix it:

### Option 1: Fix pg_cron SQL (For Scheduled Sync)

When setting up pg_cron, you need to include **both** `Authorization` and `apikey` headers:

```sql
SELECT cron.schedule(
  'shopify-sync-every-5-min',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://bdquuixqypkmbvvfymvm.supabase.co/functions/v1/shopify-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_ANON_KEY',
        'apikey', 'YOUR_ANON_KEY'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

**Get your anon key:**
1. Go to Supabase Dashboard
2. Settings → API
3. Copy the **anon/public** key

**Replace `YOUR_ANON_KEY`** with your actual key in the SQL above.

---

### Option 2: Test Function with curl

When testing manually, include the authorization header:

```bash
curl -X POST https://bdquuixqypkmbvvfymvm.supabase.co/functions/v1/shopify-sync \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

### Option 3: Update Function to Allow Unauthenticated Calls (Not Recommended)

If you want to allow calls without auth (for webhooks), you can modify the function, but this is **less secure**.

**Better approach:** Use Supabase's built-in webhook authentication or service role key.

---

### Option 4: Use Service Role Key for Internal Calls

For pg_cron calling your own function, you can use the service role key:

```sql
SELECT cron.schedule(
  'shopify-sync-every-5-min',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://bdquuixqypkmbvvfymvm.supabase.co/functions/v1/shopify-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
        'apikey', 'YOUR_SERVICE_ROLE_KEY'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

**Get service role key:**
1. Go to Supabase Dashboard
2. Settings → API
3. Copy the **service_role** key (keep this secret!)

---

## 🎯 Recommended: Use Anon Key for pg_cron

1. **Get your anon key** from Dashboard → Settings → API
2. **Update the pg_cron SQL** with your anon key
3. **Run the SQL** in Supabase SQL Editor

The function will then be called with proper authentication every 5 minutes!

---

## 🧪 Test After Fixing

```bash
# Test sync function
curl -X POST https://bdquuixqypkmbvvfymvm.supabase.co/functions/v1/shopify-sync \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json"

# Should return: {"success":true,"imported":X,"updated":X,"total":X}
```

---

## 📝 Quick Fix Steps

1. **Get anon key:** Dashboard → Settings → API → Copy anon key
2. **Update SQL:** Replace `YOUR_ANON_KEY` in `setup_pg_cron.sql`
3. **Run SQL:** Execute in Supabase SQL Editor
4. **Test:** Use curl command above

That's it! 🎉

