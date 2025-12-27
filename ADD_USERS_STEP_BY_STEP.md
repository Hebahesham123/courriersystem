# 👥 Add Users: Step-by-Step Guide

## 📋 Users to Add

### Admins (5 users):
- marina@gmail.com / marina123!
- mariam@gmail.com / mariam123!
- toka@gmail.com / toka123!
- shrouq@gmail.com / shrouq123!
- hagar@gmail.com / hagar123!

### Couriers (6 users):
- ahmed@gmail.com / ahmed123!
- mohamed@gmail.com / mohamed123!
- salah@gmail.com / salah123!
- emad@gmail.com / emad123!
- test1@gmail.com / test1123!
- test2@gmail.com / test2123!

---

## 🚀 Method 1: Using Supabase Dashboard (Easiest)

### Step 1: Create Users in Authentication

1. **Go to Supabase Dashboard** → **Authentication** → **Users**
2. **For each user**, click **"Add User"** → **"Create new user"**:
   - **Email:** `marina@gmail.com`
   - **Password:** `marina123!`
   - **Auto Confirm User:** ✅ (checked)
   - Click **"Create User"**
   - **Copy the User UUID** (you'll need it)

3. **Repeat for all 11 users**

### Step 2: Insert into users Table

After creating all users in Authentication, go to **SQL Editor** and run:

```sql
-- First, get all the UUIDs you copied from Authentication
-- Then replace REPLACE_WITH_XXX_UUID with actual UUIDs

-- Admins
INSERT INTO users (id, email, role, name) VALUES
  ('PASTE_MARINA_UUID_HERE', 'marina@gmail.com', 'admin', 'Marina'),
  ('PASTE_MARIAM_UUID_HERE', 'mariam@gmail.com', 'admin', 'Mariam'),
  ('PASTE_TOKA_UUID_HERE', 'toka@gmail.com', 'admin', 'Toka'),
  ('PASTE_SHROUQ_UUID_HERE', 'shrouq@gmail.com', 'admin', 'Shrouq'),
  ('PASTE_HAGAR_UUID_HERE', 'hagar@gmail.com', 'admin', 'Hagar')
ON CONFLICT (id) 
DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  name = EXCLUDED.name;

-- Couriers
INSERT INTO users (id, email, role, name) VALUES
  ('PASTE_AHMED_UUID_HERE', 'ahmed@gmail.com', 'courier', 'Ahmed'),
  ('PASTE_MOHAMED_UUID_HERE', 'mohamed@gmail.com', 'courier', 'Mohamed'),
  ('PASTE_SALAH_UUID_HERE', 'salah@gmail.com', 'courier', 'Salah'),
  ('PASTE_EMAD_UUID_HERE', 'emad@gmail.com', 'courier', 'Emad'),
  ('PASTE_TEST1_UUID_HERE', 'test1@gmail.com', 'courier', 'Test1'),
  ('PASTE_TEST2_UUID_HERE', 'test2@gmail.com', 'courier', 'Test2')
ON CONFLICT (id) 
DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  name = EXCLUDED.name;
```

---

## 🚀 Method 2: Using Supabase Admin API (Faster)

I can create a script that uses the Admin API to create all users at once. This requires your service role key.

### Step 1: Create Node.js Script

Create a file `create-users.js`:

```javascript
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const users = [
  // Admins
  { email: 'marina@gmail.com', password: 'marina123!', role: 'admin', name: 'Marina' },
  { email: 'mariam@gmail.com', password: 'mariam123!', role: 'admin', name: 'Mariam' },
  { email: 'toka@gmail.com', password: 'toka123!', role: 'admin', name: 'Toka' },
  { email: 'shrouq@gmail.com', password: 'shrouq123!', role: 'admin', name: 'Shrouq' },
  { email: 'hagar@gmail.com', password: 'hagar123!', role: 'admin', name: 'Hagar' },
  // Couriers
  { email: 'ahmed@gmail.com', password: 'ahmed123!', role: 'courier', name: 'Ahmed' },
  { email: 'mohamed@gmail.com', password: 'mohamed123!', role: 'courier', name: 'Mohamed' },
  { email: 'salah@gmail.com', password: 'salah123!', role: 'courier', name: 'Salah' },
  { email: 'emad@gmail.com', password: 'emad123!', role: 'courier', name: 'Emad' },
  { email: 'test1@gmail.com', password: 'test1123!', role: 'courier', name: 'Test1' },
  { email: 'test2@gmail.com', password: 'test2123!', role: 'courier', name: 'Test2' },
]

async function createUsers() {
  console.log('Creating users...\n')
  
  for (const user of users) {
    try {
      // Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`⚠️  ${user.email} already exists, skipping...`)
          // Get existing user
          const { data: existingUsers } = await supabase.auth.admin.listUsers()
          const existingUser = existingUsers.users.find(u => u.email === user.email)
          if (existingUser) {
            // Insert into users table
            const { error: insertError } = await supabase
              .from('users')
              .upsert({
                id: existingUser.id,
                email: user.email,
                role: user.role,
                name: user.name
              })
            
            if (insertError) {
              console.error(`❌ Error inserting ${user.email}:`, insertError.message)
            } else {
              console.log(`✅ ${user.name} (${user.role}) - linked to existing auth user`)
            }
          }
          continue
        }
        throw authError
      }

      if (!authUser.user) {
        throw new Error('No user returned')
      }

      // Insert into users table
      const { error: insertError } = await supabase
        .from('users')
        .upsert({
          id: authUser.user.id,
          email: user.email,
          role: user.role,
          name: user.name
        })

      if (insertError) {
        console.error(`❌ Error inserting ${user.email}:`, insertError.message)
      } else {
        console.log(`✅ Created ${user.name} (${user.role}) - ${user.email}`)
      }
    } catch (error) {
      console.error(`❌ Error creating ${user.email}:`, error.message)
    }
  }
  
  console.log('\n✅ Done!')
}

createUsers()
```

### Step 2: Run the Script

```bash
node create-users.js
```

---

## ✅ Verify Users

After creating users, verify they were added:

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

---

## 🎯 Quick Summary

**Method 1 (Dashboard):**
1. Create 11 users in Authentication → Users
2. Copy UUIDs
3. Run SQL to insert into users table

**Method 2 (Script):**
1. Run `create-users.js` script
2. Done! (creates both auth users and database records)

Choose the method you prefer! 🚀

