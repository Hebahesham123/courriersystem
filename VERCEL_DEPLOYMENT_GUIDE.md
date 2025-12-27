# 🚀 Vercel Deployment Guide for Shopify Sync

## ⚠️ Important: Vercel Limitations

**Vercel is a serverless platform** - it cannot run long-running processes or cron jobs directly. Your current `shopify-sync.js` server uses:
- ❌ Long-running Express server (not supported)
- ❌ `node-cron` for scheduled tasks (not supported)
- ❌ Continuous background processes (not supported)

## ✅ Solution: Two-Part Deployment

You need to deploy **two separate parts**:

1. **Frontend (React App)** → Deploy to **Vercel** ✅
2. **Sync Server** → Deploy to **separate service** (Railway, Render, etc.) ✅

---

## 📦 Part 1: Deploy Frontend to Vercel

### Step 1: Prepare for Vercel

1. **Build your React app:**
   ```bash
   npm run build
   ```

2. **Create `vercel.json`** (if needed):
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "framework": "vite",
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

3. **Set Environment Variables in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_anon_key
     ```
   - **Note:** Only add `VITE_` prefixed variables (for frontend)
   - **Do NOT** add Shopify or Service Role keys here (they go in the sync server)

### Step 2: Deploy to Vercel

1. **Connect GitHub repository** to Vercel
2. **Vercel will auto-detect** Vite/React
3. **Deploy** - your frontend will be live!

---

## 🔄 Part 2: Deploy Sync Server Separately

You need a service that supports **long-running processes**. Here are the best options:

### Option 1: Railway (Recommended - Easiest) 🚂

**Railway** is perfect for Node.js apps with background processes.

#### Setup:

1. **Go to:** https://railway.app
2. **Sign up** with GitHub
3. **New Project** → **Deploy from GitHub repo**
4. **Select your repo**
5. **Configure:**
   - **Root Directory:** Leave empty (or `server/` if you want)
   - **Build Command:** `npm install`
   - **Start Command:** `node server/shopify-sync.js`

6. **Add Environment Variables:**
   ```
   VITE_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SHOPIFY_STORE_URL=your-store.myshopify.com
   SHOPIFY_ACCESS_TOKEN=your_token
   SHOPIFY_API_VERSION=2024-10
   SHOPIFY_SYNC_PORT=3002
   ```

7. **Deploy** - Railway will keep it running 24/7!

**Cost:** Free tier available, then ~$5/month

---

### Option 2: Render 🎨

**Render** also supports long-running processes.

#### Setup:

1. **Go to:** https://render.com
2. **Sign up** with GitHub
3. **New** → **Web Service**
4. **Connect GitHub repo**
5. **Configure:**
   - **Name:** `shopify-sync`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server/shopify-sync.js`
   - **Plan:** Free (or paid for better performance)

6. **Add Environment Variables** (same as Railway)

7. **Deploy**

**Cost:** Free tier available

---

### Option 3: DigitalOcean App Platform 💧

1. **Go to:** https://www.digitalocean.com/products/app-platform
2. **Create App** → **GitHub**
3. **Configure** similar to Railway
4. **Deploy**

**Cost:** ~$5/month minimum

---

### Option 4: Vercel Cron Jobs (Advanced) ⚡

If you want to use Vercel, you can convert the sync to a **serverless function** and use **Vercel Cron Jobs**:

#### Step 1: Create Serverless Function

Create `api/shopify-sync.js`:

```javascript
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Your sync logic here (from shopify-sync.js)
  // But without Express server or node-cron
  
  try {
    const result = await syncShopifyOrders();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

#### Step 2: Configure Vercel Cron

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/shopify-sync",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Limitations:**
- ⚠️ Vercel Cron requires **Pro plan** ($20/month)
- ⚠️ Function timeout: 60 seconds (may not be enough for large syncs)
- ⚠️ More complex setup

---

## 🎯 Recommended Setup

**Best for Most Users:**

1. **Frontend:** Vercel (free, easy)
2. **Sync Server:** Railway (free tier, simple setup)

**Why:**
- ✅ Both free tiers available
- ✅ Easy to set up
- ✅ Reliable
- ✅ Automatic deployments from GitHub

---

## 📋 Deployment Checklist

### Frontend (Vercel):
- [ ] Build command works: `npm run build`
- [ ] Environment variables set in Vercel dashboard
- [ ] Domain configured (if custom)
- [ ] Deployed and accessible

### Sync Server (Railway/Render):
- [ ] Repository connected
- [ ] Environment variables added
- [ ] Start command: `node server/shopify-sync.js`
- [ ] Server running and accessible
- [ ] Health check works: `https://your-sync-server.railway.app/api/shopify/health`
- [ ] Manual sync works: `https://your-sync-server.railway.app/api/shopify/sync`

---

## 🧪 Testing After Deployment

### Test Frontend:
1. Visit your Vercel domain
2. Login works
3. Orders display correctly

### Test Sync Server:
1. Health check: `https://your-sync-server.railway.app/api/shopify/health`
2. Manual sync: `https://your-sync-server.railway.app/api/shopify/sync`
3. Check logs in Railway dashboard
4. Wait 5 minutes, verify orders sync automatically

---

## 🔒 Security Notes

1. **Never commit `.env` files** to GitHub
2. **Use environment variables** in hosting platforms
3. **Service Role Key** should only be in sync server (not frontend)
4. **Shopify Token** should only be in sync server

---

## 📝 Summary

**Question:** Will sync work automatically on Vercel?

**Answer:** ❌ **No, not directly.** You need:

1. ✅ **Frontend on Vercel** (your React app)
2. ✅ **Sync server on Railway/Render** (separate service)

**Why:** Vercel is serverless - it can't run long-running processes. The sync server needs to run continuously.

**Solution:** Deploy sync server separately to Railway or Render - it will run 24/7 and sync every 5 minutes automatically! 🎉

