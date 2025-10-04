// api/test-twilio.js
// Test endpoint to verify Twilio configuration

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Fetch admin settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .single();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      return res.status(500).json({
        error: 'Failed to fetch settings',
        details: settingsError.message,
      });
    }

    // Check Twilio configuration
    const twilioConfig = {
      notifications_enabled: settingsData.notifications_enabled,
      notification_type: settingsData.notification_type,
      has_account_sid: !!settingsData.twilio_account_sid,
      account_sid_length: settingsData.twilio_account_sid?.length,
      account_sid_prefix: settingsData.twilio_account_sid?.substring(0, 4),
      has_auth_token: !!settingsData.twilio_auth_token,
      auth_token_length: settingsData.twilio_auth_token?.length,
      has_phone_number: !!settingsData.twilio_phone_number,
      phone_number: settingsData.twilio_phone_number,
      has_recipients: !!settingsData.notification_recipients,
      recipients: settingsData.notification_recipients?.split(',').map(n => n.trim()).filter(n => n),
    };

    console.log('Twilio configuration check:', twilioConfig);

    // If this is a POST request, send a test SMS
    if (req.method === 'POST') {
      if (!settingsData.twilio_account_sid ||
          !settingsData.twilio_auth_token ||
          !settingsData.twilio_phone_number ||
          !settingsData.notification_recipients) {
        return res.status(400).json({
          error: 'Twilio not fully configured',
          config: twilioConfig,
        });
      }

      const testMessage = `Test SMS from Chi-Pins\n\nSent at: ${new Date().toLocaleString()}\n\nIf you received this, your Twilio configuration is working correctly!`;

      console.log('Sending test SMS...');

      const smsResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountSid: settingsData.twilio_account_sid,
          authToken: settingsData.twilio_auth_token,
          from: settingsData.twilio_phone_number,
          to: settingsData.notification_recipients.split(',').map(n => n.trim()).filter(n => n),
          message: testMessage,
        }),
      });

      const smsResult = await smsResponse.json();

      console.log('Test SMS result:', smsResult);

      if (!smsResponse.ok) {
        return res.status(500).json({
          error: 'Failed to send test SMS',
          config: twilioConfig,
          smsError: smsResult,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Test SMS sent successfully',
        config: twilioConfig,
        result: smsResult,
      });
    }

    // GET request - just return configuration
    return res.status(200).json({
      success: true,
      config: twilioConfig,
      message: 'Send a POST request to this endpoint to send a test SMS',
    });

  } catch (error) {
    console.error('Error testing Twilio:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: error.stack,
    });
  }
}
