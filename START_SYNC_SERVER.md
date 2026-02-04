# 🚀 Start Sync Server Before Running Force Resync

## The Problem

The `FORCE_RESYNC_ALL_ORDERS.js` script needs the sync server to be running because it calls the sync API endpoint.

## Solution: Start the Sync Server First

### Step 1: Start the Sync Server

Open a **new terminal window** and run:

```bash
npm run shopify-sync
```

Or:

```bash
node server/shopify-sync.js
```

You should see output like:
```
🚀 Shopify Sync Server starting...
📡 Server running on port 3002
🔄 Starting Shopify order sync...
```

### Step 2: Keep It Running

**Leave this terminal window open** - the sync server needs to keep running.

### Step 3: Run Force Resync

In a **different terminal window**, run:

```bash
node FORCE_RESYNC_ALL_ORDERS.js
```

## Alternative: Run Sync Server in Background (Windows)

If you want to run the sync server in the background:

```powershell
# Start in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run shopify-sync"
```

## Alternative: Use PM2 (Recommended for Production)

If you have PM2 installed:

```bash
# Install PM2 globally (if not installed)
npm install -g pm2

# Start sync server with PM2
pm2 start server/shopify-sync.js --name shopify-sync

# Check status
pm2 status

# View logs
pm2 logs shopify-sync
```

## Quick Test

To verify the sync server is running:

```bash
curl http://localhost:3002/api/shopify/health
```

Or open in browser: http://localhost:3002/api/shopify/health

You should see a response indicating the server is running.

## Troubleshooting

### Port 3002 Already in Use

If you get an error that port 3002 is already in use:

1. Find what's using the port:
   ```powershell
   netstat -ano | findstr :3002
   ```

2. Kill the process (replace PID with the number from above):
   ```powershell
   taskkill /PID <PID> /F
   ```

3. Or change the port in `.env`:
   ```env
   PORT=3003
   ```

### Server Keeps Crashing

Check the error messages in the terminal. Common issues:
- Missing environment variables (run `node setup-env.js` to check)
- Database connection issues
- Shopify API authentication problems

## Next Steps

Once the sync server is running:
1. ✅ Run `node FORCE_RESYNC_ALL_ORDERS.js` in another terminal
2. ✅ Wait for it to complete
3. ✅ Check your orders in the admin panel to see new/removed items

