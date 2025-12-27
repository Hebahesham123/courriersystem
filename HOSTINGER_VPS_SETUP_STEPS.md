# 🚀 Hostinger VPS Setup for Shopify Sync - Step by Step

## 📋 What You Need to Do

### Step 1: Set Up VPS on Hostinger

1. **Click "Set up VPS"** on the VPS Hosting card
2. **Choose your VPS plan:**
   - Minimum: 1GB RAM, 1 CPU core (should be enough for sync server)
   - Recommended: 2GB RAM, 2 CPU cores (better performance)
3. **Select operating system:**
   - Choose **Ubuntu 22.04** or **Ubuntu 20.04** (easiest for Node.js)
4. **Complete the purchase/setup**
5. **Wait for VPS to be provisioned** (usually 5-10 minutes)

### Step 2: Get Your VPS Credentials

After VPS is ready:

1. **Go to Hostinger hPanel** → **VPS** section
2. **Find your VPS** in the list
3. **Click on it** to view details
4. **Note down:**
   - **IP Address** (e.g., `123.45.67.89`)
   - **Root Password** (or SSH key)
   - **Username** (usually `root`)

### Step 3: Connect to Your VPS

**On Windows:**

**Option A: Using PowerShell (Built-in)**
```powershell
ssh root@YOUR_VPS_IP
# Enter password when prompted
```

**Option B: Using PuTTY (Easier)**
1. Download PuTTY: https://www.putty.org/
2. Open PuTTY
3. Enter your VPS IP address
4. Click "Open"
5. Login with username: `root` and your password

### Step 4: Install Node.js

Once connected via SSH, run these commands:

```bash
# Update system packages
apt update && apt upgrade -y

# Install Node.js 18 (LTS version)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify installation
node --version
npm --version
```

You should see:
```
v18.x.x
9.x.x
```

### Step 5: Install Git

```bash
apt install -y git
```

### Step 6: Clone Your Repository

```bash
# Create project directory
mkdir -p /var/www
cd /var/www

# Clone your GitHub repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# Install project dependencies
npm install
```

**Note:** Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub details.

### Step 7: Create Environment Variables File

```bash
# Create .env file
nano .env
```

**Press `i` to enter insert mode**, then paste:

```env
VITE_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SHOPIFY_STORE_URL=your-store-name.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_shopify_admin_api_token
SHOPIFY_API_VERSION=2024-10
SHOPIFY_SYNC_PORT=3002
```

**Replace the values with your actual credentials!**

**To save:**
1. Press `Ctrl + X`
2. Press `Y` (to confirm)
3. Press `Enter`

### Step 8: Install PM2

```bash
npm install -g pm2
```

### Step 9: Start the Sync Server

```bash
# Navigate to project directory (if not already there)
cd /var/www/YOUR_REPO_NAME

# Start sync server with PM2
pm2 start server/shopify-sync.js --name shopify-sync

# Save the process list
pm2 save

# Set up auto-start on boot
pm2 startup
```

**After running `pm2 startup`, you'll see a command like:**
```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
```

**Copy and run that command**, then:
```bash
pm2 save
```

### Step 10: Verify It's Working

```bash
# Check PM2 status
pm2 status

# Should show:
# ┌────┬──────────────┬─────────┬──────┬───────────┐
# │ id │ name         │ status  │ cpu  │ memory   │
# ├────┼──────────────┼─────────┼──────┼───────────┤
# │ 0  │ shopify-sync │ online  │ 0%   │ 58.8mb   │
# └────┴──────────────┴─────────┴──────┴───────────┘

# View logs
pm2 logs shopify-sync

# You should see:
# 🚀 SHOPIFY SYNC SERVER STARTED
# 🔄 Auto-sync: Every 5 minutes
# ✅ Initial sync complete
```

### Step 11: Test Health Endpoint

From your local computer, test if the server is accessible:

```bash
# Replace YOUR_VPS_IP with your actual IP
curl http://YOUR_VPS_IP:3002/api/shopify/health
```

Or open in browser:
```
http://YOUR_VPS_IP:3002/api/shopify/health
```

Should return JSON with `"status": "OK"`

### Step 12: Configure Firewall (Optional)

If you want to access the health endpoint from outside:

```bash
# Allow port 3002
ufw allow 3002/tcp
ufw reload
```

**Note:** For security, you might want to keep port 3002 internal only and not expose it publicly.

---

## ✅ Checklist

- [ ] VPS purchased and set up on Hostinger
- [ ] SSH credentials obtained (IP, username, password)
- [ ] Connected to VPS via SSH
- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created with all variables
- [ ] PM2 installed
- [ ] Sync server started with PM2
- [ ] PM2 auto-start configured
- [ ] Health endpoint working
- [ ] Logs showing sync activity

---

## 🎯 What Happens Next?

Once everything is set up:

1. **Sync server runs 24/7** on your VPS
2. **Automatically syncs orders every 5 minutes**
3. **Auto-restarts if it crashes** (thanks to PM2)
4. **Auto-starts on server reboot** (thanks to PM2 startup)

---

## 🔧 Useful Commands

```bash
# View sync server status
pm2 status

# View logs (real-time)
pm2 logs shopify-sync

# Restart sync server
pm2 restart shopify-sync

# Stop sync server
pm2 stop shopify-sync

# View last 50 log lines
pm2 logs shopify-sync --lines 50
```

---

## 🆘 Troubleshooting

### "Permission denied" when connecting via SSH
- Make sure you're using the correct password
- Check if SSH key authentication is required

### "Command not found: node"
- Node.js not installed correctly
- Run: `curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt install -y nodejs`

### "Cannot clone repository"
- Check if repository is public, or
- Set up SSH keys for private repos

### "Port 3002 already in use"
- Another process is using it
- Change `SHOPIFY_SYNC_PORT` in `.env` to a different port

### "Sync not working"
- Check logs: `pm2 logs shopify-sync`
- Verify environment variables are correct
- Test health endpoint

---

## 📝 Summary

**What to do:**
1. ✅ Click "Set up VPS" on Hostinger
2. ✅ Choose Ubuntu OS
3. ✅ Get SSH credentials
4. ✅ Connect via SSH
5. ✅ Install Node.js, Git, PM2
6. ✅ Clone your repo
7. ✅ Create `.env` file
8. ✅ Start with PM2
9. ✅ Configure auto-start
10. ✅ Test and verify

**Result:** Your sync server will run automatically on Hostinger VPS and sync orders every 5 minutes! 🎉

