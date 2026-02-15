# ⚡ Quick Environment Variables Setup

## The Error You're Seeing

```
❌ Missing Supabase environment variables
```

## Quick Fix (5 minutes)

### Step 1: Create `.env` File

Create a file named `.env` in your project root (same folder as `package.json`).

**Windows:**
1. Open Notepad
2. Save as `.env` (make sure to select "All Files" instead of "Text Documents")
3. Or use PowerShell:
   ```powershell
   New-Item -Path .env -ItemType File
   ```

### Step 2: Get Your Supabase Credentials

1. Go to https://app.supabase.com
2. Select your project
3. Go to **Settings** → **API**
4. Copy these values:

### Step 3: Fill in `.env` File

Copy this template into your `.env` file and replace with your actual values:

```env
# Supabase Configuration
# Get from: Supabase Dashboard > Settings > API

# Project URL (looks like: https://xxxxx.supabase.co)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_URL=https://your-project-id.supabase.co

# Service Role Key (keep secret! - for backend)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Anon Key (for frontend)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Shopify Configuration
# Get from: Shopify Admin > Settings > Apps > Develop apps

# Your store URL (without https://)
SHOPIFY_STORE_URL=your-store.myshopify.com

# Admin API Access Token
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxx

# API Version (optional)
SHOPIFY_API_VERSION=2024-10
```

### Step 4: Verify It Works

Run this command to check if variables are loaded:

```bash
node -e "require('dotenv').config(); console.log('SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'); console.log('SHOPIFY_STORE_URL:', process.env.SHOPIFY_STORE_URL ? '✅ Set' : '❌ Missing');"
```

If you see ✅ for both, you're good to go!

### Step 5: Try Again

Now run your command again:
```bash
node FORCE_RESYNC_ALL_ORDERS.js
# or
npm run shopify-sync
```

## Still Having Issues?

### Check 1: File Location
Make sure `.env` is in the **root** of your project (same folder as `package.json`).

### Check 2: File Name
The file must be named exactly `.env` (not `.env.txt` or `.env.example`).

### Check 3: No Quotes
Don't use quotes around values in `.env`:
```env
# ✅ Correct
VITE_SUPABASE_URL=https://xxxxx.supabase.co

# ❌ Wrong
VITE_SUPABASE_URL="https://xxxxx.supabase.co"
```

### Check 4: Install dotenv
Make sure `dotenv` is installed:
```bash
npm install dotenv
```

## Need More Help?

See `ENV_SETUP_GUIDE.md` for detailed instructions with screenshots and troubleshooting.

## Quick Reference

**Where to get Supabase credentials:**
- URL: Supabase Dashboard → Settings → API → Project URL
- Service Role Key: Supabase Dashboard → Settings → API → service_role key
- Anon Key: Supabase Dashboard → Settings → API → anon public key

**Where to get Shopify credentials:**
- Store URL: Your Shopify store name (e.g., `your-store.myshopify.com`)
- Access Token: Shopify Admin → Settings → Apps → Develop apps → API credentials


