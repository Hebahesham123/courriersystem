# 🔧 Shopify 404 Error Troubleshooting

## Error: "Shopify API error: 404 Not Found"

This error means the API endpoint couldn't be found. Here's how to fix it:

## 🔍 Step 1: Test Your Connection

I've added a test endpoint. **Restart your sync server** and visit:

```
http://localhost:3002/api/shopify/test
```

This will show you:
- ✅ If your credentials are correct
- ✅ What URL is being used
- ✅ Any specific error messages

## 🛠️ Common Fixes

### Fix 1: Verify Store URL

Your store URL should be in format: `store-name.myshopify.com`

**Check your .env file:**
```env
SHOPIFY_STORE_URL=beauty-bareg.myshopify.com
```

**To find your actual store URL:**
1. Go to Shopify Admin
2. Look at the URL in your browser
3. It should be: `https://admin.shopify.com/store/STORE-NAME`
4. Or check Settings → General → Store details

### Fix 2: Try Different API Version

The API version might not be supported. Try updating your `.env`:

```env
SHOPIFY_API_VERSION=2023-10
```

Or try:
```env
SHOPIFY_API_VERSION=2023-07
```

### Fix 3: Verify Access Token

1. Go to Shopify Admin → Settings → Apps and sales channels
2. Click on your app (Courier Pro Sync)
3. Go to "API credentials"
4. **Regenerate** the Admin API access token
5. Update your `.env` file with the new token
6. Restart the sync server

### Fix 4: Check API Scopes

Make sure your app has these scopes enabled:
- ✅ `read_orders`
- ✅ `read_customers`

1. Go to Shopify Admin → Settings → Apps and sales channels
2. Click on your app
3. Go to "API scopes"
4. Enable the scopes above
5. Click "Save"
6. Reinstall the app if needed

### Fix 5: Verify Store is Active

Make sure your Shopify store is:
- ✅ Active (not paused)
- ✅ Has a valid subscription
- ✅ Not in development mode (unless using development store)

## 🧪 Testing Steps

1. **Test connection:**
   ```
   http://localhost:3002/api/shopify/test
   ```

2. **Check health:**
   ```
   http://localhost:3002/api/shopify/health
   ```

3. **Try manual sync:**
   ```
   http://localhost:3002/api/shopify/sync
   ```

## 📝 What to Check

After running the test endpoint, check:

1. **If you see "Shopify connection successful!"**
   - ✅ Your credentials are correct
   - The issue might be with the orders endpoint specifically

2. **If you see "API Error: 401"**
   - ❌ Your access token is invalid
   - Regenerate it in Shopify Admin

3. **If you see "API Error: 403"**
   - ❌ Your app doesn't have the right permissions
   - Check API scopes

4. **If you see "API Error: 404"**
   - ❌ Store URL might be wrong
   - ❌ API version might not be supported
   - Try the fixes above

## 🔄 After Making Changes

1. **Update .env file** with correct values
2. **Restart the sync server:**
   - Stop it (Ctrl+C)
   - Start again: `npm run shopify-sync`
3. **Test again** using the test endpoint

## 💡 Still Not Working?

Share the response from:
```
http://localhost:3002/api/shopify/test
```

This will help identify the exact issue!

