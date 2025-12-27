# ⚠️ CRITICAL: Update Supabase Secrets Too!

## ✅ You Updated .env File - Good!

But the **Shopify sync function runs on Supabase**, not locally. It reads from **Supabase Edge Function Secrets**, NOT from your local `.env` file.

---

## 🚨 You MUST Update Supabase Secrets

### Step 1: Go to Supabase Dashboard

1. **Open**: https://supabase.com/dashboard/project/bdquuixqypkmbvvfymvm
2. **Click**: Project Settings (gear icon) → **Edge Functions** → **Secrets**

### Step 2: Update These 3 Secrets

**Secret 1: `SHOPIFY_STORE_URL`**
- Click "Edit" (or "Add new secret" if it doesn't exist)
- Value: `your-store-name.myshopify.com` (your actual store name)
- Example: `beauty-bar-eg.myshopify.com`
- ✅ NO `https://`
- ✅ NO trailing slash `/`
- Click "Save"

**Secret 2: `SHOPIFY_ACCESS_TOKEN`** ⚠️ **THIS IS CRITICAL!**
- Click "Edit" (or "Add new secret" if it doesn't exist)
- Value: `shpat_xxxxx...` (your NEW token - the same one you put in .env)
- Paste the entire token
- Click "Save"

**Secret 3: `SHOPIFY_API_VERSION`**
- Click "Edit" (or "Add new secret" if it doesn't exist)
- Value: `2024-10`
- Click "Save"

---

## ✅ After Updating Supabase Secrets

1. **Test the sync**:
   - Go to: Supabase Dashboard → Edge Functions → `shopify-sync`
   - Click: "Invoke function" or "Test"
   - Check logs - should see: `✅ Shopify connection successful!`

2. **Verify it works**:
   - Check logs for: `✅ Fetched orders successfully`
   - No 401 errors

---

## 📋 Summary

- ✅ `.env` file updated (for local use)
- ⚠️ **Supabase Secrets** - **MUST UPDATE THIS TOO!**
- ✅ Test sync function after updating

---

## 🎯 Why Both?

- **Local `.env`**: Used if you run `server/shopify-sync.js` locally
- **Supabase Secrets**: Used by the Edge Function that actually syncs orders (this is what runs automatically)

**The Edge Function is what syncs your orders, so Supabase Secrets are critical!**

