// api/send-sms.js
// Vercel serverless function to send SMS via Twilio

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let accountSid = process.env.TWILIO_ACCOUNT_SID;
    let authToken = process.env.TWILIO_AUTH_TOKEN;
    let twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    // If not in env vars, try to get from admin settings in database
    if (!accountSid || !authToken || !twilioPhone) {
      console.log('Twilio credentials not in env vars, checking admin settings...');

      const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        const { data: settingsData } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'app')
          .single();

        const settings = settingsData?.value || {};

        if (settings.twilioEnabled) {
          accountSid = settings.twilioAccountSid;
          authToken = settings.twilioAuthToken;
          twilioPhone = settings.twilioPhoneNumber;
          console.log('Using Twilio credentials from admin settings');
        }
      }
    }

    if (!accountSid || !authToken || !twilioPhone) {
      console.error('Twilio credentials not configured');
      return res.status(500).json({
        error: 'SMS service not configured',
        details: 'Administrator needs to configure Twilio credentials in Admin Panel'
      });
    }

    const { to, message } = req.body;

    // Validate required fields from request
    if (!to || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['to', 'message']
      });
    }

    // Ensure 'to' is an array
    const recipients = Array.isArray(to) ? to : [to];

    if (recipients.length === 0) {
      console.error('send-sms: No recipients specified');
      return res.status(400).json({ error: 'No recipients specified' });
    }

    // Send SMS to each recipient using Twilio REST API
    const results = await Promise.allSettled(
      recipients.map(async (recipient) => {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

        const formData = new URLSearchParams();
        formData.append('To', recipient);
        formData.append('From', twilioPhone);
        formData.append('Body', message);

        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('send-sms: Twilio API error:', response.status, errorText);

          let errorData = {};
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { raw: errorText };
          }

          throw new Error(errorData.message || errorData.raw || `Twilio API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        return result;
      })
    );

    // Check if any messages succeeded
    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    if (successful.length === 0) {
      return res.status(500).json({
        error: 'All messages failed to send',
        failures: failed.map(f => f.reason?.message || 'Unknown error'),
      });
    }

    return res.status(200).json({
      success: true,
      sent: successful.length,
      failed: failed.length,
      details: {
        successful: successful.map(r => r.value),
        failures: failed.map(f => ({
          error: f.reason?.message || 'Unknown error',
        })),
      },
    });

  } catch (error) {
    console.error('Error sending SMS:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
