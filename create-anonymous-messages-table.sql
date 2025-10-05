-- Create anonymous_messages table to track and rate-limit messages

CREATE TABLE IF NOT EXISTS anonymous_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_pin_slug TEXT NOT NULL,
  message TEXT NOT NULL,
  sender_contact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Index for rate limiting queries
  INDEX idx_anonymous_messages_pin_date (recipient_pin_slug, created_at)
);

-- Enable RLS
ALTER TABLE anonymous_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (send messages)
CREATE POLICY "Anyone can send anonymous messages"
  ON anonymous_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: No one can read messages (privacy)
CREATE POLICY "No one can read messages"
  ON anonymous_messages
  FOR SELECT
  TO anon, authenticated
  USING (false);

COMMENT ON TABLE anonymous_messages IS 'Tracks anonymous messages sent to pin owners for rate limiting';
