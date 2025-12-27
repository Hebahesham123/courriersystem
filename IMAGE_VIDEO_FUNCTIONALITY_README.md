# Image and Video Functionality for Customer Requests

## Overview
This document describes the implementation of image and video upload and display functionality for the customer requests system. Users can now attach images and videos to their requests, and administrators can view them in the dashboard.

## Features Implemented

### 1. User Form Uploads
- **Image Upload**: Supports JPEG, PNG, GIF, and WebP formats (max 5MB)
- **Video Upload**: Supports MP4, WebM, OGG, and AVI formats (max 50MB)
- **File Validation**: Client-side validation for file type and size
- **Preview**: Users can see selected files before submission
- **Automatic Upload**: Files are uploaded to Supabase storage before form submission

### 2. Admin Dashboard Display
- **Attachments Column**: New column in the requests table showing image/video previews
- **Thumbnail Previews**: Small previews (12x12) with hover effects
- **Click to View**: Click on thumbnails to open full-size media modal
- **Media Modal**: Full-screen modal for viewing images and videos
- **Keyboard Support**: ESC key to close modal
- **Click Outside**: Click outside media content to close modal

### 3. Enhanced Detail Modal
- **Larger Previews**: Images and videos displayed at 32 height in detail view
- **View Full Size Button**: Dedicated button to open media in full screen
- **File Replacement**: Admins can upload new files to replace existing ones
- **Better Layout**: Improved spacing and organization of media controls

### 4. Note Image Support
- **Image Upload**: Admins can attach images when adding notes to requests
- **Note Image Display**: Images are shown as thumbnails below note text
- **Full-Size Viewing**: Click on note images to open in media modal
- **Image Management**: Easy removal of selected images before posting notes

## Technical Implementation

### File Upload Process
1. User selects file in form
2. File is validated (type, size)
3. File is uploaded to Supabase storage bucket `uploads/requests/images/` or `uploads/requests/videos/`
4. Public URL is generated and stored in database
5. Request is submitted with file URLs

### Storage Structure
```
uploads/
├── requests/
│   ├── images/
│   │   ├── timestamp_randomname.jpg
│   │   └── timestamp_randomname.png
│   └── videos/
│       ├── timestamp_randomname.mp4
│       └── timestamp_randomname.webm
└── request_notes/
    └── images/
        ├── timestamp_randomname.jpg
        └── timestamp_randomname.png
```

### Database Schema
The `requests` table includes:
- `image_url`: TEXT field for image file URLs
- `video_url`: TEXT field for video file URLs

The `request_notes` table includes:
- `image_url`: TEXT field for note image file URLs (newly added)

### Security
- Files are stored in public bucket for easy access
- File names include timestamps and random strings to prevent conflicts
- File type validation on both client and server side
- Size limits enforced to prevent abuse

## Usage Instructions

### For Users
1. Fill out the request form
2. Click on the photo or video upload area
3. Select your file (ensure it meets size and format requirements)
4. Review the preview
5. Submit the form

### For Administrators
1. View requests in the admin dashboard
2. See attachment thumbnails in the "Attachments" column
3. Click on thumbnails to view full-size media
4. Use the detail modal to see larger previews and manage files
5. Click "View Full Size" buttons to open media in full screen
6. **Add notes with images**: When adding notes, use the image upload field below the note text
7. **View note images**: Note images appear as thumbnails below the note text and can be clicked for full-size viewing

## File Requirements

### Images
- **Formats**: JPEG, PNG, GIF, WebP
- **Max Size**: 5MB
- **Recommended**: JPEG for photos, PNG for graphics with transparency

### Videos
- **Formats**: MP4, WebM, OGG, AVI
- **Max Size**: 50MB
- **Recommended**: MP4 for best compatibility

## Troubleshooting

### Common Issues
1. **File too large**: Ensure files are under size limits
2. **Invalid format**: Use supported file types only
3. **Upload fails**: Check internet connection and try again
4. **Images not displaying**: Verify Supabase storage bucket permissions

### Testing
Use the `test-image-upload.html` file to test file upload functionality independently.

## Future Enhancements
- Image compression for large files
- Video thumbnail generation
- Drag and drop file upload
- Multiple file uploads per request
- File deletion and management tools
- Image editing capabilities

## Dependencies
- Supabase Storage for file hosting
- Supabase JavaScript client for uploads
- React components for admin interface
- Tailwind CSS for styling

## Configuration
Ensure the following Supabase setup is complete:
1. Storage bucket `uploads` created and public
2. Storage policies allow authenticated uploads
3. Database table includes `image_url` and `video_url` columns
4. **Database table `request_notes` includes `image_url` column** (run `add_image_to_notes.sql`)
5. Proper CORS configuration for file access
