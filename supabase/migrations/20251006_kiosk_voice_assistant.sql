-- Kiosk Voice Assistant Configuration Table
-- Stores voice assistant settings for kiosk touchscreen interactions

CREATE TABLE IF NOT EXISTS kiosk_voice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  location_id TEXT,

  -- Voice configuration
  enabled BOOLEAN DEFAULT true,
  voice_provider TEXT DEFAULT 'Browser' CHECK (voice_provider IN ('Browser', 'ElevenLabs', 'Google', 'Amazon')),
  voice_id TEXT, -- ElevenLabs voice ID or provider-specific voice name
  voice_name TEXT, -- Display name (e.g., "Adam (Male)", "Alice (Female)")
  language TEXT DEFAULT 'en-US',

  -- Suggested prompts (array of strings)
  suggested_prompts JSONB DEFAULT '[]'::jsonb,

  -- Auto-generated based on enabled features
  auto_generate_prompts BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(tenant_id, location_id)
);

-- Enable RLS
ALTER TABLE kiosk_voice_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all users"
  ON kiosk_voice_settings FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON kiosk_voice_settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON kiosk_voice_settings FOR UPDATE
  USING (true);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_kiosk_voice_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kiosk_voice_settings_updated_at
  BEFORE UPDATE ON kiosk_voice_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_kiosk_voice_settings_updated_at();

-- Insert default settings for demo industries
INSERT INTO kiosk_voice_settings (tenant_id, location_id, suggested_prompts, voice_provider, voice_name)
VALUES
  ('demo-restaurant', 'demo-restaurant',
   '["What are today''s specials?", "Show me the menu", "I''d like to place an order", "What''s your most popular dish?", "Do you have gluten-free options?"]'::jsonb,
   'Browser', 'Google US English (Female)'),
  ('demo-medspa', 'demo-medspa',
   '["What treatments do you offer?", "Book me a facial appointment", "Show me before and after photos", "What are your prices?", "Do you have any specials?"]'::jsonb,
   'Browser', 'Google US English (Female)'),
  ('demo-auto', 'demo-auto',
   '["What''s my service status?", "Schedule an oil change", "Do you have a shuttle service?", "What are your hours?", "Show me your services"]'::jsonb,
   'Browser', 'Google US English (Male)'),
  ('demo-healthcare', 'demo-healthcare',
   '["Check in for my appointment", "What''s my wait time?", "Update my insurance", "Where is the pharmacy?", "Request prescription refill"]'::jsonb,
   'Browser', 'Google US English (Female)'),
  ('demo-fitness', 'demo-fitness',
   '["What classes are available today?", "Book a personal training session", "Show me membership options", "Where are the locker rooms?", "What are your hours?"]'::jsonb,
   'Browser', 'Google US English (Male)'),
  ('demo-retail', 'demo-retail',
   '["What''s on sale today?", "Help me find a product", "Check if you have my size", "Where is the fitting room?", "What''s your return policy?"]'::jsonb,
   'Browser', 'Google US English (Female)'),
  ('demo-banking', 'demo-banking',
   '["Open a new account", "Check my account balance", "Report a lost card", "Apply for a loan", "What are your rates?"]'::jsonb,
   'Browser', 'Google US English (Male)'),
  ('demo-events', 'demo-events',
   '["Where is the photo booth?", "Show me the event schedule", "How do I get to the VIP area?", "Where are the restrooms?", "What food is available?"]'::jsonb,
   'Browser', 'Google US English (Female)'),
  ('demo-hospitality', 'demo-hospitality',
   '["Check in to my room", "Request room service", "Book a spa treatment", "What time is breakfast?", "Where is the pool?"]'::jsonb,
   'Browser', 'Google US English (Female)')
ON CONFLICT (tenant_id, location_id) DO NOTHING;
