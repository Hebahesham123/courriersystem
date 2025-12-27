# 🔧 Fix PM2 Permission Error (EPERM)

## Problem

You're getting `Error: connect EPERM //./pipe/rpc.sock` because:
- PM2 Windows Service is running under SYSTEM account
- Your user account can't access the PM2 socket
- Two PM2 instances are conflicting

## ✅ Solution Options

### Option 1: Stop PM2 Service and Run Normally (Recommended for Development)

If you're developing/testing, it's easier to run PM2 normally (not as a service):

1. **Stop PM2 Windows Service:**
   - Press `Win + R`
   - Type: `services.msc`
   - Press Enter
   - Find "PM2" service
   - Right-click → Stop
   - Right-click → Properties → Set Startup type to "Manual" (optional)

2. **Kill any existing PM2 processes:**
   ```bash
   pm2 kill
   ```

3. **Start PM2 normally:**
   ```bash
   pm2 start server/shopify-sync.js --name shopify-sync
   pm2 save
   ```

4. **Now PM2 commands will work:**
   ```bash
   pm2 status
   pm2 logs shopify-sync
   ```

### Option 2: Keep Service but Use Service Commands

If you want to keep the Windows Service:

1. **Don't use `pm2` commands directly** - they won't work
2. **Use Windows Service Manager** to start/stop
3. **Or access PM2 through the service account** (complex)

### Option 3: Uninstall PM2 Service (If Not Needed)

If you don't need auto-start on boot:

```bash
pm2-service-uninstall
```

Then run PM2 normally.

## 🎯 Recommended: Option 1 (Run PM2 Normally)

For development/testing, this is the easiest approach:

```bash
# 1. Stop PM2 service (via Services.msc or):
net stop pm2

# 2. Kill any PM2 processes
pm2 kill

# 3. Start PM2 fresh
pm2 start server/shopify-sync.js --name shopify-sync

# 4. Save it
pm2 save

# 5. Verify
pm2 status
pm2 logs shopify-sync
```

## 🔄 For Production Deployment

If you're deploying to a production server:

1. **Use PM2 Windows Service** (already installed)
2. **Don't run `pm2` commands manually** - the service handles it
3. **Monitor via:**
   - Windows Services Manager
   - Health endpoint: `http://localhost:3002/api/shopify/health`
   - Logs: Check Windows Event Viewer or service logs

## 📝 Quick Fix Commands

Run these in order:

```bash
# Kill PM2 daemon
pm2 kill

# Wait a moment, then start fresh
pm2 start server/shopify-sync.js --name shopify-sync

# Save
pm2 save

# Check status
pm2 status
```

If you still get errors, stop the PM2 Windows Service first (via Services.msc).

