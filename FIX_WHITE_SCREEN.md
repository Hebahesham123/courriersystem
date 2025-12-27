# 🔧 Fix White Screen Issue

## Common Causes & Solutions

### 1. Missing Environment Variables

**Problem**: `.env` file is missing or has wrong values

**Solution**:
1. Create `.env` file in project root
2. Add these values:
   ```env
   VITE_SUPABASE_URL=https://bdquuixqypkmbvvfymvm.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXV1aXhxeXBrbWJ2dmZ5bXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODgxNTQsImV4cCI6MjA4MDg2NDE1NH0.XK5oL2CyL_9-PGpDRjm1Mj4QPDGIqO-DIcNxZtQ0vIA
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   PORT=3001
   ```
3. **RESTART** your dev server after creating/updating `.env`

### 2. Missing Database Tables

**Problem**: Database tables don't exist

**Solution**: 
- See `DATABASE_SETUP_COMPLETE.md` for SQL scripts to run
- Run the SQL in Supabase SQL Editor

### 3. Browserslist Warning (Not Critical)

**Problem**: Outdated browserslist database

**Solution**: 
- This warning won't cause white screen
- To fix: Open terminal in project folder and run:
  ```bash
  npm update browserslist-db
  ```
- Or if npm is not in PATH, use full path to npm

### 4. Check Browser Console

**Steps**:
1. Open your app in browser
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Look for **red error messages**
5. Common errors:
   - `Missing Supabase environment variables` → Fix `.env` file
   - `Failed to fetch` → Database connection issue
   - `Table does not exist` → Run database SQL scripts

### 5. Check Network Tab

**Steps**:
1. Open DevTools (F12)
2. Go to **Network** tab
3. Refresh the page
4. Look for failed requests (red status codes)
5. Check if Supabase API calls are working

### 6. Verify Supabase Connection

**Test in Browser Console**:
1. Open browser console (F12)
2. Type this and press Enter:
   ```javascript
   console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
   ```
3. If it shows `undefined`, your `.env` file is not being loaded

### 7. Restart Everything

**Complete Reset**:
1. Stop the dev server (Ctrl+C)
2. Delete `node_modules` folder (if needed)
3. Run `npm install` (if you deleted node_modules)
4. Make sure `.env` file exists with correct values
5. Start dev server: `npm run dev`
6. Clear browser cache (Ctrl+Shift+Delete)
7. Hard refresh page (Ctrl+F5)

## 🔍 Diagnostic Steps

Run these checks in order:

1. ✅ `.env` file exists and has correct values
2. ✅ Database tables are created (check Supabase dashboard)
3. ✅ Dev server is running (`npm run dev`)
4. ✅ Browser console shows no errors
5. ✅ Network tab shows successful API calls
6. ✅ Supabase project is active (not paused)

## 📞 Still Not Working?

Share these details:
- Browser console errors (screenshot)
- Network tab errors (screenshot)
- Contents of `.env` file (remove sensitive keys)
- Which tables exist in your Supabase database

