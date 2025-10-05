-- Complete setup for anonymous messaging feature
-- Run this entire script in Supabase SQL Editor

-- 1. Add allow_anonymous_messages column to pins table
ALTER TABLE pins
ADD COLUMN IF NOT EXISTS allow_anonymous_messages BOOLEAN DEFAULT false;

COMMENT ON COLUMN pins.allow_anonymous_messages IS 'Whether the pin owner allows receiving anonymous messages from other users';

-- 2. Add loyalty_email column to pins table (for email contact option)
ALTER TABLE pins
ADD COLUMN IF NOT EXISTS loyalty_email TEXT;

COMMENT ON COLUMN pins.loyalty_email IS 'Email address for loyalty program or anonymous message contact';

-- 3. Create anonymous_messages table for rate limiting
CREATE TABLE IF NOT EXISTS anonymous_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_pin_slug TEXT NOT NULL,
  message TEXT NOT NULL,
  sender_contact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_anonymous_messages_pin_date
  ON anonymous_messages (recipient_pin_slug, created_at);

-- 5. Enable RLS on anonymous_messages
ALTER TABLE anonymous_messages ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can send anonymous messages" ON anonymous_messages;
DROP POLICY IF EXISTS "No one can read messages" ON anonymous_messages;

-- 7. Create policy: Anyone can insert (send messages)
CREATE POLICY "Anyone can send anonymous messages"
  ON anonymous_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 8. Create policy: No one can read messages (privacy)
CREATE POLICY "No one can read messages"
  ON anonymous_messages
  FOR SELECT
  TO anon, authenticated
  USING (false);

-- 9. Add comment to table
COMMENT ON TABLE anonymous_messages IS 'Tracks anonymous messages sent to pin owners for rate limiting and privacy';

-- Verification queries (optional - comment out if not needed)
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'pins'
-- AND column_name IN ('allow_anonymous_messages', 'loyalty_email');

-- SELECT COUNT(*) as anonymous_message_count FROM anonymous_messages;
