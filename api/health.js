// api/health.js - Comprehensive health check endpoint
// Tests all critical systems and returns detailed status
// Can be monitored by UptimeRobot, Better Uptime, etc.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const startTime = Date.now();
  const healthChecks = {};
  let overallHealthy = true;

  // 1. DATABASE CHECK - Test Supabase connection
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase
      .from('pins')
      .select('id')
      .limit(1);

    if (error) throw error;

    healthChecks.database = {
      status: 'healthy',
      message: 'Database connection successful',
      responseTime: Date.now() - startTime
    };
  } catch (err) {
    overallHealthy = false;
    healthChecks.database = {
      status: 'unhealthy',
      message: `Database error: ${err.message}`,
      responseTime: Date.now() - startTime
    };
  }

  // 2. ADMIN SETTINGS CHECK - Ensure settings table is accessible
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'app')
      .maybeSingle();

    if (error) throw error;

    healthChecks.adminSettings = {
      status: 'healthy',
      message: 'Admin settings accessible',
      hasConfig: !!data
    };
  } catch (err) {
    overallHealthy = false;
    healthChecks.adminSettings = {
      status: 'unhealthy',
      message: `Settings error: ${err.message}`
    };
  }

  // 3. TWILIO CHECK - Test Twilio credentials (if configured)
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      // Test auth by fetching account info
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
        }
      });

      if (!response.ok) throw new Error(`Twilio API returned ${response.status}`);

      healthChecks.twilio = {
        status: 'healthy',
        message: 'Twilio credentials valid'
      };
    } catch (err) {
      healthChecks.twilio = {
        status: 'warning',
        message: `Twilio check failed: ${err.message}`
      };
    }
  } else {
    healthChecks.twilio = {
      status: 'not_configured',
      message: 'Twilio credentials not set (optional)'
    };
  }

  // 4. ENVIRONMENT VARIABLES CHECK
  const requiredEnvVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_TENANT_ID'
  ];

  const missingVars = requiredEnvVars.filter(v => !process.env[v]);

  if (missingVars.length > 0) {
    overallHealthy = false;
    healthChecks.environment = {
      status: 'unhealthy',
      message: `Missing required environment variables: ${missingVars.join(', ')}`
    };
  } else {
    healthChecks.environment = {
      status: 'healthy',
      message: 'All required environment variables set'
    };
  }

  // 5. MEMORY CHECK (Node.js process memory)
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  };

  const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

  healthChecks.memory = {
    status: heapUsagePercent > 90 ? 'warning' : 'healthy',
    message: `Heap usage: ${heapUsagePercent.toFixed(1)}%`,
    details: memUsageMB
  };

  // Calculate overall response time
  const totalResponseTime = Date.now() - startTime;

  // Build response
  const response = {
    status: overallHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    responseTime: totalResponseTime,
    checks: healthChecks,
    version: process.env.npm_package_version || 'unknown',
    environment: process.env.NODE_ENV || 'production'
  };

  // Set HTTP status based on health
  const httpStatus = overallHealthy ? 200 : 503;

  res.status(httpStatus).json(response);
}
