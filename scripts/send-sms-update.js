#!/usr/bin/env node
// Send SMS update about task completion
// Usage: node scripts/send-sms-update.js <message>

import 'dotenv/config';

const toNumber = process.env.ALERT_PHONE || '+17204507540';
const apiUrl = process.env.VITE_APP_URL || 'https://chi-pins.vercel.app';

const message = process.argv.slice(2).join(' ');

if (!message) {
  console.error('❌ Usage: node scripts/send-sms-update.js <message>');
  process.exit(1);
}

async function sendSMS() {
  console.log(`📱 Sending SMS to ${toNumber}...`);

  try {
    const response = await fetch(`${apiUrl}/api/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: toNumber,
        message: message,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Failed to send SMS');
    }

    const result = await response.json();
    console.log(`✅ SMS sent! Details:`, result);
  } catch (error) {
    console.error('❌ Failed to send SMS:', error.message);
    process.exit(1);
  }
}

sendSMS();
