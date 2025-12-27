# 🚀 Quick Setup Commands

## ✅ Step 1: Create Database Tables

Run this SQL in **Supabase Dashboard** → **SQL Editor**:

Copy the contents of `supabase/migrations/create_shopify_tables.sql` and run it.

Or run via CLI:
```bash
npx supabase@latest db push
```

---

## ✅ Step 2: Create Edge Functions

```bash
# Create webhook function
npx supabase@latest functions new shopify-webhook

# Create sync function
npx supabase@latest functions new shopify-sync
```

---

## ✅ Step 3: Add Function Code

### Webhook Function (`supabase/functions/shopify-webhook/index.ts`)

Copy the code from `SUPABASE_SYNC_SETUP.md` (Step 2.4) or I'll create the file for you.

### Sync Function (`supabase/functions/shopify-sync/index.ts`)

Copy the code from `SUPABASE_SYNC_SETUP.md` (Step 3.2) or I'll create the file for you.

---

## ✅ Step 4: Set Environment Variables

Go to **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**

Add:
```
SHOPIFY_STORE_URL=your-store-name.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_shopify_token
SHOPIFY_API_VERSION=2024-10
```

---

## ✅ Step 5: Deploy Functions

```bash
npx supabase@latest functions deploy shopify-webhook
npx supabase@latest functions deploy shopify-sync
```

---

## ✅ Step 6: Set Up pg_cron

Run this SQL in **Supabase Dashboard** → **SQL Editor**:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule cron job (replace YOUR_PROJECT_REF and YOUR_ANON_KEY)
SELECT cron.schedule(
  'shopify-sync-every-5-min',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://bdquuixqypkmbvvfymvm.supabase.co/functions/v1/shopify-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_ANON_KEY'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

**Replace `YOUR_ANON_KEY` with your Supabase anon key** (from Dashboard → Settings → API)

---

## ✅ Step 7: Configure Shopify Webhooks

1. Go to **Shopify Admin** → **Settings** → **Notifications** → **Webhooks**
2. Create webhook:
   - **Event:** Order creation
   - **URL:** `https://bdquuixqypkmbvvfymvm.supabase.co/functions/v1/shopify-webhook`
   - **Format:** JSON
3. Repeat for: Order paid, Order cancelled, Order fulfilled, Order updated

---

## 🎯 Next: Create the Edge Functions

Run these commands:

```bash
npx supabase@latest functions new shopify-webhook
npx supabase@latest functions new shopify-sync
```

Then I'll help you add the code to these functions!

