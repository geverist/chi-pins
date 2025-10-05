-- ============================================================================
-- ENGAGEOS MARKETPLACE DATABASE SCHEMA
-- ============================================================================
-- This migration creates tables for the widget marketplace system
-- ============================================================================

-- ============================================================================
-- 1. MARKETPLACE WIDGETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS marketplace_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, -- e.g. "gaming-widget", "survey-widget"
  name TEXT NOT NULL, -- e.g. "Gaming Widget"
  category TEXT NOT NULL, -- content, integration, analytics, marketing, revenue, operations, customer, compliance, ai
  description TEXT,
  price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb, -- Array of feature strings

  -- Configuration
  configuration_schema JSONB DEFAULT '{}'::jsonb, -- JSON schema for widget config
  default_configuration JSONB DEFAULT '{}'::jsonb, -- Default config values

  -- Compatibility
  compatibility JSONB DEFAULT '{}'::jsonb, -- {minPlatformVersion, requiredWidgets[], conflicts[]}
  permissions TEXT[] DEFAULT '{}'::text[], -- ["customer.read", "customer.write", etc.]

  -- Metadata
  active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  icon_url TEXT,
  screenshot_urls TEXT[] DEFAULT '{}'::text[],
  demo_url TEXT,
  documentation_url TEXT,

  -- Billing
  stripe_price_id TEXT, -- Stripe price ID for subscriptions
  usage_based BOOLEAN DEFAULT false, -- Does this widget have usage-based billing?
  usage_metric TEXT, -- e.g. "emails_sent", "api_calls"
  usage_limit INTEGER, -- Free tier limit (e.g. 1000 emails)
  overage_price NUMERIC(10, 4), -- Price per unit over limit (e.g. 0.01 per email)

  -- Industry variants
  industry_specific BOOLEAN DEFAULT false,
  industries TEXT[] DEFAULT '{}'::text[], -- ["restaurant", "auto", "healthcare", etc.]

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_widgets_category ON marketplace_widgets(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_widgets_active ON marketplace_widgets(active);
CREATE INDEX IF NOT EXISTS idx_marketplace_widgets_featured ON marketplace_widgets(featured);
CREATE INDEX IF NOT EXISTS idx_marketplace_widgets_industries ON marketplace_widgets USING GIN(industries);

-- ============================================================================
-- 2. MARKETPLACE INTEGRATIONS (3rd Party Services)
-- ============================================================================
CREATE TABLE IF NOT EXISTS marketplace_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, -- e.g. "square-pos", "salesforce-crm"
  name TEXT NOT NULL, -- e.g. "Square POS"
  category TEXT NOT NULL, -- pos, crm, payment, event, communication, analytics, etc.
  description TEXT,
  price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0,

  -- API Details
  api_type TEXT, -- REST, GraphQL, SOAP, etc.
  oauth_supported BOOLEAN DEFAULT false,
  webhook_supported BOOLEAN DEFAULT false,
  api_documentation_url TEXT,

  -- Configuration
  configuration_schema JSONB DEFAULT '{}'::jsonb,
  oauth_config JSONB DEFAULT '{}'::jsonb, -- {authUrl, tokenUrl, scopes[], etc.}

  -- Industries
  industries TEXT[] DEFAULT '{}'::text[],

  -- Metadata
  active BOOLEAN DEFAULT true,
  icon_url TEXT,
  provider_website TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_integrations_category ON marketplace_integrations(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_integrations_industries ON marketplace_integrations USING GIN(industries);

-- ============================================================================
-- 3. MARKETPLACE BUNDLES (Pre-configured widget packages)
-- ============================================================================
CREATE TABLE IF NOT EXISTS marketplace_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, -- e.g. "restaurant-bundle"
  name TEXT NOT NULL, -- e.g. "Restaurant Bundle"
  industry TEXT NOT NULL, -- restaurant, auto, healthcare, etc.
  description TEXT,

  -- Pricing
  original_price NUMERIC(10, 2) NOT NULL, -- Sum of individual widget prices
  bundle_price NUMERIC(10, 2) NOT NULL, -- Discounted bundle price

  -- Metadata
  active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  icon_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_bundles_industry ON marketplace_bundles(industry);
CREATE INDEX IF NOT EXISTS idx_marketplace_bundles_active ON marketplace_bundles(active);

-- ============================================================================
-- 4. BUNDLE WIDGETS (Junction table for bundles <-> widgets)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bundle_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES marketplace_bundles(id) ON DELETE CASCADE,
  widget_id UUID NOT NULL REFERENCES marketplace_widgets(id) ON DELETE CASCADE,

  -- Configuration overrides for this bundle
  configuration_overrides JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(bundle_id, widget_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bundle_widgets_bundle ON bundle_widgets(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_widgets_widget ON bundle_widgets(widget_id);

-- ============================================================================
-- 5. LOCATION WIDGETS (Installed widgets per location)
-- ============================================================================
CREATE TABLE IF NOT EXISTS location_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL, -- References locations table (to be created)
  widget_id UUID NOT NULL REFERENCES marketplace_widgets(id) ON DELETE CASCADE,

  -- Installation details
  status TEXT DEFAULT 'active', -- active, inactive, suspended
  configuration JSONB DEFAULT '{}'::jsonb, -- Widget-specific config

  -- Billing
  stripe_subscription_id TEXT, -- Stripe subscription for this widget
  billing_status TEXT, -- active, past_due, canceled, etc.

  -- Usage tracking (for usage-based widgets)
  current_period_usage INTEGER DEFAULT 0,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,

  -- Timestamps
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  uninstalled_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,

  UNIQUE(location_id, widget_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_location_widgets_location ON location_widgets(location_id);
CREATE INDEX IF NOT EXISTS idx_location_widgets_widget ON location_widgets(widget_id);
CREATE INDEX IF NOT EXISTS idx_location_widgets_status ON location_widgets(status);
CREATE INDEX IF NOT EXISTS idx_location_widgets_billing ON location_widgets(billing_status);

-- ============================================================================
-- 6. WIDGET USAGE (Track usage for usage-based billing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS widget_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL,
  widget_id UUID NOT NULL REFERENCES marketplace_widgets(id) ON DELETE CASCADE,

  -- Usage details
  metric TEXT NOT NULL, -- e.g. "emails_sent", "api_calls", "sms_sent"
  quantity INTEGER NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context

  -- Timestamps
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_widget_usage_location ON widget_usage(location_id);
CREATE INDEX IF NOT EXISTS idx_widget_usage_widget ON widget_usage(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_usage_metric ON widget_usage(metric);
CREATE INDEX IF NOT EXISTS idx_widget_usage_timestamp ON widget_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_widget_usage_period ON widget_usage(period_start, period_end);

-- ============================================================================
-- 7. LOCATION INTEGRATIONS (Connected 3rd party services)
-- ============================================================================
CREATE TABLE IF NOT EXISTS location_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL,
  integration_id UUID NOT NULL REFERENCES marketplace_integrations(id) ON DELETE CASCADE,

  -- Connection details
  status TEXT DEFAULT 'active', -- active, inactive, error, pending_auth
  configuration JSONB DEFAULT '{}'::jsonb,

  -- OAuth tokens (encrypted)
  oauth_tokens JSONB DEFAULT '{}'::jsonb, -- {access_token, refresh_token, expires_at}

  -- Sync status
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT, -- success, error
  last_sync_error TEXT,
  sync_frequency TEXT DEFAULT 'real-time', -- real-time, hourly, daily

  -- Billing
  stripe_subscription_id TEXT,
  billing_status TEXT,

  -- Timestamps
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,

  UNIQUE(location_id, integration_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_location_integrations_location ON location_integrations(location_id);
CREATE INDEX IF NOT EXISTS idx_location_integrations_integration ON location_integrations(integration_id);
CREATE INDEX IF NOT EXISTS idx_location_integrations_status ON location_integrations(status);

-- ============================================================================
-- 8. WIDGET ANALYTICS (Installation & revenue metrics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS widget_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES marketplace_widgets(id) ON DELETE CASCADE,

  -- Date
  date DATE NOT NULL,

  -- Metrics
  total_installations INTEGER DEFAULT 0,
  active_installations INTEGER DEFAULT 0,
  new_installations INTEGER DEFAULT 0,
  churned_installations INTEGER DEFAULT 0,

  -- Revenue
  mrr NUMERIC(10, 2) DEFAULT 0, -- Monthly recurring revenue
  usage_revenue NUMERIC(10, 2) DEFAULT 0, -- Usage-based revenue

  -- Usage
  total_usage INTEGER DEFAULT 0,
  avg_usage_per_location NUMERIC(10, 2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(widget_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_widget_analytics_widget ON widget_analytics(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_date ON widget_analytics(date);

-- ============================================================================
-- SEED DATA: Core Widgets
-- ============================================================================

-- Gaming Widget
INSERT INTO marketplace_widgets (slug, name, category, description, price_monthly, features, active, featured)
VALUES (
  'gaming-widget',
  'Gaming Widget',
  'content',
  'Pre-built games with leaderboards and prizes',
  49,
  '["Pre-built games (trivia, memory match, spin-to-win)", "Leaderboards", "Prize redemption system", "Game analytics"]'::jsonb,
  true,
  true
) ON CONFLICT (slug) DO NOTHING;

-- Survey Widget
INSERT INTO marketplace_widgets (slug, name, category, description, price_monthly, features, active, featured)
VALUES (
  'survey-widget',
  'Survey Widget',
  'content',
  'Unlimited surveys with sentiment analysis',
  39,
  '["Unlimited surveys", "20+ question types", "Conditional logic", "Response export (CSV, Excel)", "Sentiment analysis"]'::jsonb,
  true,
  true
) ON CONFLICT (slug) DO NOTHING;

-- Video Widget
INSERT INTO marketplace_widgets (slug, name, category, description, price_monthly, features, active, featured)
VALUES (
  'video-widget',
  'Video Widget',
  'content',
  'Video playlist management and streaming',
  29,
  '["Video playlist management", "YouTube/Vimeo integration", "Custom video uploads (up to 10GB)", "Watch time analytics"]'::jsonb,
  true,
  true
) ON CONFLICT (slug) DO NOTHING;

-- Jukebox Widget
INSERT INTO marketplace_widgets (slug, name, category, description, price_monthly, features, active, featured)
VALUES (
  'jukebox-widget',
  'Jukebox Widget',
  'content',
  'Curated music playlists with licensing',
  99,
  '["Curated playlists by mood/genre", "Customer song requests", "Now playing display", "Music licensing compliance (ASCAP/BMI/SESAC)", "Spotify/Apple Music integration"]'::jsonb,
  true,
  true
) ON CONFLICT (slug) DO NOTHING;

-- Photo Booth Widget
INSERT INTO marketplace_widgets (slug, name, category, description, price_monthly, features, active, featured)
VALUES (
  'photo-booth-widget',
  'Photo Booth Widget',
  'content',
  'Selfie capture with branded frames',
  59,
  '["Selfie capture with filters", "Branded photo frames", "Instant SMS/email delivery", "Social media sharing", "Photo gallery display"]'::jsonb,
  true,
  true
) ON CONFLICT (slug) DO NOTHING;

-- POS Integration - Square
INSERT INTO marketplace_widgets (slug, name, category, description, price_monthly, features, active, featured)
VALUES (
  'square-pos-integration',
  'Square POS Integration',
  'integration',
  'Real-time menu sync and order placement',
  89,
  '["Real-time menu/inventory sync", "Order placement from kiosk", "Payment processing", "Transaction history", "OAuth 2.0 authentication"]'::jsonb,
  true,
  true
) ON CONFLICT (slug) DO NOTHING;

-- Email/SMS Widget
INSERT INTO marketplace_widgets (slug, name, category, description, price_monthly, features, active, featured, usage_based, usage_metric, usage_limit, overage_price)
VALUES (
  'email-sms-widget',
  'Email/SMS Widget',
  'marketing',
  'Automated campaigns and messaging',
  49,
  '["Automated campaigns (welcome, follow-up, winback)", "SMS delivery (photo booth, receipts, offers)", "Email capture and nurture", "Deliverability monitoring"]'::jsonb,
  true,
  true,
  true,
  'messages_sent',
  1000,
  0.01
) ON CONFLICT (slug) DO NOTHING;

-- Loyalty Widget
INSERT INTO marketplace_widgets (slug, name, category, description, price_monthly, features, active, featured)
VALUES (
  'loyalty-widget',
  'Loyalty Widget',
  'marketing',
  'Points, tiers, and rewards management',
  89,
  '["Points accumulation", "Tier management (Bronze, Silver, Gold)", "Reward redemption", "Birthday/anniversary bonuses", "Referral tracking"]'::jsonb,
  true,
  true
) ON CONFLICT (slug) DO NOTHING;

-- Insights Dashboard Widget
INSERT INTO marketplace_widgets (slug, name, category, description, price_monthly, features, active, featured)
VALUES (
  'insights-dashboard-widget',
  'Insights Dashboard Widget',
  'analytics',
  'Advanced analytics and custom reports',
  99,
  '["Advanced analytics (cohorts, funnels, retention)", "Custom reports", "Data export (CSV, API)", "Scheduled email reports"]'::jsonb,
  true,
  true
) ON CONFLICT (slug) DO NOTHING;

-- Upsell Engine Widget
INSERT INTO marketplace_widgets (slug, name, category, description, price_monthly, features, active, featured)
VALUES (
  'upsell-engine-widget',
  'Upsell Engine Widget',
  'revenue',
  'AI-powered product recommendations',
  69,
  '["AI-powered product recommendations", "Dynamic pricing/discounting", "A/B testing", "Conversion tracking", "12-18% avg conversion rate"]'::jsonb,
  true,
  true
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SEED DATA: Sample Integrations
-- ============================================================================

INSERT INTO marketplace_integrations (slug, name, category, description, price_monthly, api_type, oauth_supported, webhook_supported, industries)
VALUES
  ('square-pos', 'Square', 'pos', 'Point of sale and payment processing', 89, 'REST', true, true, '{restaurant,cafe,retail}'::text[]),
  ('salesforce-crm', 'Salesforce', 'crm', 'Customer relationship management', 69, 'REST', true, true, '{all}'::text[]),
  ('hubspot-crm', 'HubSpot', 'crm', 'Marketing and sales automation', 69, 'REST', true, true, '{all}'::text[]),
  ('mailchimp', 'Mailchimp', 'marketing', 'Email marketing platform', 49, 'REST', true, true, '{all}'::text[]),
  ('twilio', 'Twilio', 'communication', 'SMS and voice messaging', 49, 'REST', false, true, '{all}'::text[])
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SEED DATA: Sample Bundle (Restaurant)
-- ============================================================================

WITH restaurant_bundle AS (
  INSERT INTO marketplace_bundles (slug, name, industry, description, original_price, bundle_price, active, featured)
  VALUES (
    'restaurant-bundle',
    'Restaurant Bundle',
    'restaurant',
    'Complete restaurant kiosk package with games, surveys, jukebox, photo booth, Square POS, email/SMS, loyalty, and reviews',
    600,
    399,
    true,
    true
  )
  ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
  RETURNING id
)
INSERT INTO bundle_widgets (bundle_id, widget_id)
SELECT
  rb.id,
  w.id
FROM restaurant_bundle rb
CROSS JOIN marketplace_widgets w
WHERE w.slug IN ('gaming-widget', 'survey-widget', 'jukebox-widget', 'photo-booth-widget', 'square-pos-integration', 'email-sms-widget', 'loyalty-widget')
ON CONFLICT (bundle_id, widget_id) DO NOTHING;

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Get top widgets by installation count
CREATE OR REPLACE FUNCTION get_top_widgets(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  installation_count BIGINT,
  mrr NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.name,
    w.category,
    COUNT(lw.id) as installation_count,
    (w.price_monthly * COUNT(lw.id)) as mrr
  FROM marketplace_widgets w
  LEFT JOIN location_widgets lw ON lw.widget_id = w.id AND lw.status = 'active'
  GROUP BY w.id, w.name, w.category, w.price_monthly
  ORDER BY installation_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Calculate MRR for a location
CREATE OR REPLACE FUNCTION calculate_location_mrr(loc_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_mrr NUMERIC;
BEGIN
  SELECT COALESCE(SUM(w.price_monthly), 0)
  INTO total_mrr
  FROM location_widgets lw
  JOIN marketplace_widgets w ON w.id = lw.widget_id
  WHERE lw.location_id = loc_id
    AND lw.status = 'active';

  RETURN total_mrr;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp on widgets
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_marketplace_widgets_updated_at
BEFORE UPDATE ON marketplace_widgets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_integrations_updated_at
BEFORE UPDATE ON marketplace_integrations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_bundles_updated_at
BEFORE UPDATE ON marketplace_bundles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE marketplace_widgets IS 'Catalog of available widgets (features) that can be installed on kiosks';
COMMENT ON TABLE marketplace_integrations IS 'Catalog of available 3rd party integrations';
COMMENT ON TABLE marketplace_bundles IS 'Pre-configured widget packages for specific industries';
COMMENT ON TABLE bundle_widgets IS 'Junction table linking bundles to their included widgets';
COMMENT ON TABLE location_widgets IS 'Widgets installed at specific locations';
COMMENT ON TABLE widget_usage IS 'Usage tracking for usage-based billing widgets';
COMMENT ON TABLE location_integrations IS '3rd party service connections per location';
COMMENT ON TABLE widget_analytics IS 'Daily aggregated widget performance metrics';
