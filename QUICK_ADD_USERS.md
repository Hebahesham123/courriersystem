# 🚀 Quick Guide: Add All Users

## 📋 Users to Create

### Admins (5):
- marina@gmail.com / marina123!
- mariam@gmail.com / mariam123!
- toka@gmail.com / toka123!
- shrouq@gmail.com / shrouq123!
- hagar@gmail.com / hagar123!

### Couriers (6):
- ahmed@gmail.com / ahmed123!
- mohamed@gmail.com / mohamed123!
- salah@gmail.com / salah123!
- emad@gmail.com / emad123!
- test1@gmail.com / test1123!
- test2@gmail.com / test2123!

---

## ✅ Step-by-Step Instructions

### Step 1: Create Auth Users (11 users)

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: `bdquuixqypkmbvvfymvm`
3. Go to **Authentication** → **Users**
4. Click **"Add User"** → **"Create new user"**

5. **For each user**, fill in:
   - **Email:** `marina@gmail.com` (use the email from the list above)
   - **Password:** `marina123!` (use the password from the list above)
   - ✅ **Auto Confirm User** (check this box)
   - Click **"Create User"**
   - **Copy the UUID** that appears (you'll need it)

6. **Repeat for all 11 users**

### Step 2: Insert into users Table

1. Go to **SQL Editor** in Supabase Dashboard
2. Click **"New Query"**
3. Copy the SQL below
4. **Replace all `REPLACE_WITH_XXX_UUID`** with the actual UUIDs you copied
5. Click **"Run"**

```sql
-- Admins
INSERT INTO users (id, email, role, name) VALUES
  ('REPLACE_WITH_MARINA_UUID', 'marina@gmail.com', 'admin', 'Marina'),
  ('REPLACE_WITH_MARIAM_UUID', 'mariam@gmail.com', 'admin', 'Mariam'),
  ('REPLACE_WITH_TOKA_UUID', 'toka@gmail.com', 'admin', 'Toka'),
  ('REPLACE_WITH_SHROUQ_UUID', 'shrouq@gmail.com', 'admin', 'Shrouq'),
  ('REPLACE_WITH_HAGAR_UUID', 'hagar@gmail.com', 'admin', 'Hagar')
ON CONFLICT (id) 
DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  name = EXCLUDED.name;

-- Couriers
INSERT INTO users (id, email, role, name) VALUES
  ('REPLACE_WITH_AHMED_UUID', 'ahmed@gmail.com', 'courier', 'Ahmed'),
  ('REPLACE_WITH_MOHAMED_UUID', 'mohamed@gmail.com', 'courier', 'Mohamed'),
  ('REPLACE_WITH_SALAH_UUID', 'salah@gmail.com', 'courier', 'Salah'),
  ('REPLACE_WITH_EMAD_UUID', 'emad@gmail.com', 'courier', 'Emad'),
  ('REPLACE_WITH_TEST1_UUID', 'test1@gmail.com', 'courier', 'Test1'),
  ('REPLACE_WITH_TEST2_UUID', 'test2@gmail.com', 'courier', 'Test2')
ON CONFLICT (id) 
DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  name = EXCLUDED.name;
```

### Step 3: Verify

Run this SQL to verify all users were added:

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

You should see all 11 users listed!

---

## 🎯 Quick Tips

- **UUID Format**: Looks like `12345678-1234-1234-1234-123456789abc`
- **Copy UUID**: Click on the user in Authentication → Users to see the UUID
- **If user already exists**: The SQL will update the existing record (safe to run multiple times)

---

## ✅ Done!

All users can now log in with:
- **Email:** `name@gmail.com`
- **Password:** `name123!`

