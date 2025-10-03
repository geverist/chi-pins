-- create-slug-keywords-table.sql
-- Run this SQL in Supabase SQL Editor

-- Create slug_keywords table
CREATE TABLE IF NOT EXISTS slug_keywords (
  id BIGSERIAL PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_slug_keywords_word ON slug_keywords(word);

-- Enable Row Level Security
ALTER TABLE slug_keywords ENABLE ROW LEVEL SECURITY;

-- Allow public reads
CREATE POLICY "Allow public reads" ON slug_keywords
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow authenticated inserts/updates (for admin use)
CREATE POLICY "Allow authenticated modifications" ON slug_keywords
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Comment for documentation
COMMENT ON TABLE slug_keywords IS 'Chicago-themed keywords for generating unique pin slugs';
