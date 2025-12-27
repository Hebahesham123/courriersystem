# ⚡ Quick Shopify Auto-Sync Setup

## 🎯 What This Does

Automatically imports orders from Shopify into your system **every 5 minutes** - no manual uploads needed!

## 📋 Quick Setup (5 Steps)

### 1. Get Shopify API Token

1. Go to: **Shopify Admin** → **Settings** → **Apps and sales channels**
2. Click: **"Develop apps"** → **"Create an app"**
3. Name it: "Courier Pro Sync"
4. Go to: **"API scopes"** → Enable: `read_orders`, `read_customers`
5. Click: **"Install app"** → **Copy the Admin API access token**

### 2. Add to .env File

Add these lines to your `.env` file:

```env
# Shopify Auto-Sync
SHOPIFY_STORE_URL=your-store-name.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_admin_api_token_here
SHOPIFY_API_VERSION=2024-01
SHOPIFY_SYNC_PORT=3002
```

**Important**: 
- Replace `your-store-name.myshopify.com` with your actual store URL (no https://)
- Replace `your_admin_api_token_here` with the token from step 1

### 3. Install Dependencies

```bash
npm install
```

This will install `node-cron` (already added to package.json)

### 4. Start the Sync Server

```bash
npm run shopify-sync
```

Or:
```bash
node server/shopify-sync.js
```

### 5. Verify It's Working

1. **Check health**: http://localhost:3002/api/shopify/health
2. **Trigger manual sync**: http://localhost:3002/api/shopify/sync
3. **Check your orders**: Go to admin panel → Orders

## ✅ That's It!

The sync will now run **automatically every 5 minutes**. You'll see logs like:

```
🔄 Starting Shopify order sync...
📦 Found 15 orders in Shopify
✅ Sync complete: 10 imported, 5 updated
```

## 🔄 Keep It Running

**For Development:**
- Just keep the terminal open with `npm run shopify-sync` running

**For Production:**
- Use **PM2**:
  ```bash
  npm install -g pm2
  pm2 start server/shopify-sync.js --name shopify-sync
  pm2 save
  ```

## 🆘 Troubleshooting

**"Missing Shopify environment variables"**
- Check `.env` file has all Shopify variables
- Restart sync server after updating `.env`

**"Shopify API error: 401"**
- Your access token is wrong - regenerate it in Shopify

**"No orders imported"**
- Check if you have orders in Shopify
- Check server logs for errors
- Manually trigger: http://localhost:3002/api/shopify/sync

## 📚 Full Documentation

See `SHOPIFY_AUTO_SYNC_SETUP.md` for detailed instructions.

---

**Your orders will sync automatically every 5 minutes! 🎉**

