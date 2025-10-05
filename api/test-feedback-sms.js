// Test endpoint to debug feedback SMS flow
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Fetch settings
  const { data: settingsData } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'app')
    .single();
  
  const settings = settingsData?.value || {};
  
  const notificationType = settings.notificationType || 'sms';
  const shouldSendSMS = (notificationType === 'sms' || notificationType === 'both' || notificationType === 'all') && settings.notificationRecipients;
  
  const debugInfo = {
    settings: {
      notificationsEnabled: settings.notificationsEnabled,
      notifyOnFeedback: settings.notifyOnFeedback,
      notificationType: settings.notificationType,
      notificationRecipients: settings.notificationRecipients,
      twilioEnabled: settings.twilioEnabled,
    },
    willSendSMS: shouldSendSMS,
    baseUrl: 'https://chi-pins.vercel.app',
  };
  
  if (shouldSendSMS) {
    try {
      const smsResponse = await fetch('https://chi-pins.vercel.app/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: settings.notificationRecipients.split(',').map(n => n.trim()).filter(n => n),
          message: 'TEST: New Customer Feedback!\n\n⭐⭐⭐⭐⭐ (5/5)\n\nFrom: Test User\n\nComment: This is a test notification from the debug endpoint\n\nSubmitted: ' + new Date().toLocaleString(),
        }),
      });
      
      const smsResult = await smsResponse.text();
      debugInfo.smsResponse = {
        status: smsResponse.status,
        ok: smsResponse.ok,
        body: smsResult,
      };
    } catch (error) {
      debugInfo.smsError = error.message;
    }
  }
  
  return res.status(200).json(debugInfo);
}
