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

    // Send notifications to business owner
    try {
      // Fetch admin settings to get notification config
      const { data: settingsData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'app')
        .single();

      const settings = settingsData?.value || {};

      console.log('[submit-comment] Settings:', {
        notificationsEnabled: settings.notificationsEnabled,
        notifyOnFeedback: settings.notifyOnFeedback,
        notificationType: settings.notificationType,
        hasNotificationRecipients: !!settings.notificationRecipients,
        notificationRecipients: settings.notificationRecipients,
      });

      if (settings.notificationsEnabled && settings.notifyOnFeedback !== false) {
        const notificationType = settings.notificationType || 'sms';
        const ratingStars = '⭐'.repeat(rating);

        console.log('[submit-comment] Will attempt to send notifications. Type:', notificationType);

        // Format message for notifications
        const messageText = `New Customer Feedback!\n\n${ratingStars} (${rating}/5)\n\nFrom: ${name || 'Anonymous'}${contact ? `\nContact: ${contact}` : ''}\n\nComment: ${comment}\n\nSubmitted: ${new Date(timestamp || Date.now()).toLocaleString()}`;

        const messageHtml = `
          <h2>🎉 New Customer Feedback!</h2>
          <p><strong>Rating:</strong> ${ratingStars} (${rating}/5)</p>
          <p><strong>From:</strong> ${name || 'Anonymous'}</p>
          ${contact ? `<p><strong>Contact:</strong> ${contact}</p>` : ''}
          <p><strong>Comment:</strong></p>
          <blockquote style="border-left: 3px solid #3b82f6; padding-left: 12px; margin: 12px 0; color: #555;">
            ${comment}
          </blockquote>
          <p style="color: #888; font-size: 12px;">Submitted: ${new Date(timestamp || Date.now()).toLocaleString()}</p>
        `;

        // Use the production URL directly - VERCEL_URL can be unreliable in serverless functions
        const baseUrl = 'https://chi-pins.vercel.app';

        // Send SMS notification
        if ((notificationType === 'sms' || notificationType === 'both' || notificationType === 'all') && settings.notificationRecipients) {
          console.log('[submit-comment] Sending SMS to:', settings.notificationRecipients);
          console.log('[submit-comment] SMS URL:', `${baseUrl}/api/send-sms`);
          console.log('[submit-comment] Message preview:', messageText.substring(0, 100));
          try {
            const smsResponse = await fetch(`${baseUrl}/api/send-sms`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: settings.notificationRecipients.split(',').map(n => n.trim()).filter(n => n),
                message: messageText,
              }),
            });

            console.log('[submit-comment] SMS response status:', smsResponse.status);
            const smsResult = await smsResponse.text();
            console.log('[submit-comment] SMS response body:', smsResult);

            if (!smsResponse.ok) {
              console.error('[submit-comment] Failed to send SMS notification. Status:', smsResponse.status, 'Body:', smsResult);
            } else {
              console.log('[submit-comment] SMS notification sent successfully!');
            }
          } catch (smsError) {
            console.error('[submit-comment] Error sending SMS notification:', smsError.message, smsError.stack);
          }
        } else {
          console.log('[submit-comment] SMS notification skipped. Type:', notificationType, 'hasRecipients:', !!settings.notificationRecipients);
        }

        // Send Email notification
        if ((notificationType === 'email' || notificationType === 'both' || notificationType === 'all') && settings.emailRecipients) {
          try {
            const emailResponse = await fetch(`${baseUrl}/api/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: settings.emailRecipients.split(',').map(e => e.trim()).filter(e => e),
                subject: `⭐ New Feedback: ${rating}/5 - ${name || 'Anonymous'}`,
                html: messageHtml,
                text: messageText,
              }),
            });

            if (!emailResponse.ok) {
              console.error('Failed to send email notification:', await emailResponse.text());
            } else {
              console.log('Email notification sent successfully');
            }
          } catch (emailError) {
            console.error('Error sending email notification:', emailError);
          }
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
