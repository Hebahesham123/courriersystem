# 🗄️ Setting Up a New Database for Development

This guide will help you configure a **separate database** for development/testing without affecting your deployed production project.

## 📋 Step-by-Step Setup

### Step 1: Create a New Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in your project details:
   - **Name**: Choose a name (e.g., "courier-pro-dev")
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose the closest region
4. Click **"Create new project"**
5. Wait for the project to be set up (takes 1-2 minutes)

### Step 2: Get Your Database Credentials

1. In your **NEW** Supabase project dashboard, go to **Settings** → **API**
2. You'll need these three values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long JWT token)
   - **service_role** key (long JWT token - keep this secret!)

### Step 3: Set Up Your Environment Variables

1. **Create a `.env` file** in the project root (if it doesn't exist)
2. Copy the template from `.env.example` or use this format:

```env
# Your NEW Supabase Project URL
VITE_SUPABASE_URL=https://your-new-project.supabase.co

# Your NEW Supabase Anonymous Key
VITE_SUPABASE_ANON_KEY=your_new_anon_key_here

# Your NEW Supabase Service Role Key (keep secret!)
SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key_here

# Server Port
PORT=3001
```

3. **Replace the placeholder values** with your actual credentials from Step 2

### Step 4: Update HTML Configuration Files

For HTML files that can't use environment variables directly:

1. Open `supabase-config.js`
2. Update the values:
   ```javascript
   window.SUPABASE_CONFIG = {
       url: 'https://your-new-project.supabase.co',  // Your NEW project URL
       anonKey: 'your_new_anon_key_here'              // Your NEW anon key
   };
   ```

### Step 5: Set Up Your New Database Schema

1. Go to your **NEW** Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the `database_schema.sql` file from this project
4. Copy and paste the entire SQL script
5. Click **"Run"** to create all tables and schema

### Step 6: Verify Your Setup

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Start your backend server:**
   ```bash
   npm run server
   ```

3. **Test the connection:**
   - Open your app in the browser
   - Check the browser console for any errors
   - Try logging in or creating a test record

4. **Check server health:**
   - Visit: `http://localhost:3001/health`
   - Should show: `{"status":"OK","database":"Connected"}`

## ✅ Verification Checklist

- [ ] `.env` file created with new database credentials
- [ ] `supabase-config.js` updated with new credentials
- [ ] Database schema applied to new Supabase project
- [ ] Development server starts without errors
- [ ] Backend server connects to new database
- [ ] Can create/read data in the new database
- [ ] Production database remains untouched

## 🔒 Security Notes

- **Never commit `.env` file** to version control (it's already in `.gitignore`)
- **Never share your `service_role` key** - it has full database access
- The `anon` key is safe to use in client-side code
- Keep your production database credentials separate and secure

## 🎯 What This Achieves

✅ **Isolated Development**: Your changes won't affect production  
✅ **Safe Testing**: Experiment freely without risk  
✅ **Easy Switching**: Change databases by updating `.env`  
✅ **Production Safety**: Your deployed project continues using its own database

## 🆘 Troubleshooting

### "Missing Supabase environment variables" error
- Make sure `.env` file exists in the project root
- Check that variable names start with `VITE_` for client-side variables
- Restart your development server after creating/updating `.env`

### "Database connection failed" error
- Verify your credentials in `.env` are correct
- Check that your new Supabase project is active
- Ensure the database schema has been applied

### HTML files still using old database
- Make sure `supabase-config.js` is updated
- Clear browser cache and reload
- Check that `shopify_request_form.html` includes `supabase-config.js`

## 📝 Next Steps

After setting up your new database:

1. **Test all features** to ensure everything works
2. **Make your changes** safely in the development environment
3. **When ready for production**, you can:
   - Apply the same changes to production database
   - Or update production `.env` if you want to switch databases

---

**Remember**: Your production project will continue using its original database credentials (from deployment settings), so it won't be affected by these changes!

