// api/send-anonymous-message.js
// Secure endpoint for sending anonymous messages with rate limiting

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
    const { recipientPinSlug, message, senderContactInfo, recipientPhone, recipientEmail, maxMessagesPerDay = 5 } = req.body;

    if (!recipientPinSlug || !message || !senderContactInfo) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get the recipient pin
    const { data: pin, error: pinError } = await supabase
      .from('pins')
      .select('*')
      .eq('slug', recipientPinSlug)
      .single();

    if (pinError || !pin) {
      return res.status(404).json({ error: 'Pin not found' });
    }

    // Check if pin allows anonymous messages
    if (!pin.allow_anonymous_messages) {
      return res.status(403).json({ error: 'This pin does not accept anonymous messages' });
    }

    // Check if pin has contact info
    if (!pin.loyalty_phone && !pin.loyalty_email) {
      return res.status(403).json({ error: 'Pin owner has no contact information' });
    }

    // Check rate limit - count messages sent to this pin in the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: recentMessages, error: countError } = await supabase
      .from('anonymous_messages')
      .select('id')
      .eq('recipient_pin_slug', recipientPinSlug)
      .gte('created_at', oneDayAgo.toISOString());

    if (countError) {
      console.error('Error counting messages:', countError);
    }

    const messageCount = recentMessages?.length || 0;
    if (messageCount >= maxMessagesPerDay) {
      return res.status(429).json({
        error: `Rate limit exceeded. This pin can only receive ${maxMessagesPerDay} messages per day.`,
        messagesReceived: messageCount,
        limit: maxMessagesPerDay
      });
    }

    // Log the message to database
    const { error: logError } = await supabase
      .from('anonymous_messages')
      .insert({
        recipient_pin_slug: recipientPinSlug,
        message: message,
        sender_contact: senderContactInfo,
        created_at: new Date().toISOString(),
      });

    if (logError) {
      console.error('Error logging message:', logError);
    }

    // Send the message
    const recipientContact = recipientEmail || recipientPhone || pin.loyalty_email || pin.loyalty_phone;
    const contactType = (recipientEmail || pin.loyalty_email) ? 'email' : 'sms';

    if (contactType === 'email') {
      // Send email via backend (implement later)
      // For now, just log it
      console.log(`Would send email to ${recipientContact}: ${message}`);
      return res.status(200).json({
        success: true,
        method: 'email',
        messagesRemaining: maxMessagesPerDay - messageCount - 1
      });
    } else {
      // Send SMS via Twilio
      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
      const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN?.trim();
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim();

      if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
        return res.status(500).json({ error: 'SMS service not configured' });
      }

      const formattedMessage = `Anonymous message about your pin:\n\n"${message}"\n\nReply to: ${senderContactInfo}\n\n---\nSent via Chicago Mike's Kiosk`;

      const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: twilioPhoneNumber,
          To: recipientContact,
          Body: formattedMessage,
        }),
      });

      if (!twilioResponse.ok) {
        const errorData = await twilioResponse.json().catch(() => ({}));
        console.error('Twilio error:', errorData);
        return res.status(500).json({ error: 'Failed to send SMS' });
      }

      return res.status(200).json({
        success: true,
        method: 'sms',
        messagesRemaining: maxMessagesPerDay - messageCount - 1
      });
    }
  } catch (error) {
    console.error('Error sending anonymous message:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
