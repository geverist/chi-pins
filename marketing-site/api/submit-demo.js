// Vercel Serverless Function for demo form submission
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Initialize Supabase client
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );

        // Extract form data
        const { name, email, phone, industry, locations, company } = req.body;

        // Validate required fields
        if (!name || !email || !phone || !industry || !company) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['name', 'email', 'phone', 'industry', 'company']
            });
        }

        // Insert lead into Supabase
        const { data, error } = await supabase
            .from('demo_leads')
            .insert([
                {
                    name,
                    email,
                    phone,
                    industry,
                    locations: locations || 1,
                    company,
                    source: 'marketing_site',
                    status: 'new',
                    created_at: new Date().toISOString()
                }
            ])
            .select();

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ error: 'Failed to save lead' });
        }

        // TODO: Send notification email to sales team
        // TODO: Send welcome email to lead
        // TODO: Add to CRM (HubSpot/Salesforce integration)

        return res.status(200).json({
            success: true,
            message: 'Demo request submitted successfully',
            leadId: data[0].id
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
