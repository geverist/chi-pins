-- Voice AI Agent Tables Migration
-- Created: 2025-10-05
-- Purpose: Add inbound voice agent functionality for phone answering

-- ============================================================================
-- PART 1: Phone Numbers Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL UNIQUE, -- E.164 format: +15551234567
  provider TEXT DEFAULT 'twilio',
  status TEXT DEFAULT 'active',

  -- Configuration
  greeting_message TEXT DEFAULT 'Thank you for calling. How can I help you today?',
  voice_type TEXT DEFAULT 'nova', -- Twilio voice options
  language TEXT DEFAULT 'en-US',

  -- Routing
  fallback_number TEXT, -- Transfer to human if AI can't handle
  business_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "21:00", "enabled": true},
    "tuesday": {"open": "09:00", "close": "21:00", "enabled": true},
    "wednesday": {"open": "09:00", "close": "21:00", "enabled": true},
    "thursday": {"open": "09:00", "close": "21:00", "enabled": true},
    "friday": {"open": "09:00", "close": "22:00", "enabled": true},
    "saturday": {"open": "09:00", "close": "22:00", "enabled": true},
    "sunday": {"open": "10:00", "close": "20:00", "enabled": true}
  }'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'suspended')),
  CONSTRAINT valid_provider CHECK (provider IN ('twilio', 'vonage', 'other'))
);

CREATE INDEX idx_phone_numbers_tenant ON phone_numbers(tenant_id);
CREATE INDEX idx_phone_numbers_number ON phone_numbers(phone_number);
CREATE INDEX idx_phone_numbers_status ON phone_numbers(status);

-- Enable RLS
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'phone_numbers') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Tenant isolation for phone_numbers" ON phone_numbers';
    EXECUTE '
      CREATE POLICY "Tenant isolation for phone_numbers" ON phone_numbers
        FOR ALL
        USING (tenant_id = current_setting(''app.current_tenant'', true))
        WITH CHECK (tenant_id = current_setting(''app.current_tenant'', true))
    ';
  END IF;
END $$;

-- ============================================================================
-- PART 2: Voice Calls Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  phone_number_id UUID REFERENCES phone_numbers(id),

  -- Call details
  caller_number TEXT NOT NULL,
  call_sid TEXT UNIQUE, -- Twilio call SID
  duration_seconds INTEGER,
  status TEXT DEFAULT 'in-progress',

  -- AI interaction
  conversation_transcript JSONB DEFAULT '[]'::jsonb,
  intent TEXT, -- hours, menu, order, feedback, appointment, other
  sentiment TEXT, -- positive, neutral, negative
  confidence_score DECIMAL(3, 2), -- 0.00 to 1.00

  -- Outcomes
  order_created BOOLEAN DEFAULT false,
  appointment_created BOOLEAN DEFAULT false,
  voicemail_left BOOLEAN DEFAULT false,
  transferred_to_human BOOLEAN DEFAULT false,

  -- Metadata
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('in-progress', 'completed', 'failed', 'no-answer', 'busy')),
  CONSTRAINT valid_intent CHECK (intent IN ('hours', 'menu', 'order', 'feedback', 'appointment', 'directions', 'other', NULL)),
  CONSTRAINT valid_sentiment CHECK (sentiment IN ('positive', 'neutral', 'negative', NULL))
);

CREATE INDEX idx_voice_calls_tenant ON voice_calls(tenant_id);
CREATE INDEX idx_voice_calls_caller ON voice_calls(caller_number);
CREATE INDEX idx_voice_calls_intent ON voice_calls(intent);
CREATE INDEX idx_voice_calls_started ON voice_calls(started_at DESC);
CREATE INDEX idx_voice_calls_status ON voice_calls(status);

-- Enable RLS
ALTER TABLE voice_calls ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'voice_calls') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Tenant isolation for voice_calls" ON voice_calls';
    EXECUTE '
      CREATE POLICY "Tenant isolation for voice_calls" ON voice_calls
        FOR ALL
        USING (tenant_id = current_setting(''app.current_tenant'', true))
        WITH CHECK (tenant_id = current_setting(''app.current_tenant'', true))
    ';
  END IF;
