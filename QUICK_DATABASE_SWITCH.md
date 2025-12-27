# ⚡ Quick Database Switch Guide

## 🎯 What Changed

Your project is now configured to use environment variables for database connections. This means you can easily switch between databases by updating configuration files.

## 📝 Files You Need to Update

### 1. Create/Update `.env` file (in project root)

```env
VITE_SUPABASE_URL=https://your-new-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_new_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key_here
PORT=3001
```

### 2. Update `supabase-config.js`

```javascript
window.SUPABASE_CONFIG = {
    url: 'https://your-new-project.supabase.co',
    anonKey: 'your_new_anon_key_here'
};
```

## 🔑 Where to Get Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your **NEW** project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

## ✅ After Updating

1. **Restart your development server:**
   ```bash
   npm run dev
   ```

2. **Restart your backend server:**
   ```bash
   npm run server
   ```

3. **Apply database schema** to your new Supabase project (see `database_schema.sql`)

## 📚 Full Guide

See `NEW_DATABASE_SETUP.md` for detailed step-by-step instructions.

---

**Your production database is safe!** It uses its own credentials from deployment settings and won't be affected by these changes.

