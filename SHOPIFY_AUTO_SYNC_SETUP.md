# 🛒 Shopify Auto-Sync Setup Guide

## Overview

This system automatically imports orders from your Shopify store into your database **every 5 minutes**. No manual uploads needed!

## 🎯 Two Options

### Option 1: Direct Integration (Recommended) ✅
- **Pros**: More reliable, no external dependencies, full control
- **Cons**: Requires Shopify API credentials
- **Best for**: Production use, when you want full control

### Option 2: n8n Automation
- **Pros**: Visual workflow builder, easier setup
- **Cons**: Requires n8n server, external dependency
- **Best for**: Quick setup, if you already use n8n

---

## 🚀 Option 1: Direct Integration (Recommended)

### Step 1: Get Shopify API Credentials

1. **Go to Shopify Admin**: https://admin.shopify.com
2. **Go to Settings** → **Apps and sales channels**
3. **Click "Develop apps"** (or "Manage private apps" in older versions)
4. **Create a new app**:
   - Click "Create an app"
   - Name it: "Courier Pro Sync"
   - Click "Create app"
5. **Configure API scopes**:
   - Go to "API scopes"
   - Enable: `read_orders`, `read_customers`
   - Click "Save"
6. **Install the app**:
   - Click "Install app"
   - **Copy the Admin API access token** (you'll need this!)
7. **Get your store URL**:
   - Your store URL is: `your-store-name.myshopify.com`
   - (You can see this in your Shopify admin URL)

### Step 2: Update .env File

Add these to your `.env` file:

```env
# Shopify Configuration
SHOPIFY_STORE_URL=your-store-name.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_admin_api_access_token_here
SHOPIFY_API_VERSION=2024-01

# Shopify Sync Server Port (optional, defaults to 3002)
SHOPIFY_SYNC_PORT=3002
```

**Important**: 
- Don't include `https://` in `SHOPIFY_STORE_URL`
- Just use: `your-store-name.myshopify.com`
- The access token is the "Admin API access token" from step 1

### Step 3: Install Dependencies

```bash
npm install node-cron
```

### Step 4: Start the Sync Server

**Option A: Run separately (Recommended for production)**

```bash
node server/shopify-sync.js
```

**Option B: Add to package.json scripts**

Add this to your `package.json`:

```json
{
  "scripts": {
    "shopify-sync": "node server/shopify-sync.js",
    "dev:all": "concurrently \"npm run dev\" \"npm run server\" \"npm run shopify-sync\""
  }
}
```

Then run:
```bash
npm run shopify-sync
```

### Step 5: Verify It's Working

1. **Check health endpoint**: http://localhost:3002/api/shopify/health
   - Should show: `{"status":"OK","shopify_configured":true,...}`

2. **Trigger manual sync**: http://localhost:3002/api/shopify/sync
   - Should import orders immediately

3. **Check your database**: Go to your admin panel → Orders
   - You should see Shopify orders appearing

4. **Check server logs**: You should see:
   ```
   ✅ Sync complete: X imported, Y updated
   ```

### Step 6: Keep It Running

**For Development:**
- Just run `node server/shopify-sync.js` in a terminal
- Keep it running while developing

**For Production:**
- Use **PM2** (recommended):
  ```bash
  npm install -g pm2
  pm2 start server/shopify-sync.js --name shopify-sync
  pm2 save
  pm2 startup  # Follow instructions to auto-start on boot
  ```

- Or use **Windows Task Scheduler** (Windows):
  - Create a task to run `node server/shopify-sync.js` on startup

- Or use **systemd** (Linux):
  - Create a service file to run the script as a service

---

## 🔄 Option 2: n8n Automation

If you prefer using n8n:

### Step 1: Install n8n

```bash
npm install -g n8n
n8n start
```

### Step 2: Create Workflow

1. Open n8n: http://localhost:5678
2. Create new workflow
3. Add nodes:
   - **Shopify Trigger** (or **Schedule Trigger** set to every 5 minutes)
   - **Shopify Node** (to fetch orders)
   - **HTTP Request Node** (to POST to your server API)
4. Configure:
   - Shopify credentials
   - API endpoint: `http://localhost:3001/api/shopify/import`
   - Schedule: Every 5 minutes

### Step 3: Activate Workflow

- Click "Active" toggle in n8n
- Workflow will run automatically

---

## 📊 How It Works

1. **Every 5 minutes**, the script:
   - Fetches new/updated orders from Shopify API
   - Checks if orders already exist in your database
   - Inserts new orders
   - Updates existing orders with latest data

2. **Order Mapping**:
   - Shopify Order Name → `order_id`
   - Customer Name → `customer_name`
   - Shipping Address → `address`
   - Phone → `mobile_number`
   - Total Price → `total_order_fees`
   - Payment Gateway → `payment_method` (normalized)
   - Financial Status → `payment_status`

3. **Payment Detection**:
   - Paymob/Visa/Credit → `paymob` (paid)
   - ValU → `valu` (paid)
   - Other online payments → `paid` (paid)
   - COD → `cash` (cod)
   - Pending → `cash` (pending)

---

## 🧪 Testing

### Test Manual Sync

```bash
curl http://localhost:3002/api/shopify/sync
```

### Test Health Check

```bash
curl http://localhost:3002/api/shopify/health
```

### Check Logs

Watch the server console for:
- `🔄 Starting Shopify order sync...`
- `📦 Found X orders in Shopify`
- `✅ Sync complete: X imported, Y updated`

---

## 🐛 Troubleshooting

### "Missing Shopify environment variables"
- Check `.env` file has `SHOPIFY_STORE_URL` and `SHOPIFY_ACCESS_TOKEN`
- Restart the sync server after updating `.env`

### "Shopify API error: 401"
- Your access token is invalid or expired
- Regenerate it in Shopify Admin → Apps

### "Shopify API error: 403"
- Your app doesn't have the right permissions
- Check API scopes: `read_orders`, `read_customers`

### "No orders imported"
- Check if orders exist in Shopify
- Check server logs for errors
- Verify API credentials are correct

### Orders not updating
- Check if sync is running (look for logs every 5 minutes)
- Manually trigger sync: http://localhost:3002/api/shopify/sync
- Check database for existing orders with same `order_id`

---

## 🔒 Security Notes

- **Never commit** `.env` file to git (already in `.gitignore`)
- **Keep your Shopify access token secret**
- **Use environment variables** in production
- **Restrict API scopes** to minimum needed (read_orders, read_customers)

---

## 📝 Next Steps

1. ✅ Set up Shopify API credentials
2. ✅ Add to `.env` file
3. ✅ Install dependencies: `npm install node-cron`
4. ✅ Start sync server: `node server/shopify-sync.js`
5. ✅ Verify orders are importing
6. ✅ Set up auto-start (PM2 or similar)

---

**Your orders will now automatically sync every 5 minutes! 🎉**

