-- add-storage-policies.sql
-- Add storage policies for existing buckets
-- Run this in Supabase SQL Editor AFTER creating the buckets via the dashboard

-- ========================================
-- Background Images Bucket Policies
-- ========================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public reads from background-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to background-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from background-images" ON storage.objects;

-- Allow public reads
CREATE POLICY "Allow public reads from background-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'background-images');

-- Allow public uploads
CREATE POLICY "Allow public uploads to background-images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'background-images');

-- Allow public deletes
CREATE POLICY "Allow public deletes from background-images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'background-images');

-- ========================================
-- Media Files Bucket Policies
-- ========================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public reads from media-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to media-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from media-files" ON storage.objects;

-- Allow public reads
CREATE POLICY "Allow public reads from media-files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media-files');

-- Allow public uploads
CREATE POLICY "Allow public uploads to media-files"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'media-files');

-- Allow public deletes
CREATE POLICY "Allow public deletes from media-files"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'media-files');

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Storage policies created successfully for background-images and media-files buckets';
END $$;
