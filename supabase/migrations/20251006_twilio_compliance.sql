-- Twilio A2P 10DLC and Toll-Free Compliance Tables

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS public.twilio_toll_free_verifications CASCADE;
DROP TABLE IF EXISTS public.twilio_phone_numbers CASCADE;
DROP TABLE IF EXISTS public.twilio_campaigns CASCADE;
DROP TABLE IF EXISTS public.twilio_brands CASCADE;
DROP TABLE IF EXISTS public.phone_numbers CASCADE;

-- Twilio Brand Registrations (for A2P 10DLC)
CREATE TABLE public.twilio_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Twilio IDs
  brand_sid TEXT UNIQUE NOT NULL,
  customer_profile_sid TEXT,

  -- Brand Details
  brand_name TEXT NOT NULL,
  ein TEXT, -- Tax ID
  business_type TEXT, -- PRIVATE_PROFIT, PUBLIC_PROFIT, NON_PROFIT, GOVERNMENT
  vertical TEXT, -- Industry category

  -- Status
  status TEXT NOT NULL CHECK (
    status IN ('PENDING', 'APPROVED', 'FAILED', 'VERIFIED', 'VETTED')
  ),
  brand_score INTEGER, -- 0-100 trust score from TCR
  trust_level TEXT, -- UNVERIFIED, VERIFIED, VETTED
  failure_reason TEXT,

  -- Complete brand data from Twilio
  brand_data JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_twilio_brands_user_id ON twilio_brands(user_id);
CREATE INDEX idx_twilio_brands_status ON twilio_brands(status);
CREATE INDEX idx_twilio_brands_brand_sid ON twilio_brands(brand_sid);

-- RLS Policies
ALTER TABLE twilio_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brands"
  ON twilio_brands FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own brands"
  ON twilio_brands FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brands"
  ON twilio_brands FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);


-- Twilio Messaging Campaigns (for A2P 10DLC)
CREATE TABLE public.twilio_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES twilio_brands(id) ON DELETE CASCADE,

  -- Twilio IDs
  campaign_sid TEXT UNIQUE NOT NULL,
  brand_sid TEXT NOT NULL,
  messaging_service_sid TEXT,

  -- Campaign Details
  use_case TEXT NOT NULL, -- 2FA, CUSTOMER_CARE, MARKETING, MIXED, etc.
  description TEXT,
  message_flow TEXT,

  -- Status
  status TEXT NOT NULL CHECK (
    status IN ('PENDING', 'APPROVED', 'FAILED', 'SUSPENDED')
  ),
  failure_reason TEXT,

  -- Opt-in/out keywords
  opt_in_keywords TEXT[],
  opt_out_keywords TEXT[],
  help_keywords TEXT[],

  -- Sample messages
  sample_messages JSONB,

  -- Throughput limits (messages per minute)
  throughput_limit INTEGER,

  -- Complete campaign data from Twilio
  campaign_data JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_twilio_campaigns_user_id ON twilio_campaigns(user_id);
CREATE INDEX idx_twilio_campaigns_brand_id ON twilio_campaigns(brand_id);
CREATE INDEX idx_twilio_campaigns_status ON twilio_campaigns(status);
CREATE INDEX idx_twilio_campaigns_campaign_sid ON twilio_campaigns(campaign_sid);

-- RLS Policies
ALTER TABLE twilio_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaigns"
  ON twilio_campaigns FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own campaigns"
  ON twilio_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns"
  ON twilio_campaigns FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);


-- Toll-Free Verifications
CREATE TABLE public.twilio_tollfree_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Twilio IDs
  verification_sid TEXT UNIQUE NOT NULL,
  phone_number_sid TEXT NOT NULL,
  phone_number TEXT NOT NULL,

  -- Business Details
  business_name TEXT NOT NULL,
  business_website TEXT NOT NULL,
  business_address JSONB NOT NULL,
  contact_email TEXT NOT NULL,

  -- Use Case
  use_case TEXT NOT NULL,
  use_case_description TEXT NOT NULL,
  message_volume TEXT, -- Expected daily volume
  opt_in_type TEXT, -- VERBAL, WEB_FORM, PAPER_FORM, VIA_TEXT, MOBILE_QR_CODE

  -- Status
  status TEXT NOT NULL CHECK (
    status IN ('PENDING_REVIEW', 'IN_REVIEW', 'TWILIO_APPROVED', 'TWILIO_REJECTED')
  ),
  rejection_reason TEXT,

  -- Opt-in proof
  opt_in_image_urls TEXT[],

  -- Sample messages
  production_message_sample TEXT,

  -- Complete verification data from Twilio
  verification_data JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_twilio_tollfree_user_id ON twilio_tollfree_verifications(user_id);
CREATE INDEX idx_twilio_tollfree_status ON twilio_tollfree_verifications(status);
CREATE INDEX idx_twilio_tollfree_phone ON twilio_tollfree_verifications(phone_number);

-- RLS Policies
ALTER TABLE twilio_tollfree_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own toll-free verifications"
  ON twilio_tollfree_verifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own toll-free verifications"
  ON twilio_tollfree_verifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own toll-free verifications"
  ON twilio_tollfree_verifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);


