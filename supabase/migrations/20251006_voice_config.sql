-- Voice Configuration Schema
-- Adds ConversationRelay settings to phone_numbers table

-- Add voice configuration columns
ALTER TABLE phone_numbers
ADD COLUMN IF NOT EXISTS tts_provider TEXT DEFAULT 'Google',
ADD COLUMN IF NOT EXISTS tts_voice TEXT DEFAULT 'en-US-Neural2-D',
ADD COLUMN IF NOT EXISTS tts_language TEXT DEFAULT 'en-US',
ADD COLUMN IF NOT EXISTS stt_provider TEXT DEFAULT 'Deepgram',
ADD COLUMN IF NOT EXISTS stt_model TEXT DEFAULT 'nova-2',
ADD COLUMN IF NOT EXISTS stt_language TEXT DEFAULT 'en-US',
ADD COLUMN IF NOT EXISTS enable_dtmf BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_interruption BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS conversation_mode TEXT DEFAULT 'conversationrelay', -- 'conversationrelay' or 'simple'
ADD COLUMN IF NOT EXISTS voice_config JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN phone_numbers.tts_provider IS 'Text-to-Speech provider: Google, Amazon, ElevenLabs';
COMMENT ON COLUMN phone_numbers.tts_voice IS 'Voice ID for the selected TTS provider';
COMMENT ON COLUMN phone_numbers.stt_provider IS 'Speech-to-Text provider: Google, Deepgram';
COMMENT ON COLUMN phone_numbers.stt_model IS 'STT model name (e.g., nova-2, telephony, long)';
COMMENT ON COLUMN phone_numbers.conversation_mode IS 'Handler mode: conversationrelay (AI) or simple (keyword-based)';
COMMENT ON COLUMN phone_numbers.voice_config IS 'Additional voice configuration (languages, custom parameters)';

-- Update existing phone number with default ConversationRelay config
UPDATE phone_numbers
SET
  tts_provider = 'Google',
  tts_voice = 'en-US-Neural2-D',
  tts_language = 'en-US',
  stt_provider = 'Deepgram',
  stt_model = 'nova-2',
  stt_language = 'en-US',
  enable_dtmf = true,
  enable_interruption = true,
  conversation_mode = 'conversationrelay',
  voice_config = '{
    "languages": [
      {
        "code": "en-US",
        "ttsProvider": "Google",
        "voice": "en-US-Neural2-D",
        "transcriptionProvider": "Deepgram",
        "speechModel": "nova-2"
      },
      {
        "code": "es-US",
        "ttsProvider": "Google",
        "voice": "es-US-Neural2-A",
        "transcriptionProvider": "Deepgram",
        "speechModel": "nova-2"
      }
    ],
    "customParameters": {
      "maxResponseTokens": 1024,
      "temperature": 0.7
    }
  }'::jsonb
WHERE tenant_id = 'chicago-mikes';

-- Create voice_prompts table for stateful conversation flows
CREATE TABLE IF NOT EXISTS voice_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  prompt_key TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  next_prompts JSONB DEFAULT '[]'::jsonb,
  required_intent TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, prompt_key)
);

COMMENT ON TABLE voice_prompts IS 'Stateful conversation prompt trees for voice agent';
COMMENT ON COLUMN voice_prompts.prompt_key IS 'Unique identifier for this prompt node (e.g., "greeting", "hours_response")';
COMMENT ON COLUMN voice_prompts.next_prompts IS 'Array of possible next prompt keys based on user response';
COMMENT ON COLUMN voice_prompts.required_intent IS 'Intent that must be detected to trigger this prompt';

