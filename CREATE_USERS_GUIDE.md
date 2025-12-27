# 🚀 Create All Users in Supabase - Quick Guide

## 📋 Users to Create

**Admins (5):**
- marina@gmail.com / marina123!
- mariam@gmail.com / mariam123!
- toka@gmail.com / toka123!
- shrouq@gmail.com / shrouq123!
- hagar@gmail.com / hagar123!

**Couriers (6):**
- ahmed@gmail.com / ahmed123!
- mohamed@gmail.com / mohamed123!
- salah@gmail.com / salah123!
- emad@gmail.com / emad123!
- test1@gmail.com / test1123!
- test2@gmail.com / test2123!

---

## ✅ Method 1: Using Node.js Script (Automated)

### Step 1: Get Your Service Role Key

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: `bdquuixqypkmbvvfymvm`
3. Go to **Settings** → **API**
4. Scroll down to **"service_role" key** (⚠️ Keep this secret!)
5. Click **"Reveal"** and **copy the key**

### Step 2: Add to .env File

Add this line to your `.env` file (create it if it doesn't exist):

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
VITE_SUPABASE_URL=https://bdquuixqypkmbvvfymvm.supabase.co
```

### Step 3: Run the Script

```bash
node create-users.js
```

The script will:
- ✅ Create all 11 users in Supabase Auth
- ✅ Insert them into the `users` table with correct roles
- ✅ Handle existing users gracefully
- ✅ Show progress for each user

---

## ✅ Method 2: Using Supabase Dashboard (Manual)

If you prefer to do it manually:

### Step 1: Create Auth Users

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add User"** → **"Create new user"**
3. For each user:
   - **Email:** `marina@gmail.com`
   - **Password:** `marina123!`
   - ✅ **Auto Confirm User** (check this)
   - Click **"Create User"**
   - **Copy the UUID**

### Step 2: Insert into users Table

1. Go to **SQL Editor**
2. Run the SQL from `ADD_ALL_USERS.sql`
3. Replace all `REPLACE_WITH_XXX_UUID` with actual UUIDs

---

## ✅ Method 3: Using Supabase REST API (Advanced)

You can also use curl or any HTTP client:

```bash
# Replace YOUR_SERVICE_ROLE_KEY with your actual key
# Replace YOUR_PROJECT_URL with https://bdquuixqypkmbvvfymvm.supabase.co

curl -X POST 'https://bdquuixqypkmbvvfymvm.supabase.co/auth/v1/admin/users' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "marina@gmail.com",
    "password": "marina123!",
    "email_confirm": true,
    "user_metadata": {
      "name": "Marina",
      "role": "admin"
    }
  }'
```

Then insert into users table using SQL.

---

## 🎯 Recommended: Use Method 1 (Node.js Script)

It's the fastest and handles everything automatically!

---

## ✅ Verify Users Were Created

Run this SQL in Supabase SQL Editor:

```sql
SELECT 
  name,
  email,
  role,
  created_at
FROM users
WHERE email IN (
  'marina@gmail.com',
  'mariam@gmail.com',
  'toka@gmail.com',
  'shrouq@gmail.com',
  'hagar@gmail.com',
  'ahmed@gmail.com',
  'mohamed@gmail.com',
  'salah@gmail.com',
  'emad@gmail.com',
  'test1@gmail.com',
  'test2@gmail.com'
)
ORDER BY role, name;
```

You should see all 11 users! 🎉

