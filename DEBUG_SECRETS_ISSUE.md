# 🔍 Debug: Secrets Not Being Read

## ❌ Current Error

The function is still trying to use `https://admin/api/...` which means `SHOPIFY_STORE_URL` is empty or not being read.

## 🔍 Debug Steps

### Step 1: Check Function Code

The function should have:
```typescript
const shopifyStoreUrl = Deno.env.get('SHOPIFY_STORE_URL') ?? ''
```

**NOT:**
```typescript
const shopifyStoreUrl = Deno.env.get('SHOPIFY_STORE_URL') ?? ''
```

### Step 2: Verify Secrets in Dashboard

1. **Go to:** Supabase Dashboard
2. **Project Settings** → **Edge Functions** → **Secrets**
3. **Verify you see:**
   - `SHOPIFY_STORE_URL` = `your-store.myshopify.com`
   - `SHOPIFY_ACCESS_TOKEN` = `shpat_...`
   - `SHOPIFY_API_VERSION` = `2024-10`

### Step 3: Check Function Logs for Debug Output

After the next run, check logs for:
```
Environment variables status: { ... }
Shopify config: { storeUrl: '...', ... }
```

If `storeUrl` is empty or shows `'admin'`, the secret is not being read.

### Step 4: Redeploy Function

After verifying secrets are set:

```bash
npx supabase@latest functions deploy shopify-sync
```

### Step 5: Test Immediately

After redeploying, manually trigger:

```bash
curl -X POST https://bdquuixqypkmbvvfymvm.supabase.co/functions/v1/shopify-sync \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

Then check logs immediately.

---

## 🆘 Alternative: Hardcode for Testing

If secrets still don't work, you can temporarily hardcode in the function to verify the rest works:

```typescript
const shopifyStoreUrl = Deno.env.get('SHOPIFY_STORE_URL') || 'your-store.myshopify.com'
const shopifyAccessToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN') || 'shpat_YOUR_ACCESS_TOKEN_HERE'
```

**But this is NOT recommended for production!** Use secrets.

---

## 📝 Most Likely Issue

The secrets are either:
1. **Not set** in Dashboard
2. **Set with wrong names** (case-sensitive!)
3. **Function not redeployed** after adding secrets

**Action:** Verify secrets are set correctly, then redeploy.

