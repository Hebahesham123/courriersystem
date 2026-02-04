# 🔧 Environment Variables Setup Guide

## Error: Missing Supabase Environment Variables

If you're seeing this error, you need to set up your `.env` file with the required environment variables.

## Step 1: Create `.env` File

Create a `.env` file in the root of your project (same directory as `package.json`).

**Windows:**
```bash
# In PowerShell or Command Prompt
cd C:\Users\g8\Downloads\courrier2026-main (1)\courrier2026-main
copy .env.example .env
# Then edit .env with your values
```

**Mac/Linux:**
```bash
cp .env.example .env
# Then edit .env with your values
```

## Step 2: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the following values:

### Required Values:

- **Project URL** → Use for `VITE_SUPABASE_URL` and `SUPABASE_URL`
- **service_role key** → Use for `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)
- **anon public key** → Use for `VITE_SUPABASE_ANON_KEY` and `SUPABASE_ANON_KEY`

## Step 3: Get Your Shopify Credentials

1. Go to your Shopify Admin
2. Go to **Settings** → **Apps and sales channels**
3. Click **Develop apps** (or **Manage private apps**)
4. Create a new app or use existing one
5. Go to **API credentials**
6. Copy the following:

### Required Values:

- **Store URL** → Your store name (e.g., `your-store.myshopify.com`)
- **Admin API access token** → Use for `SHOPIFY_ACCESS_TOKEN`

## Step 4: Fill in Your `.env` File

Open `.env` and fill in your values:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Shopify Configuration
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxx
SHOPIFY_API_VERSION=2024-10

# Optional: Sync Server
SYNC_SERVER_URL=http://localhost:3002
PORT=3002
```

## Step 5: Verify Setup

### Check if `.env` file exists:
```bash
# Windows PowerShell
Test-Path .env

# Mac/Linux
ls -la .env
```

### Test environment variables are loaded:
```bash
# Windows PowerShell
node -e "require('dotenv').config(); console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing')"

# Mac/Linux
node -e "require('dotenv').config(); console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing')"
```

## Common Issues

### Issue 1: `.env` file not found

**Solution:**
- Make sure `.env` is in the root directory (same as `package.json`)
- Check the file name is exactly `.env` (not `.env.txt` or `.env.example`)

### Issue 2: Variables not loading

**Solution:**
- Make sure you have `dotenv` installed:
  ```bash
  npm install dotenv
  ```
- Make sure your script calls `require('dotenv').config()` at the top:
  ```javascript
  require('dotenv').config();
  ```

### Issue 3: Wrong Supabase URL format

**Correct format:**
```
https://xxxxxxxxxxxxx.supabase.co
```

**Wrong formats:**
```
https://app.supabase.com/project/xxxxx  ❌
https://supabase.co/project/xxxxx        ❌
```

### Issue 4: Service Role Key vs Anon Key

- **Service Role Key**: Full access, use for backend/server scripts
- **Anon Key**: Limited access, use for frontend/client

For the sync server and force resync script, you need the **Service Role Key**.

## Quick Setup Script

Create a file `setup-env.js`:

```javascript
require('dotenv').config();

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SHOPIFY_STORE_URL',
  'SHOPIFY_ACCESS_TOKEN'
];

console.log('🔍 Checking environment variables...\n');

let allSet = true;
required.forEach(key => {
  const value = process.env[key];
  if (value) {
    console.log(`✅ ${key}: Set (${value.substring(0, 20)}...)`);
  } else {
    console.log(`❌ ${key}: Missing`);
    allSet = false;
  }
});

if (allSet) {
  console.log('\n✅ All required environment variables are set!');
} else {
  console.log('\n❌ Some environment variables are missing.');
  console.log('Please check your .env file.');
  process.exit(1);
}
```

Run it:
```bash
node setup-env.js
```

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `.env` file to Git
- `.env` should be in `.gitignore`
- Service Role Key has full database access - keep it secret!
- Don't share your `.env` file

## Next Steps

After setting up `.env`:

1. ✅ Verify variables are loaded
2. ✅ Run the sync server:
   ```bash
   npm run shopify-sync
   ```
3. ✅ Run force resync:
   ```bash
   node FORCE_RESYNC_ALL_ORDERS.js
   ```

## Need Help?

If you're still having issues:

1. Check that `.env` file is in the correct location
2. Verify all values are correct (no extra spaces, quotes, etc.)
3. Make sure `dotenv` package is installed
4. Check that your script calls `require('dotenv').config()` before using variables

