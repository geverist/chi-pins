-- EngageOS Marketing Site - Demo Leads Table
-- Run this in your Supabase SQL editor

-- Create demo_leads table
CREATE TABLE IF NOT EXISTS demo_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    industry TEXT NOT NULL,
    locations INTEGER DEFAULT 1,
    company TEXT NOT NULL,
    source TEXT DEFAULT 'marketing_site',
    status TEXT DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_demo_leads_email ON demo_leads(email);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_demo_leads_status ON demo_leads(status);

-- Create index on industry for analytics
CREATE INDEX IF NOT EXISTS idx_demo_leads_industry ON demo_leads(industry);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_demo_leads_updated_at
    BEFORE UPDATE ON demo_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE demo_leads ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (API access only)
CREATE POLICY "Service role can do everything"
    ON demo_leads
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create policy for authenticated users (read-only for sales team dashboard)
CREATE POLICY "Authenticated users can read all leads"
    ON demo_leads
    FOR SELECT
    TO authenticated
    USING (true);

-- Comments for documentation
COMMENT ON TABLE demo_leads IS 'Stores demo requests from marketing website';
COMMENT ON COLUMN demo_leads.status IS 'Status: new, contacted, qualified, demo_scheduled, closed_won, closed_lost';
COMMENT ON COLUMN demo_leads.source IS 'Where the lead came from: marketing_site, roi_calculator, referral, etc.';
