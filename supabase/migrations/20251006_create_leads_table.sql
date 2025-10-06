-- Create leads table for demo requests
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contact Information
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT NOT NULL,

  -- Business Details
  industry TEXT NOT NULL,
  locations INTEGER NOT NULL DEFAULT 1,

  -- Lead Source & Status
  source TEXT DEFAULT 'website',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'demo_scheduled', 'demo_completed', 'proposal_sent', 'closed_won', 'closed_lost')),

  -- Metadata
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  ip_address INET,
  user_agent TEXT,

  -- Notes & Follow-up
  notes TEXT,
  follow_up_date DATE,
  assigned_to UUID REFERENCES auth.users(id),

  -- Timestamps for status changes
  contacted_at TIMESTAMPTZ,
  qualified_at TIMESTAMPTZ,
  demo_scheduled_at TIMESTAMPTZ,
  demo_completed_at TIMESTAMPTZ,
  proposal_sent_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  -- Calculated fields
  estimated_mrr NUMERIC(10, 2),
  estimated_ltv NUMERIC(10, 2)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_industry ON public.leads(industry);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert leads (for public form submissions)
CREATE POLICY "Anyone can insert leads"
  ON public.leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can view all leads
CREATE POLICY "Authenticated users can view all leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update all leads
CREATE POLICY "Authenticated users can update all leads"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- Create function to auto-update status timestamps
CREATE OR REPLACE FUNCTION update_leads_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    CASE NEW.status
      WHEN 'contacted' THEN NEW.contacted_at = NOW();
      WHEN 'qualified' THEN NEW.qualified_at = NOW();
      WHEN 'demo_scheduled' THEN NEW.demo_scheduled_at = NOW();
      WHEN 'demo_completed' THEN NEW.demo_completed_at = NOW();
      WHEN 'proposal_sent' THEN NEW.proposal_sent_at = NOW();
      WHEN 'closed_won' THEN NEW.closed_at = NOW();
      WHEN 'closed_lost' THEN NEW.closed_at = NOW();
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status timestamp updates
CREATE TRIGGER update_leads_status_timestamps
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION update_leads_status_timestamps();

-- Add comment
COMMENT ON TABLE public.leads IS 'Demo requests and sales leads from marketing site';
