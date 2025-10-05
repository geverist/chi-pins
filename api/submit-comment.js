// api/submit-comment.js
// Vercel serverless function to handle customer comments/feedback

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

  // Try both VITE_ prefixed and non-prefixed env vars
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing Supabase credentials:', {
      hasUrl: !!SUPABASE_URL,
      hasKey: !!SUPABASE_ANON_KEY
    });
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const { name, contact, contactType, comment, rating, timestamp } = req.body;

    // Validate required fields
    if (!comment || !rating) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['comment', 'rating']
      });
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Insert comment into database
    const { data, error } = await supabase
      .from('comments')
      .insert([
        {
          name: name || 'Anonymous',
          contact: contact || null,
          contact_type: contactType || null,
          comment: comment,
          rating: rating,
          created_at: timestamp || new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message || 'Failed to save comment');
    }

    // Send SMS notification to business owner
    try {
      // Fetch admin settings to get Twilio config
      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .single();

      if (settingsData &&
          settingsData.notifications_enabled &&
          (settingsData.notification_type === 'sms' || settingsData.notification_type === 'both') &&
          settingsData.notification_recipients) {

        // Format the SMS message
        const ratingStars = '⭐'.repeat(rating);
        const message = `New Customer Feedback!\n\n${ratingStars} (${rating}/5)\n\nFrom: ${name || 'Anonymous'}${contact ? `\nContact: ${contact}` : ''}\n\nComment: ${comment}\n\nSubmitted: ${new Date(timestamp || Date.now()).toLocaleString()}`;

        // Send SMS via our existing send-sms API (credentials managed on backend)
        const smsResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/send-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: settingsData.notification_recipients.split(',').map(n => n.trim()).filter(n => n),
            message: message,
          }),
        });

        if (!smsResponse.ok) {
          console.error('Failed to send SMS notification:', await smsResponse.text());
        } else {
          console.log('SMS notification sent successfully');
        }
      }
    } catch (notifError) {
      // Log but don't fail the request if notification fails
      console.error('Error sending notification:', notifError);
    }

    return res.status(200).json({
      success: true,
      comment: data,
    });

  } catch (error) {
    console.error('Error submitting comment:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
