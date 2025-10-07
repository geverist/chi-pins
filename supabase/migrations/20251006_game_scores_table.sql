-- Create game_scores table for leaderboards
CREATE TABLE IF NOT EXISTS game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game TEXT NOT NULL,
  initials TEXT NOT NULL CHECK (char_length(initials) = 3),
  score INTEGER NOT NULL,
  accuracy NUMERIC,
  time NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_scores_game ON game_scores(game);
CREATE INDEX IF NOT EXISTS idx_game_scores_score ON game_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_game_score ON game_scores(game, score DESC, created_at ASC);

-- Enable RLS (Row Level Security)
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read scores
CREATE POLICY "Public read access" ON game_scores
  FOR SELECT USING (true);

-- Policy: Anyone can insert their own scores
CREATE POLICY "Public insert access" ON game_scores
  FOR INSERT WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE game_scores IS 'Leaderboard scores for kiosk games';
