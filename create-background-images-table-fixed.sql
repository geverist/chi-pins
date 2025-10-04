-- create-background-images-table.sql
-- Background images for photo capture
-- Run this SQL in Supabase SQL Editor

-- Create background_images table
CREATE TABLE IF NOT EXISTS background_images (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for active images ordered by sort_order
CREATE INDEX IF NOT EXISTS idx_background_images_active_sort
  ON background_images(active, sort_order)
  WHERE active = true;

-- Enable Row Level Security
ALTER TABLE background_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public reads of active backgrounds" ON background_images;
DROP POLICY IF EXISTS "Allow authenticated modifications" ON background_images;

-- Allow public reads for active images
CREATE POLICY "Allow public reads of active backgrounds" ON background_images
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- Allow authenticated full access (for admin)
CREATE POLICY "Allow authenticated modifications" ON background_images
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for background images
INSERT INTO storage.buckets (id, name, public)
VALUES ('background-images', 'background-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for background images bucket
CREATE POLICY "Allow public reads from background-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'background-images');

CREATE POLICY "Allow public uploads to background-images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'background-images');

CREATE POLICY "Allow public deletes from background-images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'background-images');

-- Comment for documentation
COMMENT ON TABLE background_images IS 'Background images for photo capture with carousel selection';

-- NOTE: If the bucket creation fails with "bucket not found", you need to:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New bucket"
-- 3. Name: "background-images"
-- 4. Set "Public bucket" to ON
-- 5. Click "Create bucket"
-- 6. Then re-run the storage policy statements above
