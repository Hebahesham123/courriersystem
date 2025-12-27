# 👥 Create All Users in Supabase

## 🎯 Quick Start (Choose One Method)

### ✅ Method 1: PowerShell Script (Windows - Easiest!)

**No Node.js needed!**

1. **Get your Service Role Key:**
   - Go to: https://supabase.com/dashboard
   - Select project: `bdquuixqypkmbvvfymvm`
   - Go to: **Settings** → **API**
   - Copy the **service_role** key (click "Reveal")

2. **Run the script:**
   ```powershell
   .\create-users.ps1
   ```

3. **Paste your service role key when prompted**

**Done!** All 11 users will be created automatically! 🎉

---

### ✅ Method 2: Node.js Script

**Requires Node.js installed**

1. **Add to `.env` file:**
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   VITE_SUPABASE_URL=https://bdquuixqypkmbvvfymvm.supabase.co
   ```

2. **Run:**
   ```bash
   node create-users.js
   ```

   If the key is not in `.env`, the script will prompt you for it.

---

### ✅ Method 3: Manual (Supabase Dashboard)

See `QUICK_ADD_USERS.md` for step-by-step instructions.

---

## 📋 Users Being Created

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

## ✅ Verify Users

After running any method, verify in Supabase SQL Editor:

```sql
SELECT name, email, role, created_at
FROM users
WHERE email LIKE '%@gmail.com'
ORDER BY role, name;
```

---

## 🚀 Recommended: Use PowerShell Script (Method 1)

It's the fastest and works on Windows without any setup! 

Just run `.\create-users.ps1` and paste your service role key when asked.

