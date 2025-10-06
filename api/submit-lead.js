// api/submit-lead.js
// Serverless function to handle lead form submissions

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, phone, company, industry, locations, utm_source, utm_medium, utm_campaign } = req.body;

    // Validate required fields
    if (!name || !email || !company || !industry) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'email', 'company', 'industry']
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get client IP and user agent
    const ip_address = req.headers['x-forwarded-for']?.split(',')[0] ||
                       req.headers['x-real-ip'] ||
                       req.connection?.remoteAddress;
    const user_agent = req.headers['user-agent'];
    const referrer = req.headers['referer'] || req.headers['referrer'];

    // Calculate estimated MRR based on industry and locations
    const estimatedMRR = calculateEstimatedMRR(industry, locations || 1);

    // Insert lead into database
    const { data, error } = await supabase
      .from('leads')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        company: company.trim(),
        industry: industry.toLowerCase(),
        locations: parseInt(locations) || 1,
        source: 'website',
        status: 'new',
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        referrer: referrer || null,
        ip_address: ip_address || null,
        user_agent: user_agent || null,
        estimated_mrr: estimatedMRR,
        estimated_ltv: estimatedMRR * 36 // 3-year LTV estimate
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to save lead' });
    }

    // TODO: Send notification email to sales team
    // TODO: Send confirmation email to lead
    // TODO: Trigger Slack notification

    return res.status(200).json({
      success: true,
      leadId: data.id,
      message: 'Thank you! We\'ll contact you within 24 hours.'
    });

  } catch (err) {
    console.error('Lead submission error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Calculate estimated MRR based on industry and number of locations
function calculateEstimatedMRR(industry, locations) {
  const basePricing = {
    'restaurant': 399,
    'medspa': 799,
    'med spa': 799,
    'auto': 899,
    'healthcare': 699,
    'fitness': 699,
    'retail': 499,
    'banking': 549,
    'events': 599,
  };

  const basePrice = basePricing[industry.toLowerCase()] || 499;

  // Apply volume discounts
  let discount = 1.0;
  if (locations >= 51) discount = 0.65;
  else if (locations >= 16) discount = 0.70;
  else if (locations >= 6) discount = 0.80;
  else if (locations >= 2) discount = 0.90;

  return Math.round(basePrice * locations * discount);
}
