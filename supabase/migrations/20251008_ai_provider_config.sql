-- Add AI provider and model configuration to phone_numbers table
-- Migration: 20251008_ai_provider_config.sql

ALTER TABLE phone_numbers
ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'anthropic' CHECK (ai_provider IN ('openai', 'anthropic', 'google', 'azure')),
ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'claude-3-5-sonnet-20241022',
ADD COLUMN IF NOT EXISTS ai_temperature NUMERIC DEFAULT 0.7 CHECK (ai_temperature >= 0 AND ai_temperature <= 2),
ADD COLUMN IF NOT EXISTS ai_max_tokens INTEGER DEFAULT 1024;

-- Add comment for documentation
COMMENT ON COLUMN phone_numbers.ai_provider IS 'AI conversation provider: openai, anthropic, google, azure';
COMMENT ON COLUMN phone_numbers.ai_model IS 'Specific model name (e.g., gpt-4, claude-3-5-sonnet-20241022, gemini-pro)';
COMMENT ON COLUMN phone_numbers.ai_temperature IS 'Model temperature (0-2). Lower = more focused, Higher = more creative';
COMMENT ON COLUMN phone_numbers.ai_max_tokens IS 'Maximum tokens for AI response generation';

-- Update existing records to use anthropic (current default)
UPDATE phone_numbers
SET
  ai_provider = 'anthropic',
  ai_model = 'claude-3-5-sonnet-20241022',
  ai_temperature = 0.7,
  ai_max_tokens = 1024
WHERE ai_provider IS NULL;
