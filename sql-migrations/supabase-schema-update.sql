-- Add customer_feedback table for business comments/feedback
-- This is separate from the comments table which is for pin-specific comments

CREATE TABLE IF NOT EXISTS customer_feedback (
  id BIGSERIAL PRIMARY KEY,
  name TEXT DEFAULT 'Anonymous',
  contact TEXT,
  contact_type TEXT CHECK (contact_type IN ('email', 'phone')),
  comment TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Optional: link to a pin if feedback is about a specific visit
  related_pin_id BIGINT,

  -- For tracking and preventing spam
  user_ip TEXT,
  user_agent TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_feedback_created_at ON customer_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_rating ON customer_feedback (rating);

-- Enable RLS
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Customer feedback is viewable by authenticated users only" ON customer_feedback;
DROP POLICY IF EXISTS "Anyone can insert customer feedback" ON customer_feedback;

CREATE POLICY "Customer feedback is viewable by authenticated users only" ON customer_feedback
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can insert customer feedback" ON customer_feedback
  FOR INSERT WITH CHECK (true);

-- Add missing columns to media_files table
-- This migration adds all columns needed for media file uploads and Spotify integration
DO $$
BEGIN
  -- Core metadata columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_files' AND column_name = 'filename'
  ) THEN
    ALTER TABLE media_files ADD COLUMN filename TEXT NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_files' AND column_name = 'title'
  ) THEN
    ALTER TABLE media_files ADD COLUMN title TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_files' AND column_name = 'artist'
  ) THEN
    ALTER TABLE media_files ADD COLUMN artist TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_files' AND column_name = 'album'
  ) THEN
    ALTER TABLE media_files ADD COLUMN album TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_files' AND column_name = 'duration_seconds'
  ) THEN
    ALTER TABLE media_files ADD COLUMN duration_seconds INTEGER;
  END IF;

  -- File storage columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_files' AND column_name = 'file_size_bytes'
  ) THEN
    ALTER TABLE media_files ADD COLUMN file_size_bytes BIGINT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_files' AND column_name = 'storage_path'
  ) THEN
    ALTER TABLE media_files ADD COLUMN storage_path TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_files' AND column_name = 'mime_type'
  ) THEN
    ALTER TABLE media_files ADD COLUMN mime_type TEXT DEFAULT 'audio/mpeg';
  END IF;

  -- Source tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_files' AND column_name = 'music_source'
  ) THEN
    ALTER TABLE media_files ADD COLUMN music_source TEXT DEFAULT 'local';
  END IF;

  -- License columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_files' AND column_name = 'license_type'
  ) THEN
    ALTER TABLE media_files ADD COLUMN license_type TEXT DEFAULT 'uploaded';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_files' AND column_name = 'license_verified'
  ) THEN
    ALTER TABLE media_files ADD COLUMN license_verified BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_files' AND column_name = 'license_notes'
  ) THEN
    ALTER TABLE media_files ADD COLUMN license_notes TEXT;
  END IF;

  -- Spotify integration columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_files' AND column_name = 'spotify_track_id'
  ) THEN
    ALTER TABLE media_files ADD COLUMN spotify_track_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_files' AND column_name = 'spotify_track_uri'
  ) THEN
    ALTER TABLE media_files ADD COLUMN spotify_track_uri TEXT;
  END IF;

  -- Timestamps
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_files' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE media_files ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_files' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE media_files ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;
