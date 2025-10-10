#!/usr/bin/env node
// scripts/deploy-server.js - Local deployment webhook server
// Runs on your Mac, receives webhook from Vercel, deploys to kiosk
//
// Usage:
//   node scripts/deploy-server.js
//
// Then update SMS webhook to call this instead of GitHub Actions

import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();
const PORT = 3001;

app.use(express.json());

let deploymentInProgress = false;

// Webhook endpoint that Vercel can call
app.post('/deploy', async (req, res) => {
  // Verify request is from authorized source
  const authToken = req.headers['authorization'];
  if (authToken !== `Bearer ${process.env.DEPLOY_WEBHOOK_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (deploymentInProgress) {
    return res.status(409).json({
      error: 'Deployment already in progress',
      message: 'Please wait for current deployment to complete'
    });
  }

  const { device_ip = '192.168.2.112:38081' } = req.body;

  // Start deployment asynchronously
  deploymentInProgress = true;
  res.json({
    success: true,
    message: 'Deployment started',
    device: device_ip
  });

  try {
    console.log(`[${new Date().toISOString()}] Starting deployment to ${device_ip}`);

    // Run the deployment script
    const javaHome = '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home';
    const { stdout, stderr } = await execAsync(
      `JAVA_HOME=${javaHome} ./scripts/deploy-kiosk.sh ${device_ip}`,
      {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      }
    );

    console.log('Deployment stdout:', stdout);
    if (stderr) console.log('Deployment stderr:', stderr);

    console.log(`[${new Date().toISOString()}] Deployment completed successfully`);
    deploymentInProgress = false;

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Deployment failed:`, error);
    deploymentInProgress = false;

    // Send failure SMS
    try {
      await sendSMS(`❌ Kiosk deployment failed!\n\nError: ${error.message}`);
    } catch (smsError) {
      console.error('Failed to send failure SMS:', smsError);
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    deploymentInProgress,
    timestamp: new Date().toISOString()
  });
});

// Helper to send SMS
async function sendSMS(message) {
  const response = await fetch('https://chi-pins.vercel.app/api/send-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: process.env.ALERT_PHONE || '+17204507540',
      message
    })
  });
  return response.json();
}

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Deployment server running on port ${PORT}

Webhook URL: http://localhost:${PORT}/deploy
Health check: http://localhost:${PORT}/health

Make sure to:
1. Set DEPLOY_WEBHOOK_SECRET environment variable
2. Keep this server running
3. Update SMS webhook to call this endpoint

To expose publicly (for Vercel to reach):
- Use ngrok: ngrok http ${PORT}
- Use Cloudflare Tunnel
- Port forward on your router
  `);
});
