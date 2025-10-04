-- Add licensing compliance fields to media_files table
-- Run this in Supabase SQL Editor

-- Add new columns for licensing compliance
ALTER TABLE media_files
ADD COLUMN IF NOT EXISTS license_type TEXT DEFAULT 'uploaded',
ADD COLUMN IF NOT EXISTS license_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS license_notes TEXT,
ADD COLUMN IF NOT EXISTS spotify_track_id TEXT,
ADD COLUMN IF NOT EXISTS spotify_track_uri TEXT,
ADD COLUMN IF NOT EXISTS music_source TEXT DEFAULT 'local';

-- Add check constraint for music_source
ALTER TABLE media_files
DROP CONSTRAINT IF EXISTS valid_music_source;

ALTER TABLE media_files
ADD CONSTRAINT valid_music_source
CHECK (music_source IN ('local', 'spotify', 'apple', 'soundcloud'));

-- Add check constraint for license_type
ALTER TABLE media_files
DROP CONSTRAINT IF EXISTS valid_license_type;

ALTER TABLE media_files
ADD CONSTRAINT valid_license_type
CHECK (license_type IN ('uploaded', 'venue_licensed', 'royalty_free', 'creative_commons', 'streaming_api'));

-- Create index for Spotify lookups
CREATE INDEX IF NOT EXISTS idx_media_files_spotify_track_id ON media_files(spotify_track_id);
CREATE INDEX IF NOT EXISTS idx_media_files_music_source ON media_files(music_source);

-- Comments
COMMENT ON COLUMN media_files.license_type IS 'Type of license: uploaded (user responsibility), venue_licensed (venue has PRO licenses), royalty_free, creative_commons, streaming_api';
COMMENT ON COLUMN media_files.license_verified IS 'Whether licensing has been verified/confirmed';
COMMENT ON COLUMN media_files.license_notes IS 'Additional licensing information or restrictions';
COMMENT ON COLUMN media_files.music_source IS 'Source of music: local (uploaded file), spotify, apple, soundcloud';
COMMENT ON COLUMN media_files.spotify_track_id IS 'Spotify track ID if from Spotify API';
COMMENT ON COLUMN media_files.spotify_track_uri IS 'Spotify URI for playback (spotify:track:xxx)';
