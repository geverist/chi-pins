-- Add loyalty_email column to pins table for anonymous messaging via email

ALTER TABLE pins
ADD COLUMN IF NOT EXISTS loyalty_email TEXT;

COMMENT ON COLUMN pins.loyalty_email IS 'Email address for receiving anonymous messages (optional)';
