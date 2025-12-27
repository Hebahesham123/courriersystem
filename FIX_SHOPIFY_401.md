# 🔧 Fix Shopify 401 Unauthorized Error

## Error: "Invalid API key or access token"

This means your access token is either:
- ❌ Wrong/expired
- ❌ Not copied correctly
- ❌ Missing required permissions

## ✅ Step-by-Step Fix

### Step 1: Verify Token in .env

Check your `.env` file has the token:

```env
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Important checks:**
- ✅ Token starts with `shpat_`
- ✅ Token is ~70+ characters long
- ✅ No extra spaces or quotes
- ✅ Copied completely (not cut off)

### Step 2: Check Health Endpoint

Visit: http://localhost:3002/api/shopify/health

This will show:
- Token prefix (first 10 characters)
- Token length
- If token format is valid

### Step 3: Create New App in Shopify

1. **Go to Shopify Admin**: https://admin.shopify.com/store/beauty-bar-eg
2. **Settings** → **Apps and sales channels**
3. **Click "Develop apps"**
4. **Click "Create an app"**
5. **Name**: "Courier Pro Sync"
6. **Click "Create app"**

### Step 4: Configure API Scopes

1. **Click "Configure Admin API scopes"**
2. **Enable these scopes:**
   - ✅ `read_orders`
   - ✅ `read_customers`
3. **Click "Save"**

### Step 5: Install App and Get Token

1. **Click "Install app"** (top right)
2. **Click "Reveal token once"** under "Admin API access token"
3. **Copy the ENTIRE token** (it's long!)
4. **IMPORTANT**: Copy it immediately - you can only see it once!

### Step 6: Update .env File

1. Open `.env` file
2. Find `SHOPIFY_ACCESS_TOKEN=`
3. Replace the value with your new token:
   ```env
   SHOPIFY_ACCESS_TOKEN=shpat_your_new_token_here
   ```
4. **Save the file**

### Step 7: Restart Server

```bash
# Stop server (Ctrl+C)
npm run shopify-sync
```

## 🧪 Verify It Works

1. **Check health**: http://localhost:3002/api/shopify/health
   - Should show `token_format_valid: true`
   - Should show token length ~70+

2. **Test connection**: http://localhost:3002/api/shopify/test
   - Should show "Shopify connection successful!"

3. **Check logs**: Should see:
   ```
   ✅ Success with API version 2024-10!
   📦 Found X orders in Shopify
   ```

## 🚨 Common Mistakes

1. **Token cut off**: Make sure you copied the ENTIRE token
2. **Extra spaces**: No spaces before/after the token
3. **Wrong token type**: Must be "Admin API access token" (not API key or secret)
4. **Missing scopes**: App must have `read_orders` permission
5. **Forgot to save**: Make sure `.env` file is saved after editing

## 💡 Quick Test

After updating `.env`, check the health endpoint shows:
- `access_token_length`: Should be 70+ characters
- `token_format_valid`: Should be `true`
- `issues`: Should be empty array `[]`

If you see issues listed, fix them and restart the server.

