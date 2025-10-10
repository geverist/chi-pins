// Test the console webhook functionality
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const WEBHOOK_URL = 'https://chi-pins.vercel.app/api/webhook-processor';

async function testWebhook() {
  console.log('🧪 Testing webhook processor...\n');

  const testPayload = {
    events: [
      {
        level: 'error',
        message: 'CRITICAL TEST: Cannot read properties of undefined (reading "x")',
        stack: 'TypeError: Cannot read properties of undefined (reading "x")\n    at testFunction (src/App.jsx:100:25)',
        timestamp: new Date().toISOString(),
        url: 'test-script',
        userAgent: 'test-script/1.0',
      },
    ],
    source: 'test-kiosk',
    tenantId: 'chicago-mikes',
  };

  console.log('Sending test error to:', WEBHOOK_URL);
  console.log('Payload:', JSON.stringify(testPayload, null, 2));

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    const data = await response.text();

    console.log('\n📡 Response:', response.status, response.statusText);
    console.log('Body:', data);

    if (response.ok) {
      console.log('\n✅ Webhook test successful!');
      console.log('   Error should now appear in error_log table');
      console.log('   Check with: node scripts/check-errors.js');
    } else {
      console.log('\n❌ Webhook test failed');
      console.log('   Status:', response.status);
      console.log('   Response:', data);
    }
  } catch (err) {
    console.error('\n❌ Webhook request failed:', err);
    console.error('   Make sure the webhook processor API is deployed');
  }
}

testWebhook();
