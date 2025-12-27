# 👤 Add User to Database

## User ID to Add
`8ee68c92-af14-4f93-aad9-d1c5444319c2`

## Steps to Add User

### Option 1: Quick SQL (Recommended)

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: `bdquuixqypkmbvvfymvm`
3. **Open SQL Editor**: Click "SQL Editor" → "New Query"
4. **Copy and paste this SQL** (update the values first):

```sql
INSERT INTO users (id, email, role, name) 
VALUES (
  '8ee68c92-af14-4f93-aad9-d1c5444319c2',
  'user@example.com',  -- ⚠️ CHANGE: Replace with actual email
  'admin',             -- ⚠️ CHANGE: 'admin' or 'courier'
  'User Name'          -- ⚠️ CHANGE: Replace with actual name
)
ON CONFLICT (id) 
DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  name = EXCLUDED.name;
```

5. **Update the values**:
   - Replace `'user@example.com'` with the actual email
   - Replace `'admin'` with `'admin'` or `'courier'` (choose one)
   - Replace `'User Name'` with the actual name
6. **Click "Run"**

### Option 2: Use the SQL File

1. Open `add_user.sql` in this project
2. Update the email, role, and name
3. Copy and paste into Supabase SQL Editor
4. Run it

## Verify User Was Added

After running the SQL, verify it worked:

```sql
SELECT * FROM users WHERE id = '8ee68c92-af14-4f93-aad9-d1c5444319c2';
```

You should see the user record.

## Important Notes

- **The user must exist in Supabase Authentication first**
  - Go to: Authentication → Users
  - Make sure this UUID exists there
  - If not, create the user in Authentication first

- **Role Options**:
  - `'admin'` - Full access to all features
  - `'courier'` - Limited access, can only see assigned orders

- **If user already exists**: The `ON CONFLICT` clause will update the existing record

## Need Help?

If you get an error:
- **"User does not exist"**: Create the user in Authentication → Users first
- **"Foreign key constraint"**: Make sure the UUID matches exactly
- **"Permission denied"**: Check that you're running as an admin user

