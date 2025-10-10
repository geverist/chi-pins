// api/screenshot-mms.js
// Sends MMS with screenshot via Twilio
// Usage: POST /api/screenshot-mms with { imageBase64, message }

import twilio from 'twilio';
import { writeFileSync } from 'fs';
import { join } from 'path';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const toNumber = process.env.ALERT_PHONE || '+17204507540';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, message = 'Screenshot from kiosk' } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'Missing imageBase64 parameter' });
  }

  if (!accountSid || !authToken || !fromNumber) {
    return res.status(500).json({ error: 'Twilio not configured' });
  }

  try {
    // Save screenshot to public directory
    const filename = `screenshot-${Date.now()}.png`;
    const imagePath = join(process.cwd(), 'public', filename);
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    writeFileSync(imagePath, imageBuffer);

    // Get public URL for the image
    const imageUrl = `${req.headers.origin || 'https://chi-pins.vercel.app'}/` + filename;

    // Send MMS via Twilio
    const client = twilio(accountSid, authToken);
    const messageResult = await client.messages.create({
      body: message,
      from: fromNumber,
      to: toNumber,
      mediaUrl: [imageUrl]
    });

    console.log('MMS sent:', messageResult.sid);

    return res.status(200).json({
      success: true,
      messageSid: messageResult.sid,
      imageUrl
    });

  } catch (error) {
    console.error('Failed to send screenshot MMS:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
