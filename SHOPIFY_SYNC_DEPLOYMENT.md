# 🚀 Shopify Sync Deployment Guide

## 📋 Overview

When deploying your system, the Shopify sync server needs to run as a **separate background process** to automatically import orders from Shopify every 5 minutes.

## ✅ Pre-Deployment Checklist

### 1. Environment Variables Required

Make sure your production `.env` file (or environment variables) includes:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Shopify Configuration
SHOPIFY_STORE_URL=your-store-name.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_admin_api_access_token
SHOPIFY_API_VERSION=2024-10
SHOPIFY_SYNC_PORT=3002
```

**Important Notes:**
- `SHOPIFY_STORE_URL` should be just the store name (e.g., `beauty-bareg.myshopify.com`) - **NO** `https://`
- `SHOPIFY_ACCESS_TOKEN` is the Admin API access token from Shopify (starts with `shpat_`)
- `SUPABASE_SERVICE_ROLE_KEY` is required (not the anon key) - get it from Supabase Dashboard → Settings → API

### 2. Get Shopify API Credentials

1. Go to **Shopify Admin** → **Settings** → **Apps and sales channels**
2. Click **"Develop apps"** → **"Create an app"**
3. Name it: **"Courier Pro Sync"**
4. Go to **"API scopes"** → Enable:
   - ✅ `read_orders`
   - ✅ `read_customers`
5. Click **"Install app"**
6. **Copy the Admin API access token** (you can only see it once!)

### 3. Verify Dependencies

The sync server requires these packages (already in `package.json`):
- `express`
- `@supabase/supabase-js`
- `node-cron`
- `node-fetch`
- `dotenv`

Install them:
```bash
npm install
```

## 🚀 Deployment Options

### Option 1: PM2 (Recommended for Production)

PM2 is a process manager that keeps your sync server running and automatically restarts it if it crashes.

#### Installation:
```bash
npm install -g pm2
```

#### Start Sync Server:
```bash
pm2 start server/shopify-sync.js --name shopify-sync
```

#### Save PM2 Configuration:
```bash
pm2 save
pm2 startup  # This will show you a command to run as root/sudo to auto-start on server reboot
```

#### Useful PM2 Commands:
```bash
pm2 list                    # View all running processes
pm2 logs shopify-sync        # View sync server logs
pm2 restart shopify-sync    # Restart the sync server
pm2 stop shopify-sync       # Stop the sync server
pm2 delete shopify-sync     # Remove from PM2
```

### Option 2: Systemd Service (Linux)

Create a systemd service file for automatic startup:

```bash
sudo nano /etc/systemd/system/shopify-sync.service
```

Add this content:
```ini
[Unit]
Description=Shopify Sync Server
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/your/project
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /path/to/your/project/server/shopify-sync.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable shopify-sync
sudo systemctl start shopify-sync
sudo systemctl status shopify-sync  # Check if it's running
```

### Option 3: Docker (If Using Docker)

Create a `Dockerfile.sync`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY server/shopify-sync.js ./server/
CMD ["node", "server/shopify-sync.js"]
```

Build and run:
```bash
docker build -f Dockerfile.sync -t shopify-sync .
docker run -d --name shopify-sync --env-file .env --restart unless-stopped shopify-sync
```

### Option 4: Background Process (Simple but Not Recommended)

For quick testing only:
```bash
nohup node server/shopify-sync.js > shopify-sync.log 2>&1 &
```

## 🧪 Testing After Deployment

### 1. Check Health Endpoint

Visit: `http://your-server:3002/api/shopify/health`

Should return:
```json
{
  "status": "OK",
  "shopify_configured": true,
  "store_url": "your-store.myshopify.com",
  "supabase_configured": true,
  "issues": []
}
```

### 2. Test Manual Sync

Visit: `http://your-server:3002/api/shopify/sync`

Should return:
```json
{
  "success": true,
  "imported": 10,
  "updated": 5
}
```

### 3. Check Logs

```bash
# If using PM2
pm2 logs shopify-sync

# If using systemd
sudo journalctl -u shopify-sync -f

# If using nohup
tail -f shopify-sync.log
```

