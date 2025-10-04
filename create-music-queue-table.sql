-- Create music_queue table for shared jukebox queue across devices
-- Run this in Supabase SQL Editor

-- Queue table stores the current queue of tracks
CREATE TABLE IF NOT EXISTS music_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position INTEGER NOT NULL,
  track_url TEXT NOT NULL,
  track_title TEXT NOT NULL,
  track_artist TEXT,
  track_album TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_position UNIQUE (position)
);

CREATE INDEX IF NOT EXISTS idx_music_queue_position ON music_queue(position ASC);

-- Current playback state table (single row)
CREATE TABLE IF NOT EXISTS music_playback_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  current_track_url TEXT,
  current_track_title TEXT,
  current_track_artist TEXT,
  current_track_album TEXT,
  is_playing BOOLEAN DEFAULT false,
  last_played_url TEXT,
  last_played_title TEXT,
  last_played_artist TEXT,
  last_played_album TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert initial row
INSERT INTO music_playback_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE music_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_playback_state ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can read
CREATE POLICY "Allow public read access to queue"
  ON music_queue
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to playback state"
  ON music_playback_state
  FOR SELECT
  TO public
  USING (true);

-- Policies: Anyone can insert/update/delete (for kiosk/mobile control)
CREATE POLICY "Allow public insert to queue"
  ON music_queue
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to queue"
  ON music_queue
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow public delete from queue"
  ON music_queue
  FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public update to playback state"
  ON music_playback_state
  FOR UPDATE
  TO public
  USING (true);

-- Comments
COMMENT ON TABLE music_queue IS 'Shared music queue for jukebox across all devices';
COMMENT ON TABLE music_playback_state IS 'Current playback state shared across all devices';
