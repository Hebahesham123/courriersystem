# ✅ Update New Shopify Credentials

## You've Created a New App - Now Update the Credentials

### Step 1: Get Your New Credentials from Shopify

From your new Shopify app, you need:

1. **Store URL**: `your-store-name.myshopify.com`
   - Found in: Shopify Admin URL or Settings → General
   - Format: Just the store name, NO `https://` and NO trailing slash
   - Example: `beauty-bar-eg.myshopify.com`

2. **Admin API Access Token**: `shpat_xxxxx...`
   - Found in: Apps → Your New App → API credentials → Admin API access token
   - Click "Reveal token once" and copy it immediately
   - Should start with `shpat_` and be 70+ characters long

3. **API Version**: `2024-10` (or latest)
   - Usually `2024-10` is fine

---

## Step 2: Update Supabase Edge Function Secrets

### Go to Supabase Dashboard:

1. **Open**: https://supabase.com/dashboard/project/bdquuixqypkmbvvfymvm
2. **Click**: Project Settings (gear icon) → Edge Functions → Secrets
3. **Update these three secrets:**

   **Secret 1: `SHOPIFY_STORE_URL`**
   - Click "Edit" (or "Add new secret" if it doesn't exist)
   - Value: `your-store-name.myshopify.com` (your actual store name)
   - Example: `beauty-bar-eg.myshopify.com`
   - ✅ NO `https://`
   - ✅ NO trailing slash `/`
   - Click "Save"

   **Secret 2: `SHOPIFY_ACCESS_TOKEN`**
   - Click "Edit" (or "Add new secret" if it doesn't exist)
   - Value: `shpat_xxxxx...` (your NEW token from the new app)
   - Paste the entire token (it's long!)
   - Click "Save"

   **Secret 3: `SHOPIFY_API_VERSION`**
   - Click "Edit" (or "Add new secret" if it doesn't exist)
   - Value: `2024-10`
   - Click "Save"

---

## Step 3: Verify the Secrets Are Set

After updating, you should see all three secrets listed:
- ✅ `SHOPIFY_STORE_URL`
- ✅ `SHOPIFY_ACCESS_TOKEN`
- ✅ `SHOPIFY_API_VERSION`

---

## Step 4: Test the Sync

1. **Go to**: Supabase Dashboard → Edge Functions → `shopify-sync`
2. **Click**: "Invoke function" (or use the test button)
3. **Check the logs** - you should see:
   ```
   ✅ Shopify connection successful!
   ✅ Fetched orders successfully
   ```

If you see errors:
- **401 Unauthorized**: Token is wrong - double-check you copied it correctly
- **404 Not Found**: Store URL is wrong - check the format
- **Other errors**: Check the logs for specific error messages

---

## Step 5: Update Local .env (If You Have One)

If you're running the local sync server (`server/shopify-sync.js`), also update your local `.env` file:

```env
SHOPIFY_STORE_URL=your-store-name.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_your_new_token_here
SHOPIFY_API_VERSION=2024-10
```

**Important**: Make sure `.env` is in `.gitignore` (it already is ✅)

---

## Step 6: Reply to Shopify

After updating everything, reply to Shopify's email:

**Subject:** Re: Action required: Rotate your Shopify app's API credentials

**Message:**
```
Hello,

I have completed the following actions:

1. ✅ Created a new Shopify app with new API credentials
2. ✅ Updated all Supabase Edge Function secrets with new credentials
3. ✅ Verified the new credentials work (tested sync function)
4. ✅ Confirmed no credentials are exposed in code
5. ✅ Verified .env files are in .gitignore

The security vulnerability has been resolved. The old app credentials have been replaced.

Ticket ID: 65f73fcc-adc0-4a65-92e2-f4a98040af77

Thank you,
[Your Name]
```

---

## ✅ Checklist

- [ ] New Shopify app created
- [ ] New Admin API access token copied
- [ ] Store URL noted (format: `store-name.myshopify.com`)
- [ ] `SHOPIFY_STORE_URL` updated in Supabase Secrets
- [ ] `SHOPIFY_ACCESS_TOKEN` updated in Supabase Secrets
- [ ] `SHOPIFY_API_VERSION` set to `2024-10` in Supabase Secrets
- [ ] Sync function tested and working
- [ ] Local `.env` updated (if applicable)
- [ ] Reply sent to Shopify

---

## 🎉 You're Done!

Once you've updated the Supabase secrets and tested the sync, the security issue is resolved. The old exposed credentials are now invalid, and you're using new secure credentials.