-- Phone Numbers
CREATE TABLE public.phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Twilio IDs
  phone_number_sid TEXT UNIQUE NOT NULL,
  phone_number TEXT UNIQUE NOT NULL,

  -- Number Details
  friendly_name TEXT,
  number_type TEXT NOT NULL CHECK (
    number_type IN ('10dlc', 'tollfree', 'shortcode')
  ),

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'suspended', 'porting', 'released')
  ),

  -- Capabilities
  capabilities JSONB DEFAULT '{"voice": true, "SMS": true, "MMS": false}'::jsonb,

  -- Linked Services
  messaging_service_sid TEXT,
  campaign_id UUID REFERENCES twilio_campaigns(id) ON DELETE SET NULL,
  verification_id UUID REFERENCES twilio_tollfree_verifications(id) ON DELETE SET NULL,

  -- Webhooks
  sms_url TEXT,
  voice_url TEXT,
  status_callback_url TEXT,

  -- Usage Stats
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,

  -- Metadata
  purchased_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_phone_numbers_user_id ON phone_numbers(user_id);
CREATE INDEX idx_phone_numbers_status ON phone_numbers(status);
CREATE INDEX idx_phone_numbers_number_type ON phone_numbers(number_type);
CREATE INDEX idx_phone_numbers_phone ON phone_numbers(phone_number);

-- RLS Policies
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own phone numbers"
  ON phone_numbers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own phone numbers"
  ON phone_numbers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own phone numbers"
  ON phone_numbers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);


-- Number Port Requests
CREATE TABLE IF NOT EXISTS public.number_port_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Twilio Port-In ID
  port_in_sid TEXT UNIQUE NOT NULL,

  -- Numbers being ported
  phone_numbers TEXT[] NOT NULL,

  -- Status
  status TEXT NOT NULL CHECK (
    status IN (
      'draft',
      'pending_documents',
      'submitted',
      'pending_loa',
      'in_progress',
      'completed',
      'expired',
      'canceled',
      'port_failed'
    )
  ),

  -- Dates
  target_date DATE,
  estimated_completion DATE,
  completed_at TIMESTAMPTZ,

  -- Account Info (encrypted)
  losing_carrier_account_number TEXT,
  losing_carrier_pin TEXT,

  -- Service Address
  service_address JSONB NOT NULL,

  -- Contact
  authorized_contact JSONB NOT NULL,

  -- Documents
  loa_document_url TEXT, -- Letter of Authorization
  bill_document_url TEXT, -- Recent bill copy

  -- Rejection reason (if failed)
  failure_reason TEXT,
  missing_documents TEXT[],

  -- Complete port data from Twilio
  port_data JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_port_requests_user_id ON number_port_requests(user_id);
CREATE INDEX idx_port_requests_status ON number_port_requests(status);
CREATE INDEX idx_port_requests_port_in_sid ON number_port_requests(port_in_sid);

-- RLS Policies
ALTER TABLE number_port_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own port requests"
  ON number_port_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own port requests"
  ON number_port_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own port requests"
  ON number_port_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);


-- SMS Message Log (for compliance and debugging)
CREATE TABLE IF NOT EXISTS public.sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone_number_id UUID REFERENCES phone_numbers(id) ON DELETE SET NULL,

  -- Twilio Message ID
  message_sid TEXT UNIQUE NOT NULL,

  -- Direction
  direction TEXT NOT NULL CHECK (
    direction IN ('inbound', 'outbound')
  ),

  -- Participants
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,

  -- Content
  body TEXT,
  media_urls TEXT[],

  -- Status
  status TEXT NOT NULL, -- queued, sending, sent, failed, delivered, undelivered, receiving, received
  error_code INTEGER,
  error_message TEXT,

  -- Pricing
  price DECIMAL(10, 4),
  price_unit TEXT DEFAULT 'USD',

  -- Metadata
  num_segments INTEGER DEFAULT 1,
  num_media INTEGER DEFAULT 0,

  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sms_messages_user_id ON sms_messages(user_id);
CREATE INDEX idx_sms_messages_phone_number_id ON sms_messages(phone_number_id);
CREATE INDEX idx_sms_messages_direction ON sms_messages(direction);
CREATE INDEX idx_sms_messages_status ON sms_messages(status);
CREATE INDEX idx_sms_messages_created_at ON sms_messages(created_at DESC);
CREATE INDEX idx_sms_messages_from ON sms_messages(from_number);
CREATE INDEX idx_sms_messages_to ON sms_messages(to_number);

-- RLS Policies
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own SMS messages"
  ON sms_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert SMS messages"
  ON sms_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- Auto-update updated_at timestamps
CREATE TRIGGER update_twilio_brands_updated_at
  BEFORE UPDATE ON twilio_brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_twilio_campaigns_updated_at
  BEFORE UPDATE ON twilio_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_twilio_tollfree_updated_at
  BEFORE UPDATE ON twilio_tollfree_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phone_numbers_updated_at
  BEFORE UPDATE ON phone_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_port_requests_updated_at
  BEFORE UPDATE ON number_port_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- Comments
COMMENT ON TABLE twilio_brands IS 'A2P 10DLC brand registrations with The Campaign Registry';
COMMENT ON TABLE twilio_campaigns IS 'A2P 10DLC messaging campaigns linked to brands';
COMMENT ON TABLE twilio_tollfree_verifications IS 'Toll-free number verification submissions';
COMMENT ON TABLE phone_numbers IS 'All phone numbers (10DLC, toll-free, short codes)';
COMMENT ON TABLE number_port_requests IS 'Phone number porting requests from other carriers';
COMMENT ON TABLE sms_messages IS 'Complete SMS message log for compliance and analytics';
