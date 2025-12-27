# 🔧 Configure Webhook Function for Shopify (No Auth Required)

## ❌ Problem

Getting `{"code":401,"message":"Missing authorization header"}` when Shopify tries to call the webhook.

## ✅ Solution

Shopify webhooks don't send authentication headers, so we need to configure the function to allow unauthenticated calls.

### Option 1: Configure Function in Dashboard (Recommended)

1. **Go to Supabase Dashboard**
2. **Edge Functions** → **shopify-webhook**
3. **Go to "Details" or "Settings" tab**
4. **Look for "Authentication" or "Public Access" option**
5. **Enable "Allow unauthenticated calls"** or **"Public"**

### Option 2: Use Service Role Key (If Option 1 Not Available)

If the dashboard doesn't have this option, the function should work as-is since it uses `SUPABASE_SERVICE_ROLE_KEY` internally (which bypasses RLS).

The 401 might be from Supabase's platform-level check. Let's verify:

### Step 1: Test Webhook with Auth (Manual Test)

```bash
curl -X POST https://bdquuixqypkmbvvfymvm.supabase.co/functions/v1/shopify-webhook \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "x-shopify-topic: orders/create" \
  -d '{"id": 123, "name": "#1001"}'
```

### Step 2: Check Function Configuration

In Supabase Dashboard → Edge Functions → shopify-webhook:
- Check if there's a "Public" or "Unauthenticated" toggle
- Some Supabase projects allow configuring this per function

### Step 3: Alternative - Use Different Endpoint

If Supabase requires auth, you might need to:
1. Create a public endpoint that Shopify can call
2. Or use Supabase's webhook authentication feature

---

## 🎯 For Now

**The sync function is working!** The 401 error is likely from:
- Manual testing without auth header
- Or Shopify webhook configuration

**For Shopify webhooks:** They should work if the function is configured as public/unauthenticated in the Dashboard.

**For manual testing:** Always include the auth header.

---

## 📝 Next Steps

1. **Check Dashboard** → Edge Functions → shopify-webhook → Settings
2. **Look for "Public" or "Unauthenticated" option**
3. **Enable it** if available
4. **Test webhook** from Shopify

The sync function is working perfectly! The webhook just needs to be configured for public access. 🎉

