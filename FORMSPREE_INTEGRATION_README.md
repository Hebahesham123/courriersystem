# Formspree Integration with Database

This setup integrates Formspree form submissions with your Supabase database and admin system.

## 🚀 Quick Start

### 1. Start the Server

```bash
# Install dependencies (if not already installed)
npm install

# Start the server
npm run server
```

The server will run on `http://localhost:3001`

### 2. Environment Variables

Create a `.env` file in your project root with:

```env
# Server Configuration
PORT=3001

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Formspree Configuration (optional)
FORMSPREE_ACCESS_TOKEN=your_formspree_access_token_here
```

**Important:** You need the `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) for the server to write to the database.

### 3. Formspree Setup (Free Plan Compatible)

**No webhook setup required!** This solution works with free Formspree plans.

1. **Verify your form ID**: Make sure your form ID is correct in `server/formspree-sync.js`
2. **Optional**: Get an access token from Formspree for enhanced API access:
   - Go to Formspree Dashboard → Settings → API
   - Copy your access token (optional, but recommended)
   - Add to `.env` file as `FORMSPREE_ACCESS_TOKEN`

## 🔧 How It Works

### Smart Polling System (Free Plan Compatible)

Since Formspree webhooks require a Pro plan, this solution uses an intelligent polling system:

1. **Form Submission**: Users submit directly to Formspree
2. **Automatic Sync**: Server polls Formspree every 2 minutes for new submissions
3. **Database Storage**: New submissions are automatically saved to your database
4. **Real-time Admin**: All submissions appear in your admin interface immediately after sync

### Benefits of This Approach

- ✅ **Works with free Formspree plans**
- ✅ **No data loss** - all submissions are captured
- ✅ **Automatic sync** every 2 minutes
- ✅ **Duplicate prevention** - smart detection of existing submissions
- ✅ **Real-time monitoring** - admin interface shows sync status

### File Handling

- Images and videos are processed by the server
- Files are converted to base64 and stored in the database
- **Note**: For production, consider using cloud storage (AWS S3, Supabase Storage, etc.)

## 📁 File Structure

```
project/
├── server/
│   ├── index.js                 # Express server with sync endpoints
│   ├── formspree-sync.js        # Formspree polling service
│   └── formspree-monitor.html   # Sync monitoring interface
├── shopify_request_form.html    # Updated form (Formspree only)
├── src/
│   └── components/Admin/
│       └── RequestsManagement.tsx  # Admin interface for managing requests
└── database_schema.sql          # Database schema for requests
```

## 🌐 API Endpoints

### Server Endpoints

- `GET /health` - Health check with sync status
- `POST /api/submit-request` - Direct form submission
- `GET /api/requests` - Get all requests
- `PUT /api/requests/:id` - Update request
- `POST /api/requests/:id/notes` - Add note to request

### Formspree Sync Control

- `GET /api/formspree/status` - Get sync service status
- `POST /api/formspree/sync` - Trigger manual sync
- `POST /api/formspree/start` - Start sync service
- `POST /api/formspree/stop` - Stop sync service

### Formspree Integration

- **Form Submission**: Direct to `https://formspree.io/f/xzzvydeg`
- **Automatic Sync**: Every 2 minutes via polling system
- **Monitor Interface**: `server/formspree-monitor.html`

## 🗄️ Database Integration

### Requests Table

The form submissions are automatically saved to your `requests` table with:

- `created_by: 'user:formspree'` (for webhook submissions)
- `created_by: 'user:direct'` (for direct server submissions)
- `status: 'pending'` (default)
- File attachments as base64 strings

### Admin Management

All form submissions appear in your admin interface:
- View request details
- Update status (pending → process → approved → cancelled)
- Assign to team members
- Add notes and comments
- Bulk operations

## 🔒 Security Considerations

1. **Service Role Key**: Keep your `SUPABASE_SERVICE_ROLE_KEY` secure
2. **CORS**: Server is configured to accept requests from your domain
3. **File Uploads**: Implement file size and type validation
4. **Rate Limiting**: Consider adding rate limiting for production

## 🚀 Production Deployment

### 1. Deploy Server

Deploy the Express server to:
- Heroku
- DigitalOcean
- AWS EC2
- Any Node.js hosting platform

### 2. Update Webhook URL

Change Formspree webhook from:
```
http://localhost:3001/webhook/formspree
```

To:
```
https://yourdomain.com/webhook/formspree
```

### 3. Update Form

Change the form submission URL from:
```javascript
http://localhost:3001/api/submit-request
```

To:
```javascript
https://yourdomain.com/api/submit-request
```

### 4. Environment Variables

Set production environment variables in your hosting platform.

## 🐛 Troubleshooting

### Common Issues

1. **"Failed to save to database"**
   - Check if server is running
   - Verify Supabase credentials
   - Check database permissions

2. **"Server not available"**
   - Server is not running
   - Wrong port number
   - Firewall blocking connection

3. **Formspree errors**
   - Check Formspree form ID
   - Verify webhook configuration
   - Check Formspree dashboard for errors

### Debug Mode

Enable debug logging by adding to your server:

```javascript
console.log('Request body:', req.body);
console.log('Files:', req.files);
```

## 📊 Monitoring

### Server Health

Check server status:
```bash
curl http://localhost:3001/health
```

### Database Queries

Monitor database activity in Supabase dashboard:
- Go to SQL Editor
- Check recent queries
- Monitor table growth

### Formspree Analytics

- View submission statistics in Formspree dashboard
- Check webhook delivery status
- Monitor email delivery rates

## 🔄 Updates and Maintenance

### Regular Tasks

1. **Database Cleanup**: Archive old requests
2. **File Storage**: Move from base64 to cloud storage
3. **Security Updates**: Keep dependencies updated
4. **Backup**: Regular database backups

### Scaling Considerations

- Implement Redis for session management
- Add load balancing for multiple server instances
- Use CDN for file storage
- Implement database connection pooling

## 📞 Support

For issues with:
- **Server**: Check server logs and environment variables
- **Database**: Verify Supabase configuration and permissions
- **Formspree**: Check webhook settings and form configuration
- **Form**: Test with browser developer tools

## 🎯 Next Steps

1. **Test the integration** with sample form submissions
2. **Customize the admin interface** for your specific needs
3. **Implement file storage** for production use
4. **Add email notifications** for new requests
5. **Set up automated testing** for the webhook endpoints
