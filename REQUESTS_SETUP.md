# Customer Requests System Setup Guide

## Overview
This system allows customers to submit requests through a form (Shopify → Formspree → Supabase) and admins to manage these requests through a dedicated dashboard.

## Features
- **Customer Request Form**: Collects name, email, phone, comment, and optional image/video attachments
- **Admin Dashboard**: View, filter, search, and manage all requests (English interface)
- **Request Assignment**: Assign requests to team members (Toka, Marina, Shrouq, Mariam)
- **Status Management**: Track request lifecycle (pending → process → approved/cancelled)
- **Notes System**: Add internal notes and track activity
- **Manual Creation**: Admins can create requests manually for offline submissions

## Database Setup

### 1. Run the SQL Schema
Copy and paste the contents of `database_schema.sql` into your Supabase SQL editor and run it.

This will create:
- `requests` table: Stores customer request information
- `request_notes` table: Stores internal notes for each request
- Indexes for performance optimization
- Sample data for testing
- Row Level Security (RLS) policies

### 2. Verify Tables Created
Check that both tables exist in your Supabase dashboard under Database → Tables.

## Formspree Integration

### 1. Form Configuration
Your form should post to: `https://formspree.io/f/xzzvydeg`

### 2. Ready-to-Use Form
I've created a complete HTML form (`shopify_request_form.html`) that you can embed in your Shopify store. This form includes:
- All required fields (name, email, phone, comment)
- **Direct file uploads** from device gallery/camera (no URLs needed)
- **Mobile-optimized** with camera and gallery options
- **Image support**: JPG, PNG, GIF, WebP (max 10MB)
- **Video support**: MP4, MOV, AVI, WebM (max 50MB)
- Drag & drop functionality for desktop
- Modern, responsive design
- Form validation and error handling
- Success/error messages
- Loading states

### 3. Required Form Fields
```html
<input type="text" name="name" required>
<input type="email" name="email" required>
<input type="tel" name="phone" required>
<textarea name="comment" required></textarea>
<input type="file" name="image" accept="image/*">
<input type="file" name="video" accept="video/*">
```

### 3. Webhook Setup
Configure Formspree to send webhooks to your Supabase Edge Function URL when forms are submitted.

## Supabase Edge Function (Optional)

If you want to automatically process form submissions, create an Edge Function that:
1. Receives webhook from Formspree
2. Validates the payload
3. Inserts new request into the `requests` table
4. Sets `status = 'pending'` and `created_by = 'user:formspree'`

## Admin Dashboard Usage

### Access
Navigate to `/admin/requests` in your application (admin role required).

### Features Available
1. **View All Requests**: See all customer requests in a table format
2. **Filter & Search**: Filter by status, assignee, or search by name/email/phone
3. **Request Details**: Click the eye icon to view/edit request details
4. **Status Updates**: Change request status from the detail view
5. **Assignment**: Assign requests to team members
6. **Add Notes**: Add internal notes for tracking progress
7. **Manual Creation**: Create new requests manually using the "إنشاء طلب جديد" button

### Request Statuses
- **pending**: New request, awaiting review
- **process**: Work in progress
- **approved**: Completed/accepted
- **cancelled**: Won't proceed

### Team Members
- Toka
- Marina
- Shrouq
- Mariam

## File Structure
```
src/components/Admin/
├── RequestsManagement.tsx    # Main requests management component
└── ... (other admin components)

src/components/Layout/
└── Sidebar.tsx              # Updated with requests menu item

src/App.tsx                  # Updated with requests route
```

## Database Schema

### requests Table
```sql
- id: UUID (Primary Key)
- name: VARCHAR(255) - Customer name
- email: VARCHAR(255) - Customer email
- phone: VARCHAR(50) - Customer phone
- comment: TEXT - Request description
- image_url: TEXT - Optional image attachment
- video_url: TEXT - Optional video attachment
- status: VARCHAR(20) - Request status
- assignee: VARCHAR(100) - Assigned team member
- created_by: VARCHAR(100) - Source of request
- created_at: TIMESTAMP - Creation date
- updated_at: TIMESTAMP - Last update date
```

### request_notes Table
```sql
- id: UUID (Primary Key)
- request_id: UUID - Reference to requests table
- note: TEXT - Note content
- author: VARCHAR(100) - Who added the note
- created_at: TIMESTAMP - Note creation date
```

## Security Features
- Row Level Security (RLS) enabled
- Only authenticated users can access
- Policies restrict access based on user role
- Automatic timestamp updates

## Testing
1. Run the SQL schema to create tables and sample data
2. Navigate to `/admin/requests` in your app
3. Verify sample requests are displayed
4. Test filtering, searching, and editing functionality
5. Test adding notes to requests
6. Test creating new requests manually

## Troubleshooting

### Common Issues
1. **Tables not created**: Ensure you're running SQL in the correct Supabase project
2. **Permission errors**: Check RLS policies and user authentication
3. **Component not loading**: Verify the route is properly added to App.tsx
4. **Data not displaying**: Check browser console for errors and verify database connection

### Debug Steps
1. Check browser console for JavaScript errors
2. Verify Supabase connection in browser network tab
3. Check Supabase logs for database errors
4. Verify user has admin role and is authenticated

## Next Steps
1. **Formspree Integration**: Set up your customer-facing form
2. **Edge Function**: Create automated webhook processing (optional)
3. **Notifications**: Add email/Slack notifications for new requests
4. **Reporting**: Create reports on request volume and processing times
5. **Customer Portal**: Allow customers to track their request status

## Support
For issues or questions, check:
1. Supabase documentation
2. React Router documentation
3. Browser developer tools
4. Supabase dashboard logs
