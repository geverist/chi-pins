// api/send-sms.js
// Vercel serverless function to send SMS via Twilio

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
    // Get Twilio credentials from environment variables (secure, backend-only)
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhone) {
      console.error('Twilio credentials not configured in environment variables');
      return res.status(500).json({
        error: 'SMS service not configured',
        details: 'Administrator needs to configure Twilio credentials'
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

    console.log('send-sms: Sending to recipients:', recipients);

    // Send SMS to each recipient using Twilio REST API
    const results = await Promise.allSettled(
      recipients.map(async (recipient) => {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

        console.log('send-sms: Preparing to send SMS', {
          twilioUrl,
          to: recipient,
          from,
        });

        const formData = new URLSearchParams();
        formData.append('To', recipient);
        formData.append('From', twilioPhone);
        formData.append('Body', message);

        console.log('send-sms: Form data prepared');

        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        });

        console.log('send-sms: Twilio API response', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('send-sms: Twilio API error response:', errorText);

          let errorData = {};
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { raw: errorText };
          }

          throw new Error(errorData.message || errorData.raw || `Twilio API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('send-sms: Message sent successfully', {
          sid: result.sid,
          to: result.to,
          status: result.status,
        });

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
