# 🚀 Formspree Integration Setup Checklist

## ✅ Pre-Setup Requirements

- [ ] Node.js installed (v16 or higher)
- [ ] npm or yarn package manager
- [ ] Supabase project created
- [ ] Formspree account and form created
- [ ] Database schema applied to Supabase

## 🔧 Step 1: Environment Setup

### Create Environment File
- [ ] Create `.env` file in project root
- [ ] Add your Supabase URL: `VITE_SUPABASE_URL=your_url`
- [ ] Add your Supabase Service Role Key: `SUPABASE_SERVICE_ROLE_KEY=your_key`
- [ ] Set server port: `PORT=3001`

### Get Supabase Service Role Key
- [ ] Go to Supabase Dashboard → Settings → API
- [ ] Copy the "service_role" key (NOT the anon key)
- [ ] This key has admin privileges for database operations

## 📦 Step 2: Install Dependencies

- [ ] Run `npm install` to install all packages
- [ ] Verify `@supabase/supabase-js` is installed
- [ ] Verify `express`, `cors`, `multer` are installed

## 🗄️ Step 3: Database Setup

### Apply Database Schema
- [ ] Go to Supabase Dashboard → SQL Editor
- [ ] Copy and paste the contents of `database_schema.sql`
- [ ] Run the SQL script
- [ ] Verify tables are created: `requests`, `request_notes`
- [ ] Check that indexes are created
- [ ] Verify RLS policies are applied

### Test Database Connection
- [ ] Check that your admin interface can read from the database
- [ ] Verify the `RequestsManagement.tsx` component loads requests

## 🖥️ Step 4: Start the Server

### Option A: Using npm script
- [ ] Run `npm run server`
- [ ] Verify server starts on port 3001
- [ ] Check console for success messages

### Option B: Using startup scripts
- [ ] Windows: Double-click `start-server.bat`
- [ ] PowerShell: Run `.\start-server.ps1`

### Verify Server is Running
- [ ] Open browser to `http://localhost:3001/health`
- [ ] Should see: `{"status":"OK","timestamp":"..."}`

## 🧪 Step 5: Test the Integration

### Test Server Endpoints
- [ ] Run `node test-integration.js` to test all endpoints
- [ ] Verify form submission works: `POST /api/submit-request`
- [ ] Verify webhook endpoint works: `POST /webhook/formspree`
- [ ] Check database for test entries

### Test Form Submission
- [ ] Open `shopify_request_form.html` in browser
- [ ] Fill out and submit the form
- [ ] Verify success message appears
- [ ] Check database for new request entry
- [ ] Verify request appears in admin interface

## 🔗 Step 6: Formspree Sync Setup

### Configure Formspree Sync
- [ ] Verify form ID in `server/formspree-sync.js` (currently: `xzzvydeg`)
- [ ] Optional: Get Formspree access token for enhanced API access
- [ ] Add access token to `.env` file if obtained
- [ ] Start the server to begin automatic syncing

### Test Sync Integration
- [ ] Submit form through Formspree
- [ ] Wait up to 2 minutes for automatic sync
- [ ] Check server logs for sync activity
- [ ] Verify request appears in admin interface
- [ ] Use monitor interface to check sync status

## 📱 Step 7: Admin Interface Verification

### Check Request Management
- [ ] Open your React admin interface
- [ ] Navigate to Requests Management
- [ ] Verify new requests appear in the list
- [ ] Test request status updates
- [ ] Test assignee assignment
- [ ] Test adding notes to requests

### Verify Data Flow
- [ ] Form submission → Database → Admin Interface
- [ ] Formspree webhook → Database → Admin Interface
- [ ] Admin updates → Database → Real-time updates

## 🚀 Step 8: Production Deployment

### Deploy Server (Optional - for production use)
- [ ] Choose hosting platform (Heroku, DigitalOcean, AWS EC2, etc.)
- [ ] Set production environment variables
- [ ] Deploy server code
- [ ] Verify server is accessible

**Note:** This project is designed to run locally. Deployment is optional.

### Update URLs
- [ ] Change webhook URL from localhost to production domain
- [ ] Update form submission URL in HTML form
- [ ] Test production endpoints

### Security Review
- [ ] Verify CORS settings for production domain
- [ ] Check rate limiting is implemented
- [ ] Verify file upload restrictions
- [ ] Test authentication if implemented

## 🔍 Step 9: Monitoring & Maintenance

### Set Up Monitoring
- [ ] Monitor server logs for errors
- [ ] Check database performance
- [ ] Monitor webhook delivery rates
- [ ] Set up alerts for failures

### Regular Maintenance
- [ ] Archive old requests periodically
- [ ] Monitor database storage usage
- [ ] Update dependencies regularly
- [ ] Backup database regularly

## 🐛 Troubleshooting Common Issues

### Server Won't Start
- [ ] Check if port 3001 is already in use
- [ ] Verify environment variables are set
- [ ] Check Node.js version compatibility

### Database Connection Failed
- [ ] Verify Supabase URL is correct
- [ ] Check Service Role Key permissions
- [ ] Verify database schema is applied

### Form Submissions Not Saving
- [ ] Check server is running
- [ ] Verify database permissions
- [ ] Check server logs for errors

### Webhook Not Working
- [ ] Verify webhook URL is correct
- [ ] Check Formspree webhook settings
- [ ] Verify server endpoint is accessible

## 📞 Support Resources

- **Server Issues**: Check server console logs
- **Database Issues**: Supabase Dashboard → Logs
- **Formspree Issues**: Formspree Dashboard → Webhooks
- **Admin Interface**: React DevTools → Console

## 🎯 Success Criteria

- [ ] Form submissions save to database
- [ ] Formspree webhook delivers data to server
- [ ] Admin interface displays all requests
- [ ] Request management features work (status, assignee, notes)
- [ ] File uploads are processed correctly
- [ ] System works in both development and production

---

**🎉 Congratulations!** Your Formspree integration is now complete and ready for production use.
