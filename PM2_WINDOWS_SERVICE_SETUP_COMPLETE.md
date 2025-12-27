# ✅ PM2 Windows Service - Setup Complete!

## 🎉 Installation Successful

Your PM2 Windows Service has been installed and started. This means:

✅ **PM2 will automatically start on Windows boot**  
✅ **Your saved processes (like shopify-sync) will auto-restore**  
✅ **No need to manually start PM2 after reboots**

## 📊 Verify Installation

### Check PM2 Status

Open a **new PowerShell/Command Prompt** window and run:

```bash
pm2 status
```

Or if that doesn't work:

```bash
C:\Users\g8\AppData\Roaming\npm\pm2.cmd status
```

You should see your `shopify-sync` process listed.

### Check Windows Service

1. Press `Win + R`
2. Type: `services.msc`
3. Press Enter
4. Look for **"PM2"** service
5. Status should be **"Running"**

### Test Sync Server

1. Open browser: `http://localhost:3002/api/shopify/health`
   - Should return JSON with status "OK"

2. Test manual sync: `http://localhost:3002/api/shopify/sync`
   - Should return sync results

## 🔄 How It Works Now

### Automatic Startup Flow:

1. **Windows boots** → PM2 service starts automatically
2. **PM2 service starts** → Restores saved processes from `C:\Users\g8\.pm2\dump.pm2`
3. **shopify-sync process restored** → Sync server starts automatically
4. **Sync runs** → Every 5 minutes automatically

### Manual Commands (if needed):

```bash
# View status
pm2 status

# View logs
pm2 logs shopify-sync

# Restart sync server
pm2 restart shopify-sync

# Stop sync server
pm2 stop shopify-sync

# Start sync server
pm2 start server/shopify-sync.js --name shopify-sync

# Save current process list
pm2 save
```

## 🧪 Test Auto-Start

To verify auto-start works:

1. **Save your current processes:**
   ```bash
   pm2 save
   ```

2. **Restart your computer**

3. **After reboot, check if sync server is running:**
   - Open: `http://localhost:3002/api/shopify/health`
   - Or run: `pm2 status`

## 🔧 Troubleshooting

### PM2 service not starting:

1. Open Services (`services.msc`)
2. Find "PM2" service
3. Right-click → Properties
4. Check "Startup type" is set to "Automatic"
5. Click "Start" if status is "Stopped"

### Sync server not auto-starting:

1. Make sure you saved the process:
   ```bash
   pm2 save
   ```

2. Check if process is in saved list:
   ```bash
   pm2 list
   ```

3. Manually start if needed:
   ```bash
   pm2 start server/shopify-sync.js --name shopify-sync
   pm2 save
   ```

### Port 3002 already in use:

- Change `SHOPIFY_SYNC_PORT` in `.env` to a different port
- Or stop the process: `pm2 stop shopify-sync`

## 📝 Summary

**✅ What's Done:**
- PM2 Windows Service installed
- PM2 service is running
- shopify-sync process is saved
- Auto-start configured for Windows boot

**✅ What Happens Now:**
- Sync server runs automatically on Windows boot
- Orders sync every 5 minutes
- No manual intervention needed

**✅ Next Steps:**
1. Test health endpoint: `http://localhost:3002/api/shopify/health`
2. Test manual sync: `http://localhost:3002/api/shopify/sync`
3. Verify after reboot (optional test)

## 🎯 Your System is Ready!

Your Shopify sync is now fully automated and will:
- ✅ Start automatically on Windows boot
- ✅ Sync orders every 5 minutes
- ✅ Restart automatically if it crashes
- ✅ Run in the background (no terminal needed)

**Everything is set up! 🎉**

