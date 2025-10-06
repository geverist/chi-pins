-- Subscriptions table for billing management
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe integration
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_payment_method_id TEXT,

  -- Subscription details
  plan_type TEXT NOT NULL CHECK (plan_type IN ('starter', 'professional', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'pending_hardware' CHECK (
    status IN ('pending_hardware', 'active', 'past_due', 'canceled', 'paused', 'trialing')
  ),

  -- Billing timing
  billing_start_date DATE, -- Set when hardware ships
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end_date DATE,

  -- Pricing
  base_price DECIMAL(10,2) NOT NULL,
  discount_percent INTEGER DEFAULT 0,
  locations INTEGER DEFAULT 1,

  -- Hardware status
  hardware_status TEXT DEFAULT 'pending' CHECK (
    hardware_status IN ('pending', 'ordered', 'shipped', 'delivered', 'installed')
  ),

  -- Add-ons (stored as JSONB for flexibility)
  addons JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"name": "ai_voice", "price": 200}, {"name": "sms", "price": 49}]

  -- Usage tracking
  current_usage JSONB DEFAULT '{
    "interactions": 0,
    "sms_sent": 0,
    "voice_minutes": 0,
    "photos_captured": 0
  }'::jsonb,

  -- Metadata
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_hardware_status ON subscriptions(hardware_status);

-- RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own subscription (for self-service changes)
CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Only system can insert subscriptions (via API)
CREATE POLICY "System can insert subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate total monthly price
CREATE OR REPLACE FUNCTION calculate_subscription_total(subscription_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  subscription_record RECORD;
  addon_total DECIMAL(10,2);
  discounted_base DECIMAL(10,2);
BEGIN
  SELECT * INTO subscription_record FROM subscriptions WHERE id = subscription_id;

  -- Calculate addon total
  SELECT COALESCE(SUM((addon->>'price')::DECIMAL), 0)
  INTO addon_total
  FROM jsonb_array_elements(subscription_record.addons) AS addon;

  -- Apply volume discount to base price
  discounted_base := subscription_record.base_price *
    (1 - subscription_record.discount_percent::DECIMAL / 100);

  -- Return total (base + addons) * locations
  RETURN (discounted_base + addon_total) * subscription_record.locations;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE subscriptions IS 'Manages customer subscriptions and billing status';
COMMENT ON COLUMN subscriptions.status IS 'pending_hardware: Payment method saved but not billing yet. active: Currently billing. past_due: Payment failed. canceled: Subscription ended.';
COMMENT ON COLUMN subscriptions.hardware_status IS 'Tracks hardware delivery status. Billing starts when status changes to "shipped".';
COMMENT ON COLUMN subscriptions.billing_start_date IS 'Date when billing actually began (set when hardware ships)';