Look for:
```
🔄 Starting Shopify order sync...
📦 Found 15 orders in Shopify
✅ Sync complete: 10 imported, 5 updated
```

### 4. Verify Orders in Database

1. Login to your admin dashboard
2. Go to **Orders** section
3. Check if new orders from Shopify appear
4. Wait 5 minutes and check again (auto-sync should run)

## 🔒 Security Considerations

### 1. Environment Variables

**Never commit `.env` file to Git!**

- Use environment variables in your hosting platform
- For PM2: Use `pm2 ecosystem.config.js` with environment variables
- For Docker: Use `--env-file` or environment variables
- For systemd: Add `Environment=` lines in service file

### 2. Firewall

The sync server runs on port 3002. You may want to:
- Block external access to port 3002 (only allow localhost)
- Or use a reverse proxy (nginx) with authentication
- Or only expose the health endpoint

### 3. API Token Security

- Store `SHOPIFY_ACCESS_TOKEN` securely
- Never log or expose the token
- Regenerate token if compromised

## 🔧 Troubleshooting

### Issue: "Missing Shopify environment variables"

**Solution:**
- Check `.env` file exists and has all required variables
- Restart the sync server after updating `.env`
- For PM2: `pm2 restart shopify-sync`
- Verify with: `pm2 env shopify-sync`

### Issue: "Shopify API error: 401 Unauthorized"

**Solution:**
- Regenerate the Admin API access token in Shopify
- Update `SHOPIFY_ACCESS_TOKEN` in `.env`
- Restart sync server

### Issue: "Shopify API error: 404 Not Found"

**Solution:**
- Verify `SHOPIFY_STORE_URL` is correct (no `https://`, no trailing slash)
- Check store URL in Shopify Admin → Settings → General
- Try different `SHOPIFY_API_VERSION` (2024-10, 2024-07, 2024-04)

### Issue: "Sync server not running"

**Solution:**
- Check if process is running: `pm2 list` or `ps aux | grep shopify-sync`
- Check logs for errors: `pm2 logs shopify-sync`
- Restart: `pm2 restart shopify-sync`

### Issue: "Orders not syncing"

**Solution:**
1. Check health endpoint: `http://your-server:3002/api/shopify/health`
2. Manually trigger sync: `http://your-server:3002/api/shopify/sync`
3. Check logs for errors
4. Verify Supabase connection and permissions
5. Check if orders exist in Shopify

### Issue: "Port 3002 already in use"

**Solution:**
- Change `SHOPIFY_SYNC_PORT` in `.env` to a different port (e.g., 3003)
- Or stop the process using port 3002: `lsof -ti:3002 | xargs kill`

## 📊 Monitoring

### Check Sync Status

```bash
# View real-time logs
pm2 logs shopify-sync --lines 50

# Check if process is running
pm2 status shopify-sync

# View resource usage
pm2 monit
```

### Set Up Alerts (Optional)

You can set up monitoring to alert you if:
- Sync server stops running
- Sync fails repeatedly
- No orders synced in X hours

## 🔄 Updating the Sync Server

When you update the code:

1. **Stop the sync server:**
   ```bash
   pm2 stop shopify-sync
   ```

2. **Update the code:**
   ```bash
   git pull  # or deploy new code
   npm install  # if dependencies changed
   ```

3. **Restart the sync server:**
   ```bash
   pm2 restart shopify-sync
   ```

4. **Verify it's working:**
   ```bash
   pm2 logs shopify-sync
   ```

## 📝 Summary

**For Production Deployment:**

1. ✅ Set all environment variables in `.env` or hosting platform
2. ✅ Install PM2: `npm install -g pm2`
3. ✅ Start sync server: `pm2 start server/shopify-sync.js --name shopify-sync`
4. ✅ Save PM2 config: `pm2 save && pm2 startup`
5. ✅ Test health endpoint: `http://your-server:3002/api/shopify/health`
6. ✅ Test manual sync: `http://your-server:3002/api/shopify/sync`
7. ✅ Monitor logs: `pm2 logs shopify-sync`

**The sync will now run automatically every 5 minutes! 🎉**

