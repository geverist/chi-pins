#!/usr/bin/env node
// Trigger the exact error from App.jsx for autonomous healer testing
import 'dotenv/config';

console.log('🧪 Triggering App.jsx coordinate validation error...\n');

const testError = {
  message: "Cannot read properties of undefined (reading 'lat')",
  stack: `TypeError: Cannot read properties of undefined (reading 'lat')
    at validatePinCoordinates (src/App.jsx:363:19)
    at Timeout._onTimeout (src/App.jsx:374:7)
    at listOnTimeout (node:internal/timers:573:17)
    at processTimers (node:internal/timers:514:7)`,
};

async function sendError() {
  try {
    const response = await fetch('https://chi-pins.vercel.app/api/webhook-processor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [{
          level: 'error',
          message: testError.message,
          stack: testError.stack,
          timestamp: new Date().toISOString(),
          url: 'https://chi-pins.vercel.app',
          userAgent: 'Mozilla/5.0 (test-kiosk)',
        }],
        source: 'kiosk-1',
        tenantId: 'chicago-mikes',
      })
    });

    if (response.ok) {
      console.log('✅ Error sent to webhook successfully');
      console.log('📊 Error should appear in error_log table');
      console.log('🤖 Autonomous healer will detect and fix it in ~60s\n');
      console.log('Monitor with: pm2 logs autonomous-healer --lines 50');
    } else {
      console.log('❌ Failed:', await response.text());
    }
  } catch (err) {
    console.error('Failed:', err);
  }
}

await sendError();
