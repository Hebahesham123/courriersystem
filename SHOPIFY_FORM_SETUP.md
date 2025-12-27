# Shopify Form Setup for Supabase Integration

## Overview
The Shopify request form has been updated to submit directly to your Supabase database instead of Formspree. This means customer submissions will appear immediately in your admin dashboard.

## Setup Steps

### 1. Update Supabase Configuration
Edit `supabase-config.js` and replace the placeholder values:

```javascript
window.SUPABASE_CONFIG = {
    url: 'https://your-actual-project.supabase.co',     // Your Supabase project URL
    anonKey: 'your-actual-anon-key-here'               // Your Supabase anon key
};
```

**To find these values:**
1. Go to your Supabase project dashboard
2. Click on **Settings** > **API**
3. Copy the **Project URL**
4. Copy the **anon public** key

### 2. Run Database Setup
In your Supabase SQL editor, run:
1. `database_schema.sql` - Creates the requests table
2. `supabase_storage_setup.sql` - Creates storage bucket for file uploads

### 3. Test the Integration
1. Deploy your updated files to your domain
2. Submit a test request from the Shopify form
3. Check your admin dashboard to see if the request appears
4. Verify files are uploaded to Supabase storage

## What Happens Now

### ✅ **Before (Formspree):**
- Form submits to Formspree
- Data doesn't go to your database
- Files don't go to your storage
- You can't see submissions in your dashboard

### ✅ **After (Supabase):**
- Form submits directly to your Supabase database
- Data appears immediately in your admin dashboard
- Files are uploaded to your Supabase storage
- You can manage requests from your dashboard

## File Structure
```
shopify_request_form.html     # Updated form that submits to Supabase
supabase-config.js           # Configuration file (update with your credentials)
supabase_storage_setup.sql   # Storage setup script
database_schema.sql          # Database table creation script
```

## Troubleshooting

### Form Not Submitting
- Check browser console for errors
- Verify Supabase credentials are correct
- Ensure database schema is set up

### Files Not Uploading
- Check if storage bucket 'uploads' exists
- Verify storage policies are set correctly
- Check file size limits (5MB for images, 50MB for videos)

### Data Not Appearing in Dashboard
- Check if requests table exists
- Verify RLS policies are configured
- Check authentication setup

## Security Notes
- The anon key is safe to use in frontend code
- Row Level Security (RLS) protects your data
- File uploads are restricted by size and type
- Only authenticated users can access the admin dashboard
