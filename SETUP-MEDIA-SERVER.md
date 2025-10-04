# Media Server Setup Instructions

Follow these steps **in order** to set up the media server for MP3 uploads and playback.

## Step 1: Create Database Table

Run `create-media-files-table.sql` in Supabase SQL Editor.

This creates:
- `media_files` table to store MP3 metadata
- RLS policies for public access
- Indexes for performance

## Step 2: Create Storage Buckets

Go to **Supabase Dashboard > Storage** and create these buckets:

### Bucket 1: background-images
1. Click "New bucket"
2. Name: `background-images`
3. Set "Public bucket" to **ON**
4. Click "Create bucket"

### Bucket 2: media-files
1. Click "New bucket"
2. Name: `media-files`
3. Set "Public bucket" to **ON**
4. Click "Create bucket"

## Step 3: Add Storage Policies

Run `add-storage-policies.sql` in Supabase SQL Editor.

This adds RLS policies to allow:
- Public reads (file access)
- Public uploads (admin panel uploads)
- Public deletes (admin panel management)

## Step 4: Test Upload

1. Open your app
2. Access Admin Panel (tap footer 3x or add `?admin=1` to URL)
3. Go to **Media** tab
4. Click "Upload Audio File"
5. Select an MP3 file
6. Enter title and artist
7. Upload should succeed!

## Step 5: Test Playback

1. Open Jukebox from the header
2. You should see your uploaded tracks
3. Click play to test audio playback

---

## Troubleshooting

### "new row violates row-level security policy"
- Re-run `create-media-files-table.sql` to update RLS policies

### "bucket not found"
- Make sure you created both storage buckets in Step 2
- Bucket names must be exactly: `background-images` and `media-files`

### "Could not find the table 'public.media_files'"
- You skipped Step 1 - run `create-media-files-table.sql` first

### Upload succeeds but file doesn't appear
- Run `add-storage-policies.sql` to add storage bucket policies
- Check that buckets are set to "Public"
