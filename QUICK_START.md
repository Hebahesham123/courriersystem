# 🚀 Quick Start Guide

## ⚡ Fix White Screen & Setup Database

### Step 1: Update Browserslist (Optional - Won't Fix White Screen)

The browserslist warning is just a warning - it won't cause white screen. But to fix it:

1. Open terminal/command prompt in the project folder
2. If you have npm in PATH, run:
   ```bash
   npm update browserslist-db
   ```
3. If npm is not found, you need to:
   - Install Node.js from https://nodejs.org
   - Or use the full path to npm (usually in Program Files)

### Step 2: Setup Database (REQUIRED - This Fixes White Screen!)

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: `bdquuixqypkmbvvfymvm`
3. **Open SQL Editor**: Click "SQL Editor" in left sidebar
4. **Create New Query**: Click "New Query" button
5. **Copy SQL File**: Open `COMPLETE_DATABASE_SETUP.sql` in this project
6. **Paste & Run**: Copy entire contents, paste in SQL Editor, click "Run"
7. **Wait for Success**: You should see "Success. No rows returned"

### Step 3: Create Test Users

1. **Go to Authentication**: In Supabase dashboard → Authentication → Users
2. **Add User**: Click "Add User" → "Create new user"
3. **Create Admin User**:
   - Email: `admin@example.com`
   - Password: `password123` (or your choice)
   - Click "Create User"
   - **Copy the User UUID** (you'll need it)
4. **Create Courier User**:
   - Email: `courier@example.com`
   - Password: `password123` (or your choice)
   - Click "Create User"
   - **Copy the User UUID** (you'll need it)
5. **Link to Users Table**: Go back to SQL Editor and run:
   ```sql
   INSERT INTO users (id, email, role, name) VALUES
     ('PASTE_ADMIN_UUID_HERE', 'admin@example.com', 'admin', 'Admin User'),
     ('PASTE_COURIER_UUID_HERE', 'courier@example.com', 'courier', 'Courier User')
   ON CONFLICT (id) DO NOTHING;
   ```
   Replace `PASTE_ADMIN_UUID_HERE` and `PASTE_COURIER_UUID_HERE` with actual UUIDs

### Step 4: Verify .env File

1. **Check if `.env` exists** in project root folder
2. **If it doesn't exist**, create it with:
   ```env
   VITE_SUPABASE_URL=https://bdquuixqypkmbvvfymvm.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXV1aXhxeXBrbWJ2dmZ5bXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODgxNTQsImV4cCI6MjA4MDg2NDE1NH0.XK5oL2CyL_9-PGpDRjm1Mj4QPDGIqO-DIcNxZtQ0vIA
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   PORT=3001
   ```
3. **Get Service Role Key**: 
   - Supabase Dashboard → Settings → API
   - Copy "service_role" key (not anon key!)
   - Replace `your_service_role_key_here` in `.env`

### Step 5: Restart Development Server

1. **Stop current server**: Press `Ctrl+C` in terminal
2. **Start again**: 
   ```bash
   npm run dev
   ```
3. **Open browser**: Go to the URL shown (usually http://localhost:5173)
4. **Login**: Use `admin@example.com` / `password123`

## ✅ Checklist

- [ ] Database SQL script run successfully
- [ ] Test users created in Authentication
- [ ] Users linked to `users` table
- [ ] `.env` file exists with correct values
- [ ] Service role key added to `.env`
- [ ] Development server restarted
- [ ] Can login with test credentials

## 🆘 Still White Screen?

1. **Open Browser Console** (F12 → Console tab)
2. **Look for red errors** - share them
3. **Check Network tab** (F12 → Network) - look for failed requests
4. **Verify tables exist**: Supabase Dashboard → Database → Tables
   - Should see: `users`, `orders`, `requests`, `request_notes`

## 📚 More Help

- **Database Setup Details**: See `DATABASE_SETUP_COMPLETE.md`
- **White Screen Troubleshooting**: See `FIX_WHITE_SCREEN.md`
- **Complete SQL Script**: See `COMPLETE_DATABASE_SETUP.sql`

---

**Most Common Issue**: Forgetting to restart dev server after creating/updating `.env` file!

