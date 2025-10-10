#!/usr/bin/env node
// Send SMS update about task completion
// Usage: node scripts/send-sms-update.js <message>

import 'dotenv/config';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const toNumber = process.env.ALERT_PHONE || '+17204507540';

const message = process.argv.slice(2).join(' ');

if (!message) {
  console.error('❌ Usage: node scripts/send-sms-update.js <message>');
  process.exit(1);
}

if (!accountSid || !authToken || !fromNumber) {
  console.error('❌ Twilio credentials not configured');
  process.exit(1);
}

async function sendSMS() {
  console.log(`📱 Sending SMS to ${toNumber}...`);

  try {
    const client = twilio(accountSid, authToken);
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: toNumber
    });

    console.log(`✅ SMS sent! SID: ${result.sid}`);
  } catch (error) {
    console.error('❌ Failed to send SMS:', error.message);
    process.exit(1);
  }
}

sendSMS();
