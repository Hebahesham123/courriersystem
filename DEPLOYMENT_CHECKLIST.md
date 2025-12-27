# 🚀 Deployment Checklist for Supabase Integration

## ✅ Configuration Files Updated
- [x] `supabase-config.js` - Updated with your real Supabase credentials
- [x] `shopify_request_form.html` - Updated with fallback configuration
- [x] `src/lib/supabase.ts` - Updated with fallback configuration

## 🔧 Database Setup Required (Run in Supabase SQL Editor)

### 1. Create Requests Table
```sql
-- Run database_schema.sql in Supabase SQL Editor
```

### 2. Create Storage Bucket
```sql
-- Run supabase_storage_setup.sql in Supabase SQL Editor
```

## 📁 Files to Deploy
- [ ] `shopify_request_form.html` (updated)
- [ ] `supabase-config.js` (with your credentials)
- [ ] `database_schema.sql` (run in Supabase)
- [ ] `supabase_storage_setup.sql` (run in Supabase)
- [ ] All React app files (src/, package.json, etc.)

## 🧪 Testing Steps After Deployment

### 1. Test Shopify Form
1. Open the form on your domain
2. Check browser console for:
   - ✅ Supabase configuration loaded successfully
   - ✅ Supabase connection successful
3. Submit a test request with image/video
4. Check if success message appears

### 2. Test Admin Dashboard
1. Login to admin dashboard
2. Go to Customer Requests section
3. Check if your test request appears
4. Verify file uploads are visible

### 3. Test File Storage
1. Check Supabase Storage dashboard
2. Look for `uploads/requests/images/` folder
3. Look for `uploads/requests/videos/` folder
4. Verify uploaded files are there

## 🚨 Common Issues & Solutions

### "SUPABASE_CONFIG is not defined"
- ✅ **FIXED** - Added fallback configuration
- ✅ **FIXED** - Added configuration validation

### Form not submitting
- Check browser console for errors
- Verify Supabase credentials are correct
- Ensure database schema is set up

### Files not uploading
- Check if storage bucket 'uploads' exists
- Verify storage policies are set correctly
- Check file size limits (5MB for images, 50MB for videos)

## 🔑 Your Supabase Credentials
- **URL**: `https://uxqeabqinastxukekqin.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 📋 Final Steps
1. ✅ Update configuration files (DONE)
2. 🔄 Run database scripts in Supabase
3. 🚀 Deploy to your domain
4. 🧪 Test the integration
5. 🎉 Enjoy real-time customer requests!

## 📞 Support
If you encounter issues:
1. Check browser console for error messages
2. Verify Supabase project is active
3. Check database and storage setup
4. Ensure all files are deployed correctly
