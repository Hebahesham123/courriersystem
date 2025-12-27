# 🔍 Verify Secrets Are Set Correctly

## ❌ Current Issue

The logs show: `error sending request for url (https://admin/api/2024-10/orders.json`

This means `SHOPIFY_STORE_URL` is either:
- Not set in Supabase Dashboard
- Set incorrectly
- Not being read by the function

## ✅ Step-by-Step Verification

### Step 1: Check Secrets in Dashboard

1. **Go to Supabase Dashboard**
2. **Project Settings** → **Edge Functions** → **Secrets**
3. **Verify you see these three secrets:**
   - `SHOPIFY_STORE_URL` = `your-store.myshopify.com`
   - `SHOPIFY_ACCESS_TOKEN` = `shpat_YOUR_ACCESS_TOKEN_HERE`
   - `SHOPIFY_API_VERSION` = `2024-10`

**If they're NOT there:**
- Click "Add new secret"
- Name: `SHOPIFY_STORE_URL`
- Value: `your-store.myshopify.com`
- Click "Save"
- Repeat for the other two

**If they ARE there but still not working:**
- Delete them
- Re-add them
- Redeploy the function

### Step 2: Redeploy Function After Adding Secrets

**Important:** After adding/updating secrets, you MUST redeploy:

```bash
npx supabase@latest functions deploy shopify-sync
```

### Step 3: Check Function Logs for Debug Info

After redeploying, check the logs again. You should now see:
```
Shopify config: { storeUrl: 'your-store.myshopify.com', apiVersion: '2024-10', hasToken: true }
Fetching orders from: https://your-store.myshopify.com/admin/api/2024-10/orders.json...
```

If you see `storeUrl: ''` or `storeUrl: 'admin'`, the secret is not being read.

### Step 4: Test Function Directly

Test the function to see the debug output:

```bash
curl -X POST https://bdquuixqypkmbvvfymvm.supabase.co/functions/v1/shopify-sync \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

Then check the logs immediately to see the debug output.

---

## 🔧 Alternative: Hardcode for Testing (Temporary)

If secrets still don't work, you can temporarily hardcode in the function to test:

```typescript
const shopifyStoreUrl = Deno.env.get('SHOPIFY_STORE_URL') || 'your-store.myshopify.com'
```

But this is NOT recommended for production - use secrets!

---

## 📝 Checklist

- [ ] Secrets are added in Supabase Dashboard → Edge Functions → Secrets
- [ ] All three secrets are present: `SHOPIFY_STORE_URL`, `SHOPIFY_ACCESS_TOKEN`, `SHOPIFY_API_VERSION`
- [ ] Function has been redeployed after adding secrets
- [ ] Logs show the correct store URL in debug output
- [ ] Manual test returns success

---

## 🆘 Still Not Working?

1. **Delete all three secrets**
2. **Re-add them one by one**
3. **Redeploy function:** `npx supabase@latest functions deploy shopify-sync`
4. **Check logs immediately after deployment**
5. **Test manually with curl**

If it still shows `admin` in the URL, there might be a caching issue. Try:
- Waiting 2-3 minutes
- Redeploying again
- Checking if there are multiple versions of the function

