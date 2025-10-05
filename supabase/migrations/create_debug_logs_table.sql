-- Create debug_logs table for remote logging
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

CREATE TABLE IF NOT EXISTS debug_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT,
  user_agent TEXT,
  url TEXT,
  logs JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_debug_logs_created_at ON debug_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debug_logs_session_id ON debug_logs(session_id);

-- Enable RLS (Row Level Security)
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert debug logs (for debugging purposes)
CREATE POLICY "Anyone can insert debug logs" ON debug_logs
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to read recent logs (for debugging purposes)
CREATE POLICY "Anyone can read debug logs" ON debug_logs
  FOR SELECT
  USING (true);
