# Troubleshooting Note Image Issues

## Problem: Admin can upload images but can't see or open them

## Step-by-Step Troubleshooting

### 1. **Check Database Schema** 🔍
First, verify that the `image_url` column exists in the `request_notes` table:

```sql
-- Run this in Supabase SQL editor
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'request_notes' 
AND column_name = 'image_url';
```

**Expected Result**: Should show `image_url` column with `TEXT` data type.

**If missing**: Run the `add_image_to_notes.sql` script.

### 2. **Check Console Logs** 📝
Open browser developer tools (F12) and look for these console messages:

- `"Note saved successfully with image_url: [URL]"`
- `"Fetched notes: [data]"`
- `"Notes with images: [filtered data]"`
- `"Rendering note: [note data]"`

**Look for**: 
- ✅ Successful upload messages
- ❌ Error messages
- ❌ Missing `image_url` in note data

### 3. **Test Image Upload** 🧪
Use the test file to verify upload functionality:

1. Open `test-note-image-upload.html`
2. Enter note text and select an image
3. Click "Upload Note with Image"
4. Check if image appears in the preview section

**Expected Result**: Image should display below the note text.

### 4. **Check Storage Bucket** 🗂️
Verify that images are being uploaded to the correct path:

1. Go to Supabase Dashboard → Storage
2. Check `uploads` bucket
3. Look for `request_notes/images/` folder
4. Verify images exist with correct names

**Expected Result**: Images should be in `uploads/request_notes/images/` folder.

### 5. **Test Media Modal** 🖼️
Verify the media modal works with other images:

1. Go to admin dashboard
2. Look for requests with images in "Attachments" column
3. Click on image thumbnails
4. Check if media modal opens

**Expected Result**: Media modal should open and display images.

### 6. **Check Network Tab** 🌐
In browser developer tools, check the Network tab:

1. Add a note with image
2. Look for upload requests to Supabase
3. Check if image URLs are returned
4. Verify image URLs are accessible

**Expected Result**: 
- ✅ Upload request succeeds (200 status)
- ✅ Image URL is returned
- ✅ Image URL loads successfully

## Common Issues & Solutions

### Issue 1: "image_url column doesn't exist"
**Solution**: Run the SQL script:
```sql
ALTER TABLE request_notes ADD COLUMN IF NOT EXISTS image_url TEXT;
```

### Issue 2: "Images upload but don't display"
**Possible Causes**:
- Database not refreshed after upload
- Image URL not saved correctly
- Display logic not working

**Solutions**:
1. Refresh the page after adding note
2. Check console for error messages
3. Verify `image_url` in database

### Issue 3: "Media modal doesn't open"
**Possible Causes**:
- JavaScript errors
- Modal state not updating
- Click handlers not working

**Solutions**:
1. Check browser console for errors
2. Verify `openMediaModal` function is called
3. Check if `showMediaModal` state changes

### Issue 4: "Images load but are broken"
**Possible Causes**:
- Incorrect storage path
- Storage permissions
- CORS issues

**Solutions**:
1. Verify storage bucket permissions
2. Check image URLs in browser
3. Test direct image access

## Debug Commands

Add these to your code temporarily for debugging:

```typescript
// In addNote function
console.log('Note data being saved:', {
  request_id: selectedRequest.id,
  note: newNote,
  author: 'admin',
  image_url: noteImageUrl,
})

// In fetchNotes function
console.log('Raw notes data:', data)
console.log('Notes with images:', data?.filter(note => note.image_url))

// In note rendering
console.log('Rendering note:', note)
console.log('Note has image:', !!note.image_url)
console.log('Image URL:', note.image_url)
```

## Quick Fix Checklist

- [ ] Run `add_image_to_notes.sql` in Supabase
- [ ] Check browser console for errors
- [ ] Verify images exist in storage bucket
- [ ] Test with `test-note-image-upload.html`
- [ ] Refresh admin dashboard after adding notes
- [ ] Check if `image_url` appears in database

## Still Having Issues?

If the problem persists:

1. **Share console logs** - Copy all console messages
2. **Share database query results** - Run the test SQL and share output
3. **Share storage bucket contents** - Screenshot of storage structure
4. **Test with different images** - Try JPEG, PNG, different sizes

## Expected Behavior

After fixing all issues:

1. ✅ Admin can select image when adding note
2. ✅ Image uploads successfully to Supabase storage
3. ✅ Note saves with `image_url` in database
4. ✅ Note displays with blue "📷 Image" badge
5. ✅ Image thumbnail appears below note text
6. ✅ Clicking image opens full-size media modal
7. ✅ Media modal displays image correctly
8. ✅ ESC key and click outside close modal
