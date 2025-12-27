# ✅ Function Deployed - Test It Now!

## 🎉 Deployment Successful!

Your function has been deployed. Now let's verify it's working.

## 🧪 Step 1: Test Manually (Immediate)

Run this command to test right away:

```bash
curl -X POST https://bdquuixqypkmbvvfymvm.supabase.co/functions/v1/shopify-sync \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

**Replace `YOUR_ANON_KEY`** with your actual anon key from:
- Supabase Dashboard → Settings → API → anon/public key

**Expected response:**
```json
{
  "success": true,
  "imported": 10,
  "updated": 5,
  "total": 15
}
```

## 📊 Step 2: Check Logs

1. **Go to:** https://supabase.com/dashboard/project/bdquuixqypkmbvvfymvm/functions
2. **Click on:** `shopify-sync`
3. **Go to:** "Logs" tab
4. **Look for:**
   ```
   Shopify config: { storeUrl: 'beauty-bar-eg.myshopify.com', ... }
   Fetching orders from: https://beauty-bar-eg.myshopify.com/admin/api/2024-10/orders.json...
   Syncing X orders from Shopify
   ```

**If you see errors:**
- Check the error message
- Verify secrets are set in Dashboard → Edge Functions → Secrets

## ✅ Step 3: Check Sync State

Run this SQL in Supabase Dashboard → SQL Editor:

```sql
SELECT * FROM shopify_sync_state;
```

**Should show:**
- `last_sync_status` = `'success'`
- `last_synced_at` = recent timestamp
- `last_sync_error` = `null`

## 📦 Step 4: Check for Synced Orders

```sql
SELECT 
  order_id,
  customer_name,
  total_price,
  status,
  created_at
FROM shopify_orders
ORDER BY created_at DESC
LIMIT 10;
```

You should see orders from Shopify!

## ⏰ Step 5: Wait for Automatic Sync

The cron job runs **every 5 minutes**. Wait 5 minutes, then check:
- Logs (should show new sync activity)
- `shopify_sync_state` table (should show recent `last_synced_at`)

## 🎯 Summary

✅ **Function deployed**  
✅ **Code fixed** (now reads environment variables correctly)  
⏳ **Next:** Test manually or wait for cron job  
📊 **Verify:** Check logs and sync state  

## 🆘 If Still Not Working

1. **Check secrets are set:**
   - Dashboard → Edge Functions → Secrets
   - Should have: `SHOPIFY_STORE_URL`, `SHOPIFY_ACCESS_TOKEN`, `SHOPIFY_API_VERSION`

2. **Check logs for errors:**
   - Look for specific error messages
   - Verify the store URL is correct

3. **Test with curl:**
   - Use the command above
   - Check the response

The function should now work! 🎉

