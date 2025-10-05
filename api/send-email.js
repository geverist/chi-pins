// api/send-email.js
// Vercel serverless function to send emails via SMTP

import nodemailer from 'nodemailer';

// Rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT = 20; // Max emails per window
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

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

  // Rate limiting
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  try {
    const { to, subject, html, text } = req.body;

    // Validate required fields
    if (!to || (!html && !text) || !subject) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['to', 'subject', 'html or text']
      });
    }

    // Get SMTP credentials from environment variables
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      SMTP_FROM,
      SMTP_SECURE
    } = process.env;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
      console.error('Missing SMTP configuration');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT),
      secure: SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    // Verify connection
    await transporter.verify();

    // Send email to each recipient
    const recipients = Array.isArray(to) ? to : [to];
    const results = [];

    for (const recipient of recipients) {
      try {
        const info = await transporter.sendMail({
          from: SMTP_FROM,
          to: recipient.trim(),
          subject: subject,
          text: text,
          html: html,
        });

        results.push({
          recipient,
          success: true,
          messageId: info.messageId
        });

        console.log('Email sent to', recipient, '- Message ID:', info.messageId);
      } catch (emailError) {
        console.error('Failed to send email to', recipient, ':', emailError);
        results.push({
          recipient,
          success: false,
          error: emailError.message
        });
      }
    }

    // Check if all emails failed
    const allFailed = results.every(r => !r.success);
    if (allFailed) {
      return res.status(500).json({
        error: 'Failed to send emails',
        results
      });
    }

    return res.status(200).json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
