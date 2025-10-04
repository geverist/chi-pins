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
    const { accountSid, authToken, from, to, message } = req.body;

    // Validate required fields
    if (!accountSid || !authToken || !from || !to || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['accountSid', 'authToken', 'from', 'to', 'message']
      });
    }

    // Ensure 'to' is an array
    const recipients = Array.isArray(to) ? to : [to];

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients specified' });
    }

    // Send SMS to each recipient using Twilio REST API
    const results = await Promise.allSettled(
      recipients.map(async (recipient) => {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

        const formData = new URLSearchParams();
        formData.append('To', recipient);
        formData.append('From', from);
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
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Twilio API error: ${response.status}`);
        }

        return await response.json();
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
