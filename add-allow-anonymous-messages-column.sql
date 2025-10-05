-- Add allow_anonymous_messages column to pins table
-- This column controls whether the pin owner allows anonymous messages from visitors

ALTER TABLE pins
ADD COLUMN IF NOT EXISTS allow_anonymous_messages BOOLEAN DEFAULT false;

-- Add a comment explaining the column
COMMENT ON COLUMN pins.allow_anonymous_messages IS 'Whether the pin owner allows receiving anonymous messages from other users';
