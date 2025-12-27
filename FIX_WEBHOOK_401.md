# 🔧 Fix 401 Error for Webhook Function

## ❌ Problem

Getting `{"code":401,"message":"Missing authorization header"}` when calling the webhook function.

## ✅ Solution

### For Shopify Webhooks (No Auth Needed)

Shopify webhooks don't need authentication. Update the webhook function to allow unauthenticated calls:

**Option 1: Allow Unauthenticated (Recommended for Webhooks)**

The webhook function should allow calls without auth since Shopify will call it directly.

### For Manual Testing

When testing manually, include the authorization header:

```bash
curl -X POST https://bdquuixqypkmbvvfymvm.supabase.co/functions/v1/shopify-webhook \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "x-shopify-topic: orders/create" \
  -d '{"id": 123, "name": "#1001", ...}'
```

---

## 🔧 Update Webhook Function

The webhook function should work without auth for Shopify calls, but we can add optional auth for manual testing.

---

## 🎯 Quick Fix

**For Shopify webhooks:** They should work without auth (Shopify doesn't send auth headers)

**For manual testing:** Use the curl command above with your anon key

The 401 error is likely from manual testing. Shopify webhooks should work fine without auth.

