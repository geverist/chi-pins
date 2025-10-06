-- Call Recording and Conversational Intelligence Configuration
-- Adds support for Twilio call recording, transcription, and custom language operators

-- Add recording and intelligence columns to phone_numbers
ALTER TABLE phone_numbers
ADD COLUMN IF NOT EXISTS recording_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recording_channels TEXT DEFAULT 'dual', -- 'mono' or 'dual'
ADD COLUMN IF NOT EXISTS transcription_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS transcription_provider TEXT DEFAULT 'twilio', -- 'twilio' or 'google'
ADD COLUMN IF NOT EXISTS pii_redaction BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS intelligence_service_sid TEXT,
ADD COLUMN IF NOT EXISTS recording_storage_days INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS recording_package_tier TEXT DEFAULT 'none'; -- 'none', 'basic', 'pro', 'enterprise'

COMMENT ON COLUMN phone_numbers.recording_enabled IS 'Enable call recording for all calls';
COMMENT ON COLUMN phone_numbers.recording_channels IS 'Record mono (single) or dual (separate agent/customer channels)';
COMMENT ON COLUMN phone_numbers.transcription_enabled IS 'Enable automatic transcription via Conversational Intelligence';
COMMENT ON COLUMN phone_numbers.pii_redaction IS 'Automatically redact PII from transcriptions';
COMMENT ON COLUMN phone_numbers.intelligence_service_sid IS 'Twilio Intelligence Service SID';
COMMENT ON COLUMN phone_numbers.recording_storage_days IS 'Number of days to retain recordings';
COMMENT ON COLUMN phone_numbers.recording_package_tier IS E'Recording package tiers:\n- none: No recording ($0)\n- basic: 50 hours/month recording + transcription ($49/mo)\n- pro: 150 hours/month + transcription + basic operators ($99/mo)\n- enterprise: Unlimited + transcription + custom operators ($199/mo)';

-- Create intelligence_operators table for custom language operators
CREATE TABLE IF NOT EXISTS intelligence_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  operator_sid TEXT, -- Twilio Operator SID
  operator_type TEXT NOT NULL, -- 'prebuilt' or 'custom-generative'
  operator_name TEXT NOT NULL,
  operator_description TEXT,
  instructions TEXT, -- Natural language instructions for generative operators
  output_type TEXT DEFAULT 'score', -- 'score', 'classification', 'extraction', 'boolean'
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, operator_name)
);

COMMENT ON TABLE intelligence_operators IS 'Custom and prebuilt language operators for call analysis';
COMMENT ON COLUMN intelligence_operators.instructions IS 'Natural language prompt for generative custom operators';
COMMENT ON COLUMN intelligence_operators.output_type IS 'Type of output: score (0-100), classification (category), extraction (text), boolean';

-- Create call_transcriptions table
CREATE TABLE IF NOT EXISTS call_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sid TEXT NOT NULL,
  phone_id UUID NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  transcript_text TEXT,
  transcript_json JSONB, -- Full transcript with timestamps
  confidence_score DECIMAL(5, 4),
  language TEXT DEFAULT 'en-US',
  duration_seconds INTEGER,
  recording_url TEXT,
  recording_sid TEXT,
  intelligence_service_sid TEXT,
  operator_results JSONB DEFAULT '{}'::jsonb, -- Results from language operators
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_transcriptions_call_sid ON call_transcriptions(call_sid);
CREATE INDEX IF NOT EXISTS idx_call_transcriptions_phone ON call_transcriptions(phone_id);
CREATE INDEX IF NOT EXISTS idx_call_transcriptions_tenant ON call_transcriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_transcriptions_created ON call_transcriptions(created_at);

COMMENT ON TABLE call_transcriptions IS 'Call transcripts with Conversational Intelligence analysis';
COMMENT ON COLUMN call_transcriptions.transcript_json IS 'Full transcript with speaker labels, timestamps, and confidence scores';
COMMENT ON COLUMN call_transcriptions.operator_results IS 'Results from custom and prebuilt language operators';

-- Enable RLS
ALTER TABLE intelligence_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_transcriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY intelligence_operators_service_policy ON intelligence_operators
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY intelligence_operators_read_policy ON intelligence_operators
  FOR SELECT
  USING (true);

CREATE POLICY call_transcriptions_service_policy ON call_transcriptions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY call_transcriptions_read_policy ON call_transcriptions
  FOR SELECT
  USING (true);

-- Sample prebuilt operators
INSERT INTO intelligence_operators (tenant_id, operator_type, operator_name, operator_description, output_type)
VALUES
  ('chicago-mikes', 'prebuilt', 'sentiment', 'Detect overall sentiment of the conversation', 'classification'),
  ('chicago-mikes', 'prebuilt', 'pci-redaction', 'Redact credit card and PII information', 'boolean'),
  ('chicago-mikes', 'prebuilt', 'call-summary', 'Generate a summary of the call', 'extraction')
