-- Create media_files table for MP3 uploads
-- Stores metadata about uploaded media files stored in Supabase Storage

CREATE TABLE IF NOT EXISTS media_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  duration_seconds INTEGER,
  file_size_bytes INTEGER,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT DEFAULT 'audio/mpeg',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to media_files" ON media_files;
DROP POLICY IF EXISTS "Allow public insert access to media_files" ON media_files;
DROP POLICY IF EXISTS "Allow public delete access to media_files" ON media_files;
DROP POLICY IF EXISTS "Allow public update access to media_files" ON media_files;

-- Allow anyone to read media files (for jukebox playback)
CREATE POLICY "Allow public read access to media_files"
  ON media_files
  FOR SELECT
  TO anon, authenticated, public
  USING (true);

-- Allow anyone to insert media files (for kiosk admin uploads)
CREATE POLICY "Allow public insert access to media_files"
  ON media_files
  FOR INSERT
  TO anon, authenticated, public
  WITH CHECK (true);

-- Allow anyone to update media files (for metadata edits)
CREATE POLICY "Allow public update access to media_files"
  ON media_files
  FOR UPDATE
  TO anon, authenticated, public
  USING (true)
  WITH CHECK (true);

-- Allow anyone to delete media files (for admin panel management)
CREATE POLICY "Allow public delete access to media_files"
  ON media_files
  FOR DELETE
  TO anon, authenticated, public
  USING (true);

-- Create index on storage_path for faster lookups
CREATE INDEX IF NOT EXISTS idx_media_files_storage_path ON media_files(storage_path);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_media_files_created_at ON media_files(created_at DESC);

-- IMPORTANT: After running this SQL, you MUST also create the storage bucket:
--
-- Option 1: Via Supabase Dashboard (Easiest)
-- 1. Go to Storage in Supabase dashboard
-- 2. Click "New bucket"
-- 3. Name: "media-files"
-- 4. Set "Public bucket" to ON
-- 5. Click "Create bucket"
--
-- Option 2: Via SQL (run this in Supabase SQL editor)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('media-files', 'media-files', true)
-- ON CONFLICT (id) DO NOTHING;
--
-- Then set storage policies (run in SQL editor):
-- CREATE POLICY "Allow public uploads to media-files"
-- ON storage.objects FOR INSERT
-- TO public
-- WITH CHECK (bucket_id = 'media-files');
--
-- CREATE POLICY "Allow public reads from media-files"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'media-files');
--
-- CREATE POLICY "Allow public deletes from media-files"
-- ON storage.objects FOR DELETE
-- TO public
-- USING (bucket_id = 'media-files');
