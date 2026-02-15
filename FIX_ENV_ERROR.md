# 🔧 Fix: Missing Supabase Environment Variables

## Quick Fix (2 minutes)

### Step 1: Create `.env` File

Create a file named `.env` in your project root (same folder as `package.json`).

**Windows PowerShell:**
```powershell
New-Item -Path .env -ItemType File
notepad .env
```

**Windows Command Prompt:**
```cmd
type nul > .env
notepad .env
```

### Step 2: Add Your Credentials

Based on your existing credentials file, add this to `.env`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://bdquuixqypkmbvvfymvm.supabase.co
SUPABASE_URL=https://bdquuixqypkmbvvfymvm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXV1aXhxeXBrbWJ2dmZ5bXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODgxNTQsImV4cCI6MjA4MDg2NDE1NH0.XK5oL2CyL_9-PGpDRjm1Mj4QPDGIqO-DIcNxZtQ0vIA
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXV1aXhxeXBrbWJ2dmZ5bXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODgxNTQsImV4cCI6MjA4MDg2NDE1NH0.XK5oL2CyL_9-PGpDRjm1Mj4QPDGIqO-DIcNxZtQ0vIA

# ⚠️ IMPORTANT: Get your Service Role Key from Supabase Dashboard
# Go to: Supabase Dashboard > Settings > API > service_role key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Shopify Configuration
# Get from: Shopify Admin > Settings > Apps > Develop apps
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your-shopify-access-token-here
SHOPIFY_API_VERSION=2024-10
```

### Step 3: Get Missing Credentials

#### Get Supabase Service Role Key:

1. Go to https://app.supabase.com
2. Select your project
3. Go to **Settings** → **API**
4. Scroll down to **service_role key**
5. Click **Reveal** and copy the key
6. Paste it in `.env` as `SUPABASE_SERVICE_ROLE_KEY`

#### Get Shopify Credentials:

1. Go to your Shopify Admin
2. Go to **Settings** → **Apps and sales channels**
3. Click **Develop apps** (or **Manage private apps**)
4. Create a new app or use existing one
5. Go to **API credentials**
6. Copy:
   - **Store URL**: Your store name (e.g., `your-store.myshopify.com`)
   - **Admin API access token**: The token starting with `shpat_`

### Step 4: Verify Setup

Run this command to check if everything is set up correctly:

```bash
node setup-env.js
```

You should see ✅ for all required variables.

### Step 5: Try Again

Now run your command:

```bash
node FORCE_RESYNC_ALL_ORDERS.js
# or
npm run shopify-sync
```

## Still Getting Errors?

### Check 1: File Location
- `.env` must be in the **root** of your project
- Same folder as `package.json`
- Not in a subfolder

### Check 2: File Name
- Must be exactly `.env` (not `.env.txt` or `.env.example`)
- No file extension

### Check 3: No Quotes
Don't use quotes around values:
```env
# ✅ Correct
VITE_SUPABASE_URL=https://bdquuixqypkmbvvfymvm.supabase.co

# ❌ Wrong
VITE_SUPABASE_URL="https://bdquuixqypkmbvvfymvm.supabase.co"
```

### Check 4: Install dotenv
Make sure `dotenv` is installed:
```bash
npm install dotenv
```

## Quick Test

Test if your `.env` is being loaded:

```bash
node -e "require('dotenv').config(); console.log('SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅' : '❌');"
```

If you see ✅, your `.env` is working!

## Need More Help?

- See `QUICK_ENV_SETUP.md` for step-by-step guide
- See `ENV_SETUP_GUIDE.md` for detailed instructions


