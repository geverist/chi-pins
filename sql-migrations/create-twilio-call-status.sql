-- Create twilio_call_status table for tracking active Twilio voice bot calls
-- This table is updated via webhook from Twilio and listened to by CallBorderIndicator component

CREATE TABLE IF NOT EXISTS twilio_call_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'chicago-mikes',

  -- Call information
  call_sid TEXT NOT NULL,
  caller_number TEXT,
  call_status TEXT NOT NULL, -- 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled'
  is_active BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_twilio_call_status_active ON twilio_call_status(is_active, tenant_id);
CREATE INDEX IF NOT EXISTS idx_twilio_call_status_call_sid ON twilio_call_status(call_sid);

-- RLS policies
ALTER TABLE twilio_call_status ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for kiosk display)
CREATE POLICY "Allow public read access"
  ON twilio_call_status
  FOR SELECT
  TO public
  USING (true);

-- Allow service role to insert/update (for webhook endpoint)
CREATE POLICY "Allow service role full access"
  ON twilio_call_status
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_twilio_call_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_twilio_call_status_updated_at
  BEFORE UPDATE ON twilio_call_status
  FOR EACH ROW
  EXECUTE FUNCTION update_twilio_call_status_updated_at();

-- Insert a test record (you can delete this after testing)
INSERT INTO twilio_call_status (call_sid, caller_number, call_status, is_active)
VALUES ('test-call-sid-123', '+15551234567', 'in-progress', false);
