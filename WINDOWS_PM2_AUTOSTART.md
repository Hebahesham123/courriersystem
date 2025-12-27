# 🪟 Windows PM2 Auto-Start Guide

## ✅ Current Status

Your Shopify sync server is **already running** with PM2! The `pm2 startup` command doesn't work on Windows, but we can set up auto-start using Windows Task Scheduler.

## 🔄 Option 1: Windows Task Scheduler (Recommended)

### Step 1: Create a Startup Script

Create a file `start-shopify-sync.bat` in your project root:

```batch
@echo off
cd /d "C:\Users\g8\Downloads\courier-pro-main\courier-pro-main"
call npm run shopify-sync
```

Or if you want to use PM2:

```batch
@echo off
cd /d "C:\Users\g8\Downloads\courier-pro-main\courier-pro-main"
call npx pm2 resurrect
```

### Step 2: Set Up Task Scheduler

1. **Open Task Scheduler:**
   - Press `Win + R`
   - Type: `taskschd.msc`
   - Press Enter

2. **Create Basic Task:**
   - Click "Create Basic Task" in the right panel
   - Name: "Shopify Sync Server"
   - Description: "Auto-start Shopify sync server on Windows login"

3. **Trigger:**
   - Select "When I log on"
   - Click Next

4. **Action:**
   - Select "Start a program"
   - Click Next
   - Program/script: `C:\Users\g8\Downloads\courier-pro-main\courier-pro-main\start-shopify-sync.bat`
   - Start in: `C:\Users\g8\Downloads\courier-pro-main\courier-pro-main`
   - Click Next

5. **Finish:**
   - Check "Open the Properties dialog for this task when I click Finish"
   - Click Finish

6. **Configure Properties:**
   - In the Properties window, check "Run whether user is logged on or not"
   - Check "Run with highest privileges"
   - Click OK

## 🔄 Option 2: Use PM2 with Windows Service Wrapper

### Install pm2-windows-service:

```bash
npm install -g pm2-windows-service
```

### Install PM2 as Windows Service:

```bash
pm2-service-install
```

This will:
- Install PM2 as a Windows service
- Auto-start PM2 on Windows boot
- Auto-resurrect saved processes

### After installation:

```bash
# Start your sync server
pm2 start server/shopify-sync.js --name shopify-sync

# Save the process list
pm2 save

# The service will now auto-start PM2 and restore your processes on boot
```

## 🔄 Option 3: Simple Batch File (Manual Start)

If you prefer to manually start it when needed, create `start-sync.bat`:

```batch
@echo off
echo Starting Shopify Sync Server...
cd /d "%~dp0"
npx pm2 start server/shopify-sync.js --name shopify-sync
npx pm2 save
echo.
echo Sync server started!
echo View logs: npx pm2 logs shopify-sync
echo Stop server: npx pm2 stop shopify-sync
pause
```

## 📊 Useful PM2 Commands (Windows)

```bash
# View status
npx pm2 status

# View logs
npx pm2 logs shopify-sync

# Restart
npx pm2 restart shopify-sync

# Stop
npx pm2 stop shopify-sync

# Delete
npx pm2 delete shopify-sync

# Save current process list
npx pm2 save

# Resurrect saved processes
npx pm2 resurrect
```

## ✅ Verify It's Working

1. **Check if sync server is running:**
   ```bash
   npx pm2 status
   ```
   Should show `shopify-sync` with status `online`

2. **Check health endpoint:**
   Open browser: `http://localhost:3002/api/shopify/health`

3. **Check logs:**
   ```bash
   npx pm2 logs shopify-sync
   ```

4. **Test manual sync:**
   Open browser: `http://localhost:3002/api/shopify/sync`

## 🎯 Quick Start (For Now)

Since PM2 is already running, you can:

1. **Keep the current terminal open** - PM2 will keep running
2. **Or close it and use Task Scheduler** - Set up auto-start as shown above
3. **Or use Option 2** - Install PM2 as Windows service for automatic startup

## 🔧 Troubleshooting

### PM2 not found in new terminal:
- Use `npx pm2` instead of just `pm2`
- Or add PM2 to PATH (it's usually in `C:\Users\g8\AppData\Roaming\npm`)

### Sync server stops after closing terminal:
- Use Task Scheduler (Option 1) or PM2 Windows Service (Option 2)
- Or keep terminal open, or run as background process

### Port 3002 already in use:
- Change `SHOPIFY_SYNC_PORT` in `.env` to a different port
- Or stop the process: `npx pm2 stop shopify-sync`

## 📝 Summary

**Current Status:** ✅ Sync server is running with PM2

**For Auto-Start on Windows:**
- ✅ **Option 1**: Task Scheduler (easiest, no extra installs)
- ✅ **Option 2**: PM2 Windows Service (most robust)
- ✅ **Option 3**: Manual batch file (simple, but manual)

**Your sync server is working!** It will sync orders every 5 minutes automatically. 🎉

