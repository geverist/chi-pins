#!/usr/bin/env node
// Test script to trigger a CRITICAL error for autonomous healer testing
import 'dotenv/config';

console.log('🧪 Triggering test CRITICAL error for autonomous healer...\n');

// Simulate a realistic error that would occur in production
async function testFunction() {
  // This will cause: TypeError: Cannot read property 'length' of undefined
  const data = undefined;
  console.log('Data length:', data.length); // BUG: accessing property of undefined
}

// Send error to console webhook
async function sendError(error) {
  try {
    const response = await fetch('https://chi-pins.vercel.app/api/webhook-processor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [
          {
            level: 'error',
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            url: 'scripts/trigger-test-error.js',
            userAgent: 'test-script/1.0',
          }
        ],
        source: 'test-script',
        tenantId: 'chicago-mikes',
      })
    });

    if (response.ok) {
      console.log('✅ Error sent to webhook successfully');
      console.log('📊 Error should appear in error_log table');
      console.log('🤖 Autonomous healer will detect and fix it\n');
    } else {
      console.log('❌ Failed to send error:', await response.text());
    }
  } catch (err) {
    console.error('Failed to send error to webhook:', err);
  }
}

// Run the test
try {
  await testFunction();
} catch (error) {
  console.log('Error caught:', error.message);
  console.log('Stack:', error.stack.split('\n')[0], '\n');
  await sendError(error);
}

console.log('Test complete. Check:');
console.log('1. node scripts/check-all-errors.js');
console.log('2. pm2 logs autonomous-healer --lines 50');