-- Sample prompt tree
INSERT INTO voice_prompts (tenant_id, prompt_key, prompt_text, next_prompts, required_intent)
VALUES
  ('chicago-mikes', 'greeting', 'Thank you for calling Chicago Mikes Beef and Dogs! How can I help you today?', '["hours", "menu", "order", "location"]'::jsonb, null),
  ('chicago-mikes', 'hours', 'We are open Monday through Thursday 9 AM to 9 PM, Friday and Saturday 9 AM to 10 PM, and Sunday 10 AM to 8 PM. Is there anything else I can help you with?', '["menu", "order", "location", "goodbye"]'::jsonb, 'hours'),
  ('chicago-mikes', 'menu', 'We specialize in Chicago-style Italian beef and hot dogs. Would you like to hear about our beef sandwiches, hot dogs, or something else?', '["beef_menu", "hotdog_menu", "specials"]'::jsonb, 'menu'),
  ('chicago-mikes', 'beef_menu', 'Our Italian beef sandwich is $8.99 and comes with peppers. You can add cheese for $1 extra, or get it dipped for the authentic Chicago experience. Would you like to place an order?', '["order", "hotdog_menu", "goodbye"]'::jsonb, 'beef'),
  ('chicago-mikes', 'order', 'Great! Let me take your order. What would you like?', '["order_confirm", "modify_order"]'::jsonb, 'order'),
  ('chicago-mikes', 'order_confirm', 'Perfect! Your order will be ready for pickup in about 15 minutes. Can I get your name and phone number?', '["order_complete"]'::jsonb, 'confirm'),
  ('chicago-mikes', 'goodbye', 'Thank you for calling Chicago Mikes! Have a great day!', '[]'::jsonb, 'goodbye')
ON CONFLICT (tenant_id, prompt_key) DO NOTHING;

-- Create voice_tools table for tool/function definitions
CREATE TABLE IF NOT EXISTS voice_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  tool_description TEXT NOT NULL,
  input_schema JSONB NOT NULL,
  handler_function TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, tool_name)
);

COMMENT ON TABLE voice_tools IS 'Custom tools/functions available to the voice agent';
COMMENT ON COLUMN voice_tools.handler_function IS 'Name of the function handler in the Edge Function';
COMMENT ON COLUMN voice_tools.input_schema IS 'JSON Schema for tool input validation';

-- Sample tools
INSERT INTO voice_tools (tenant_id, tool_name, tool_description, input_schema, handler_function)
VALUES
  (
    'chicago-mikes',
    'search_menu',
    'Search the menu for specific items, ingredients, or dietary restrictions',
    '{
      "type": "object",
      "properties": {
        "query": {"type": "string", "description": "What to search for"},
        "category": {"type": "string", "enum": ["beef", "hotdog", "sides", "drinks"]}
      },
      "required": ["query"]
    }'::jsonb,
    'searchMenu'
  ),
  (
    'chicago-mikes',
    'check_availability',
    'Check if the restaurant is currently open and accepting orders',
    '{
      "type": "object",
      "properties": {
        "service_type": {"type": "string", "enum": ["dine-in", "pickup", "delivery"]}
      }
    }'::jsonb,
    'checkAvailability'
  ),
  (
    'chicago-mikes',
    'calculate_price',
    'Calculate the total price for an order including any add-ons',
    '{
      "type": "object",
      "properties": {
        "items": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {"type": "string"},
              "quantity": {"type": "number"},
              "addons": {"type": "array", "items": {"type": "string"}}
            }
          }
        }
      },
      "required": ["items"]
    }'::jsonb,
    'calculatePrice'
  )
ON CONFLICT (tenant_id, tool_name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_voice_prompts_tenant ON voice_prompts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voice_prompts_key ON voice_prompts(prompt_key);
CREATE INDEX IF NOT EXISTS idx_voice_tools_tenant ON voice_tools(tenant_id);

-- Add RLS policies
ALTER TABLE voice_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_tools ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage everything
CREATE POLICY voice_prompts_service_policy ON voice_prompts
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY voice_tools_service_policy ON voice_tools
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Allow authenticated users to read
CREATE POLICY voice_prompts_read_policy ON voice_prompts
  FOR SELECT
  USING (true);

CREATE POLICY voice_tools_read_policy ON voice_tools
  FOR SELECT
  USING (true);
