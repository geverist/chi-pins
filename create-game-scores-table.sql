-- Create game_scores table for leaderboards
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS game_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game TEXT NOT NULL,
  initials TEXT NOT NULL CHECK (char_length(initials) = 3),
  score INTEGER NOT NULL,
  accuracy DECIMAL(5,2),
  time DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes for performance
  CONSTRAINT valid_initials CHECK (initials ~ '^[A-Z0-9]{3}$')
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_game_scores_game ON game_scores(game);
CREATE INDEX IF NOT EXISTS idx_game_scores_score ON game_scores(game, score DESC, created_at ASC);

-- Enable Row Level Security
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read scores
CREATE POLICY "Allow public read access"
  ON game_scores
  FOR SELECT
  TO public
  USING (true);

-- Policy: Anyone can insert scores (but not update/delete)
CREATE POLICY "Allow public insert access"
  ON game_scores
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE game_scores IS 'Leaderboard scores for kiosk games';