ON CONFLICT (tenant_id, operator_name) DO NOTHING;

-- Sample custom generative operators
INSERT INTO intelligence_operators (tenant_id, operator_type, operator_name, operator_description, instructions, output_type)
VALUES
  (
    'chicago-mikes',
    'custom-generative',
    'order-quality-score',
    'Score how well the agent handled the order',
    'Analyze the conversation and assign a score from 0-100 based on: 1) Did the agent confirm all order details? 2) Did the agent ask about dietary restrictions? 3) Did the agent provide pickup time? 4) Was the agent friendly and professional?',
    'score'
  ),
  (
    'chicago-mikes',
    'custom-generative',
    'menu-upsell',
    'Identify if agent attempted upselling',
    'Did the agent attempt to upsell items like adding cheese, upgrading to combo, or suggesting sides? Return true if upsell was attempted, false otherwise.',
    'boolean'
  ),
  (
    'chicago-mikes',
    'custom-generative',
    'customer-complaint',
    'Extract customer complaints or issues',
    'Identify and extract any customer complaints, issues, or negative feedback mentioned during the call. Return the complaint text, or "None" if no complaints were made.',
    'extraction'
  ),
  (
    'chicago-mikes',
    'custom-generative',
    'competitor-mention',
    'Detect mentions of competitors',
    'Did the customer mention any competitor restaurants (Portillos, Als Beef, Hot Dougs, etc.)? Return the competitor name if mentioned, or "None" if no competitors were discussed.',
    'extraction'
  ),
  (
    'chicago-mikes',
    'custom-generative',
    'lead-qualification',
    'Qualify potential catering leads',
    'Is this customer a potential catering lead? Look for mentions of: large orders, events, parties, corporate orders. Return a score 0-100 where 100 = high catering potential.',
    'score'
  )
ON CONFLICT (tenant_id, operator_name) DO NOTHING;

-- Function to get recording configuration
CREATE OR REPLACE FUNCTION get_recording_config(p_phone_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'recording_enabled', recording_enabled,
    'recording_channels', recording_channels,
    'transcription_enabled', transcription_enabled,
    'pii_redaction', pii_redaction,
    'intelligence_service_sid', intelligence_service_sid,
    'recording_package_tier', recording_package_tier,
    'recording_storage_days', recording_storage_days
  ) INTO v_result
  FROM phone_numbers
  WHERE id = p_phone_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to save transcription with operator results
CREATE OR REPLACE FUNCTION save_transcription(
  p_call_sid TEXT,
  p_phone_id UUID,
  p_tenant_id TEXT,
  p_transcript_text TEXT,
  p_transcript_json JSONB,
  p_recording_url TEXT DEFAULT NULL,
  p_recording_sid TEXT DEFAULT NULL,
  p_operator_results JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO call_transcriptions (
    call_sid,
    phone_id,
    tenant_id,
    transcript_text,
    transcript_json,
    recording_url,
    recording_sid,
    operator_results
  )
  VALUES (
    p_call_sid,
    p_phone_id,
    p_tenant_id,
    p_transcript_text,
    p_transcript_json,
    p_recording_url,
    p_recording_sid,
    p_operator_results
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for operator analytics
CREATE OR REPLACE VIEW operator_analytics AS
SELECT
  io.tenant_id,
  io.operator_name,
  io.operator_type,
  COUNT(ct.id) as total_calls_analyzed,
  AVG((ct.operator_results->io.operator_name->>'value')::NUMERIC) FILTER (WHERE ct.operator_results ? io.operator_name AND io.output_type = 'score') as avg_score,
  jsonb_agg(DISTINCT ct.operator_results->io.operator_name->'value') FILTER (WHERE ct.operator_results ? io.operator_name AND io.output_type IN ('classification', 'extraction')) as common_values,
  COUNT(*) FILTER (WHERE (ct.operator_results->io.operator_name->>'value')::BOOLEAN = true) as true_count,
  COUNT(*) FILTER (WHERE (ct.operator_results->io.operator_name->>'value')::BOOLEAN = false) as false_count
FROM intelligence_operators io
LEFT JOIN call_transcriptions ct ON ct.operator_results ? io.operator_name
  AND ct.tenant_id = io.tenant_id
WHERE io.enabled = true
GROUP BY io.tenant_id, io.operator_name, io.operator_type, io.output_type;

-- Update phone_numbers defaults
UPDATE phone_numbers
SET
  recording_enabled = false,
  recording_channels = 'dual',
  transcription_enabled = false,
  pii_redaction = true,
  recording_storage_days = 90,
  recording_package_tier = 'none'
WHERE tenant_id = 'chicago-mikes';