END $$;

-- ============================================================================
-- PART 3: Voice Voicemails Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_voicemails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  call_id UUID REFERENCES voice_calls(id),

  -- Voicemail content
  caller_number TEXT,
  caller_name TEXT,
  recording_url TEXT,
  transcription TEXT,
  category TEXT,
  sentiment TEXT,

  -- Status
  status TEXT DEFAULT 'new',
  assigned_to UUID,
  priority TEXT DEFAULT 'normal',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('new', 'read', 'archived', 'deleted')),
  CONSTRAINT valid_category CHECK (category IN ('feedback', 'complaint', 'question', 'compliment', 'other', NULL)),
  CONSTRAINT valid_sentiment CHECK (sentiment IN ('positive', 'neutral', 'negative', NULL)),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

CREATE INDEX idx_voice_voicemails_tenant ON voice_voicemails(tenant_id);
CREATE INDEX idx_voice_voicemails_status ON voice_voicemails(status);
CREATE INDEX idx_voice_voicemails_created ON voice_voicemails(created_at DESC);
CREATE INDEX idx_voice_voicemails_priority ON voice_voicemails(priority);

-- Enable RLS
ALTER TABLE voice_voicemails ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'voice_voicemails') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Tenant isolation for voice_voicemails" ON voice_voicemails';
    EXECUTE '
      CREATE POLICY "Tenant isolation for voice_voicemails" ON voice_voicemails
        FOR ALL
        USING (tenant_id = current_setting(''app.current_tenant'', true))
        WITH CHECK (tenant_id = current_setting(''app.current_tenant'', true))
    ';
  END IF;
END $$;

-- ============================================================================
-- PART 4: Voice Agent Knowledge Base Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_agent_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  -- Knowledge entry
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  keywords TEXT[], -- For search optimization
  priority INTEGER DEFAULT 0,

  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_category CHECK (category IN ('hours', 'menu', 'services', 'policies', 'pricing', 'location', 'other', NULL))
);

CREATE INDEX idx_voice_knowledge_tenant ON voice_agent_knowledge(tenant_id);
CREATE INDEX idx_voice_knowledge_category ON voice_agent_knowledge(category);
CREATE INDEX idx_voice_knowledge_priority ON voice_agent_knowledge(priority DESC);
CREATE INDEX idx_voice_knowledge_keywords ON voice_agent_knowledge USING GIN(keywords);

-- Enable RLS
ALTER TABLE voice_agent_knowledge ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'voice_agent_knowledge') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Tenant isolation for voice_agent_knowledge" ON voice_agent_knowledge';
    EXECUTE '
      CREATE POLICY "Tenant isolation for voice_agent_knowledge" ON voice_agent_knowledge
        FOR ALL
        USING (tenant_id = current_setting(''app.current_tenant'', true))
        WITH CHECK (tenant_id = current_setting(''app.current_tenant'', true))
    ';
  END IF;
END $$;

-- ============================================================================
-- PART 5: Voice Agent Settings (extends tenant_config)
-- ============================================================================

-- Update tenant_config to include voice agent settings
DO $$
BEGIN
  -- Add voice_agent_enabled to features if tenant_config exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tenant_config') THEN
    -- Update existing configs to add voice agent feature
    UPDATE tenant_config
    SET features = features || '{"voice_agent_enabled": false}'::jsonb
    WHERE NOT (features ? 'voice_agent_enabled');
  END IF;
END $$;

-- ============================================================================
-- PART 6: Helper Functions
-- ============================================================================

-- Function to get active phone number for tenant
CREATE OR REPLACE FUNCTION get_tenant_phone_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_phone_number TEXT;
BEGIN
  SELECT phone_number INTO v_phone_number
  FROM phone_numbers
  WHERE tenant_id = p_tenant_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN v_phone_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log voice call
