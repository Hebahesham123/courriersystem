# 🚀 Hostinger Deployment Guide for Shopify Sync

## ✅ Yes, You Can Run Sync on Hostinger!

Hostinger supports Node.js applications, but the setup depends on your hosting plan:

- ✅ **VPS Hosting** - Best option (full control, SSH access)
- ✅ **Cloud Hosting** - Good option (Node.js support)
- ⚠️ **Shared Hosting** - Limited (may not support Node.js well)

---

## 🎯 Option 1: Hostinger VPS (Recommended)

If you have **VPS hosting** on Hostinger, you can run the sync server directly.

### Step 1: Access Your VPS

1. **Login to Hostinger hPanel**
2. **Go to VPS** section
3. **Get SSH credentials:**
   - IP address
   - Username (usually `root`)
   - Password (or SSH key)

### Step 2: Connect via SSH

**Windows (PowerShell/Command Prompt):**
```bash
ssh root@your-server-ip
```

**Or use PuTTY** (Windows):
- Download PuTTY
- Enter your server IP
- Connect with username/password

### Step 3: Install Node.js

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18+ (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 4: Upload Your Code

**Option A: Using Git (Recommended)**
```bash
# Install Git
apt install -y git

# Clone your repository
cd /var/www
git clone https://github.com/your-username/your-repo.git
cd your-repo

# Install dependencies
npm install
```

**Option B: Using SFTP**
1. Use FileZilla or WinSCP
2. Connect via SFTP to your server
3. Upload your project files to `/var/www/your-project`

### Step 5: Set Up Environment Variables

```bash
# Create .env file
cd /var/www/your-project
nano .env
```

Add your environment variables:
```env
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_token
SHOPIFY_API_VERSION=2024-10
SHOPIFY_SYNC_PORT=3002
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### Step 6: Install PM2

```bash
npm install -g pm2
```

### Step 7: Start Sync Server

```bash
cd /var/www/your-project
pm2 start server/shopify-sync.js --name shopify-sync
pm2 save
pm2 startup  # This will show a command - run it as shown
```

### Step 8: Configure Firewall (if needed)

```bash
# Allow port 3002 (if you want to access health endpoint externally)
ufw allow 3002/tcp
ufw reload
```

### Step 9: Verify It's Working

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs shopify-sync

# Test health endpoint (from your local machine)
curl http://your-server-ip:3002/api/shopify/health
```

---

## 🎯 Option 2: Hostinger Cloud Hosting

If you have **Cloud Hosting** with Node.js support:

### Step 1: Access File Manager

1. **Login to hPanel**
2. **Go to File Manager**
3. **Navigate to your domain folder** (usually `public_html` or `domains/yourdomain.com`)

### Step 2: Upload Files

1. **Upload your project files** via File Manager or SFTP
2. **Create `.env` file** with environment variables

### Step 3: Configure Node.js App

1. **In hPanel**, look for **"Node.js"** or **"Applications"** section
2. **Create new Node.js app:**
   - **App Name:** `shopify-sync`
   - **Node.js Version:** 18 or higher
   - **App Root:** `/domains/yourdomain.com/shopify-sync` (or your folder)
   - **Start Command:** `node server/shopify-sync.js`
   - **Port:** `3002` (or auto-assigned)

### Step 4: Set Environment Variables

In the Node.js app settings, add:
```
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_token
SHOPIFY_API_VERSION=2024-10
SHOPIFY_SYNC_PORT=3002
```

### Step 5: Deploy

1. **Click "Deploy"** or **"Start"**
2. **Check logs** to verify it's running
3. **Test health endpoint**

---

## 🎯 Option 3: Using Hostinger Cron Jobs

If you have **shared hosting** without Node.js support, you can use **cron jobs** to trigger a sync via HTTP endpoint.

### Step 1: Deploy Sync Server Elsewhere

Deploy the sync server to:
- Railway (free)
- Render (free)
- Or any Node.js hosting

### Step 2: Set Up Cron Job in Hostinger

1. **Login to hPanel**
2. **Go to Cron Jobs**
3. **Create new cron job:**
   - **Command:** `curl https://your-sync-server.railway.app/api/shopify/sync`
   - **Schedule:** `*/5 * * * *` (every 5 minutes)

This will call your sync server every 5 minutes via HTTP.

---

## 🔧 Using PM2 on Hostinger VPS

### PM2 Commands:

```bash
# View status
pm2 status

# View logs
pm2 logs shopify-sync

# Restart
pm2 restart shopify-sync

# Stop
pm2 stop shopify-sync

# Delete
pm2 delete shopify-sync

# Save process list
pm2 save

# Auto-start on boot (run the command shown by pm2 startup)
pm2 startup
```

### Auto-Start on Boot:

After running `pm2 startup`, you'll see a command like:
```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
```

Run that command, then:
```bash
pm2 save
```

Now PM2 will auto-start on server reboot!

---

## 🧪 Testing Your Setup

### 1. Check if Sync Server is Running:

```bash
pm2 status
```

Should show `shopify-sync` with status `online`

### 2. Test Health Endpoint:

```bash
curl http://localhost:3002/api/shopify/health
```

Or from your local machine:
```bash
curl http://your-server-ip:3002/api/shopify/health
```

### 3. Test Manual Sync:

```bash
curl http://localhost:3002/api/shopify/sync
```

### 4. Check Logs:

```bash
pm2 logs shopify-sync --lines 50
```

Look for:
```
🔄 Starting Shopify order sync...
📦 Found X orders in Shopify
✅ Sync complete: X imported, X updated
```

---

## 🔒 Security Considerations

### 1. Firewall Configuration:

Only expose port 3002 if you need external access. Otherwise, keep it internal:

```bash
# Block external access (recommended)
ufw deny 3002/tcp

# Or allow only from specific IP
ufw allow from YOUR_IP to any port 3002
```

### 2. Environment Variables:

- ✅ Never commit `.env` to Git
- ✅ Use strong passwords/tokens
- ✅ Restrict file permissions: `chmod 600 .env`

### 3. PM2 Security:

```bash
# Run PM2 as non-root user (recommended)
adduser nodejs
su - nodejs
pm2 start server/shopify-sync.js --name shopify-sync
```

---

## 📋 Deployment Checklist

### VPS Setup:
- [ ] SSH access configured
- [ ] Node.js 18+ installed
- [ ] Project files uploaded
- [ ] `.env` file created with all variables
- [ ] PM2 installed and configured
- [ ] Sync server running (`pm2 status`)
- [ ] Auto-start configured (`pm2 startup` + `pm2 save`)
- [ ] Health endpoint working
- [ ] Manual sync test successful
- [ ] Logs showing sync activity

### Cloud Hosting Setup:
- [ ] Node.js app created in hPanel
- [ ] Files uploaded
- [ ] Environment variables set
- [ ] App started
- [ ] Health endpoint working
- [ ] Logs checked

---

## 🆘 Troubleshooting

### "Command not found: node"

**Solution:**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
```

### "Port 3002 already in use"

**Solution:**
```bash
# Find process using port
lsof -i :3002
# Kill it
kill -9 PID
# Or change port in .env
```

### "PM2 not found"

**Solution:**
```bash
npm install -g pm2
```

### "Sync server stops after SSH disconnect"

**Solution:**
```bash
# Use PM2 (keeps running in background)
pm2 start server/shopify-sync.js --name shopify-sync
pm2 save
pm2 startup  # Configure auto-start
```

### "Cannot connect to Supabase/Shopify"

**Solution:**
- Check environment variables are set correctly
- Verify network connectivity: `ping api.shopify.com`
- Check firewall rules
- Verify API tokens are correct

---

## 📝 Summary

**Yes, you can run the sync server on Hostinger!**

**Best Option:** VPS Hosting with PM2
- ✅ Full control
- ✅ SSH access
- ✅ Can run Node.js and PM2
- ✅ Auto-start on boot
- ✅ Reliable and stable

**Alternative:** Cloud Hosting with Node.js support
- ✅ Easier setup (via hPanel)
- ✅ Managed service
- ⚠️ Less control

**Workaround:** Shared hosting → Use cron to call sync server on Railway/Render

**Your sync will run automatically every 5 minutes! 🎉**

