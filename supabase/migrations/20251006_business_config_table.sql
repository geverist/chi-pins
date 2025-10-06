-- Create business_config table for storing business owner settings
-- Created: 2025-10-06

CREATE TABLE IF NOT EXISTS public.business_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Business Information
  business_name TEXT NOT NULL,
  industry TEXT NOT NULL CHECK (industry IN ('restaurant', 'medspa', 'auto', 'healthcare', 'fitness', 'retail', 'banking', 'hospitality', 'events')),
  primary_color TEXT DEFAULT '#667eea',
  locations INTEGER DEFAULT 1 CHECK (locations > 0),
  phone_number TEXT,

  -- Setup Status
  setup_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 1,

  -- Custom Domain
  custom_domain TEXT,
  domain_verified BOOLEAN DEFAULT false,

  -- Feature Flags
  features JSONB DEFAULT '{
    "games": true,
    "photoBooth": true,
    "jukebox": false,
    "feedback": true,
    "popularSpots": false,
    "thenAndNow": false,
    "aiVoice": false
  }'::jsonb,

  -- Branding
  logo_url TEXT,
  welcome_message TEXT,
  tagline TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_config UNIQUE (user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_config_user_id ON public.business_config(user_id);
CREATE INDEX IF NOT EXISTS idx_business_config_industry ON public.business_config(industry);
CREATE INDEX IF NOT EXISTS idx_business_config_domain ON public.business_config(custom_domain);

-- Enable Row Level Security
ALTER TABLE public.business_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can only view their own config
CREATE POLICY "Users can view own business config"
  ON public.business_config FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own config
CREATE POLICY "Users can insert own business config"
  ON public.business_config FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own config
CREATE POLICY "Users can update own business config"
  ON public.business_config FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_business_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_business_config_timestamp
  BEFORE UPDATE ON public.business_config
  FOR EACH ROW
  EXECUTE FUNCTION update_business_config_updated_at();

-- Sample data for testing
COMMENT ON TABLE public.business_config IS 'Stores business owner configuration and branding settings for their EngageOS kiosk';