CREATE OR REPLACE FUNCTION log_voice_call(
  p_tenant_id TEXT,
  p_caller_number TEXT,
  p_call_sid TEXT,
  p_intent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_call_id UUID;
  v_phone_number_id UUID;
BEGIN
  -- Get phone number ID
  SELECT id INTO v_phone_number_id
  FROM phone_numbers
  WHERE tenant_id = p_tenant_id
    AND status = 'active'
  LIMIT 1;

  -- Insert call record
  INSERT INTO voice_calls (
    tenant_id,
    phone_number_id,
    caller_number,
    call_sid,
    intent
  ) VALUES (
    p_tenant_id,
    v_phone_number_id,
    p_caller_number,
    p_call_sid,
    p_intent
  ) RETURNING id INTO v_call_id;

  RETURN v_call_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if business is open
CREATE OR REPLACE FUNCTION is_business_open(p_tenant_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_hours JSONB;
  v_day TEXT;
  v_current_time TIME;
  v_open_time TIME;
  v_close_time TIME;
  v_enabled BOOLEAN;
BEGIN
  -- Get current day and time
  v_day := LOWER(TO_CHAR(CURRENT_TIMESTAMP, 'Day'));
  v_day := TRIM(v_day);
  v_current_time := CURRENT_TIME;

  -- Get business hours
  SELECT business_hours INTO v_hours
  FROM phone_numbers
  WHERE tenant_id = p_tenant_id
    AND status = 'active'
  LIMIT 1;

  IF v_hours IS NULL THEN
    RETURN false;
  END IF;

  -- Extract hours for current day
  v_enabled := (v_hours->v_day->>'enabled')::boolean;
  v_open_time := (v_hours->v_day->>'open')::time;
  v_close_time := (v_hours->v_day->>'close')::time;

  -- Check if open
  RETURN v_enabled AND v_current_time BETWEEN v_open_time AND v_close_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 7: Sample Data for Chicago Mike's
-- ============================================================================

-- Insert sample phone number for chicago-mikes
INSERT INTO phone_numbers (tenant_id, phone_number, greeting_message, status)
VALUES (
  'chicago-mikes',
  '+15551234567', -- Placeholder - will be replaced with real Twilio number
  'Thanks for calling Chicago Mike''s Beef and Dogs! Our AI assistant is here to help. How can I assist you today?',
  'inactive' -- Set to active once real number is provisioned
)
ON CONFLICT (phone_number) DO NOTHING;

-- Insert sample knowledge base entries
INSERT INTO voice_agent_knowledge (tenant_id, question, answer, category, keywords, priority) VALUES
  ('chicago-mikes', 'What are your hours?', 'We are open Monday through Thursday 9 AM to 9 PM, Friday and Saturday 9 AM to 10 PM, and Sunday 10 AM to 8 PM.', 'hours', ARRAY['hours', 'open', 'close', 'time'], 10),
  ('chicago-mikes', 'Where are you located?', 'We are located in Chicago, Illinois. Would you like directions?', 'location', ARRAY['location', 'address', 'directions', 'where'], 10),
  ('chicago-mikes', 'Do you have gluten-free options?', 'Yes! We offer gluten-free buns for all our sandwiches. Just let us know when ordering.', 'menu', ARRAY['gluten-free', 'dietary', 'allergies', 'celiac'], 8),
  ('chicago-mikes', 'Can I place an order for pickup?', 'Absolutely! I can take your order right now. What would you like?', 'order', ARRAY['order', 'pickup', 'takeout', 'to-go'], 10),
  ('chicago-mikes', 'Do you deliver?', 'We offer delivery through DoorDash, Uber Eats, and Grubhub. Would you like phone numbers for those services?', 'services', ARRAY['delivery', 'doordash', 'ubereats', 'grubhub'], 7)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. Phone numbers must be provisioned via Twilio API
-- 2. Call transcripts stored as JSONB for flexibility
-- 3. Knowledge base supports fuzzy matching via keywords
-- 4. Business hours configurable per day of week
-- 5. All tables have tenant isolation via RLS
