# 🚀 Supabase Sync Setup - Next Steps

## ✅ Step 1: Link to Your Supabase Project

Run this command (replace `YOUR_PROJECT_REF` with your actual project reference):

```bash
npx supabase@latest link --project-ref YOUR_PROJECT_REF
```

**To find your project reference:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **General**
4. Copy the **Reference ID** (looks like: `abcdefghijklmnop`)

**Example:**
```bash
npx supabase@latest link --project-ref abcdefghijklmnop
```

You'll be prompted to enter your database password.

---

## ✅ Step 2: Create Database Tables

1. **Go to Supabase Dashboard** → **SQL Editor**
2. **Copy and paste** the SQL from `SUPABASE_SYNC_SETUP.md` (Step 1: Create Database Tables)
3. **Run the SQL** to create:
   - `shopify_orders` table
   - `shopify_order_items` table
   - `shopify_sync_state` table

---

## ✅ Step 3: Create Edge Functions

### Create Webhook Function:

```bash
npx supabase@latest functions new shopify-webhook
```

### Create Sync Function:

```bash
npx supabase@latest functions new shopify-sync
```

---

## ✅ Step 4: Add Function Code

### 4.1 Edit `supabase/functions/shopify-webhook/index.ts`

Copy the webhook function code from `SUPABASE_SYNC_SETUP.md` (Step 2.4)

### 4.2 Edit `supabase/functions/shopify-sync/index.ts`

Copy the sync function code from `SUPABASE_SYNC_SETUP.md` (Step 3.2)

---

## ✅ Step 5: Set Environment Variables

1. **Go to Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. **Add these secrets:**
   ```
   SHOPIFY_STORE_URL=your-store-name.myshopify.com
   SHOPIFY_ACCESS_TOKEN=your_shopify_token
   SHOPIFY_API_VERSION=2024-10
   ```

---

## ✅ Step 6: Deploy Functions

```bash
# Deploy webhook function
npx supabase@latest functions deploy shopify-webhook

# Deploy sync function
npx supabase@latest functions deploy shopify-sync
```

After deployment, you'll get URLs like:
- `https://YOUR_PROJECT_REF.supabase.co/functions/v1/shopify-webhook`
- `https://YOUR_PROJECT_REF.supabase.co/functions/v1/shopify-sync`

---

## ✅ Step 7: Set Up pg_cron

1. **Go to Supabase Dashboard** → **SQL Editor**
2. **Run the pg_cron SQL** from `SUPABASE_SYNC_SETUP.md` (Step 4)
3. **Replace** `YOUR_PROJECT_REF` and `YOUR_ANON_KEY` in the SQL

---

## ✅ Step 8: Configure Shopify Webhooks

1. **Go to Shopify Admin** → **Settings** → **Notifications** → **Webhooks**
2. **Create webhook:**
   - **Event:** Order creation
   - **URL:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/shopify-webhook`
   - **Format:** JSON
3. **Repeat for:** Order paid, Order cancelled, Order fulfilled, Order updated

---

## ✅ Step 9: Link to Your Orders Table

Run the SQL from `SUPABASE_SYNC_SETUP.md` (Step 7) to create the trigger that syncs `shopify_orders` to your `orders` table.

---

## 🧪 Testing

### Test Webhook:
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/shopify-webhook \
  -H "Content-Type: application/json" \
  -H "x-shopify-topic: orders/create" \
  -d '{"id": 123, "name": "#1001", ...}'
```

### Test Sync:
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/shopify-sync \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Check Sync State:
```sql
SELECT * FROM shopify_sync_state;
```

---

## 📝 Quick Command Reference

```bash
# Link project
npx supabase@latest link --project-ref YOUR_PROJECT_REF

# Create functions
npx supabase@latest functions new shopify-webhook
npx supabase@latest functions new shopify-sync

# Deploy functions
npx supabase@latest functions deploy shopify-webhook
npx supabase@latest functions deploy shopify-sync

# View function logs
npx supabase@latest functions logs shopify-webhook
npx supabase@latest functions logs shopify-sync
```

---

## 🎯 Start Here

**First, link your project:**

```bash
npx supabase@latest link --project-ref YOUR_PROJECT_REF
```

Then follow the steps above! 🚀

