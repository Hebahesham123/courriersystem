# 🔧 Fix Sync URL Error

## ❌ Problem

Error: `error sending request for url (https://admin/api/2024-10/orders.json`

The URL is missing the store domain. It should be:
`https://your-store.myshopify.com/admin/api/2024-10/orders.json`

## ✅ Solution

The `SHOPIFY_STORE_URL` environment variable is either:
1. Not set
2. Set incorrectly (just "admin" instead of full store URL)
3. Missing from Edge Function secrets

### Step 1: Check Environment Variables

1. **Go to Supabase Dashboard**
2. **Project Settings** → **Edge Functions** → **Secrets**
3. **Verify you have:**
   ```
   SHOPIFY_STORE_URL=your-store-name.myshopify.com
   SHOPIFY_ACCESS_TOKEN=your_token_here
   SHOPIFY_API_VERSION=2024-10
   ```

### Step 2: Fix SHOPIFY_STORE_URL

**Important:** The store URL should be:
- ✅ **Correct:** `beauty-bar-eg.myshopify.com` (no https://, no trailing slash)
- ❌ **Wrong:** `admin`
- ❌ **Wrong:** `https://beauty-bar-eg.myshopify.com`
- ❌ **Wrong:** `beauty-bar-eg.myshopify.com/`

### Step 3: Update Secret

1. **In Supabase Dashboard** → **Edge Functions** → **Secrets**
2. **Find `SHOPIFY_STORE_URL`**
3. **Update it to:** `your-store-name.myshopify.com` (your actual store name)
4. **Save**

### Step 4: Redeploy Function (if needed)

After updating the secret, the function should automatically pick it up. But if it doesn't:

```bash
npx supabase@latest functions deploy shopify-sync
```

### Step 5: Test Again

Wait a few minutes for the next cron run, or manually trigger:

```bash
curl -X POST https://bdquuixqypkmbvvfymvm.supabase.co/functions/v1/shopify-sync \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Step 6: Check Sync State

```sql
SELECT * FROM shopify_sync_state;
```

Should show:
- `last_sync_status` = 'success'
- `last_sync_error` = null

---

## 🎯 Quick Fix Checklist

- [ ] Go to Supabase Dashboard → Edge Functions → Secrets
- [ ] Check `SHOPIFY_STORE_URL` exists
- [ ] Verify it's set to: `your-store-name.myshopify.com` (no https://, no trailing slash)
- [ ] Save the secret
- [ ] Wait for next cron run or manually trigger sync
- [ ] Check `shopify_sync_state` table for success

---

## 📝 Example

If your Shopify store is `beauty-bar-eg.myshopify.com`:

**Set:**
```
SHOPIFY_STORE_URL=beauty-bar-eg.myshopify.com
```

**NOT:**
```
SHOPIFY_STORE_URL=admin
SHOPIFY_STORE_URL=https://beauty-bar-eg.myshopify.com
SHOPIFY_STORE_URL=beauty-bar-eg.myshopify.com/
```

---

## 🆘 Still Not Working?

1. **Check function logs:**
   - Go to Supabase Dashboard → Edge Functions → shopify-sync → Logs
   - Look for error messages

2. **Verify all secrets are set:**
   - `SHOPIFY_STORE_URL`
   - `SHOPIFY_ACCESS_TOKEN`
   - `SHOPIFY_API_VERSION`

3. **Test with curl:**
   ```bash
   curl -X POST https://bdquuixqypkmbvvfymvm.supabase.co/functions/v1/shopify-sync \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "apikey: YOUR_ANON_KEY" \
     -H "Content-Type: application/json"
   ```

After fixing the `SHOPIFY_STORE_URL`, the sync should work! 🎉

