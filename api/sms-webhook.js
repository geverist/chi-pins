// api/sms-webhook.js - Twilio SMS webhook receiver
// Receives incoming SMS messages and processes commands
//
// Twilio Setup:
// 1. Go to Twilio Console → Phone Numbers → Your Number
// 2. Set "A MESSAGE COMES IN" webhook to:
//    https://chi-pins.vercel.app/api/sms-webhook
// 3. Method: POST
// 4. Save
//
// Commands:
//   status - Get current system status
//   health - Run health check
//   errors - Get recent errors
//   logs - Get recent logs
//   fix - Trigger auto-fix for last error
//   deploy - Show latest deployment info
//   help - Show available commands

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only accept POST requests from Twilio
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    // Parse Twilio webhook data
    const {
      From: from,
      To: to,
      Body: body,
      MessageSid: messageSid,
    } = req.body;

    console.log(`[SMS Webhook] Received from ${from}: ${body}`);

    // Verify this is from the authorized phone number
    const authorizedPhone = process.env.ALERT_PHONE || '+17204507540';
    if (from !== authorizedPhone) {
      console.log(`[SMS Webhook] Unauthorized number: ${from}`);
      return sendTwiMLResponse(res,
        '🚫 Unauthorized. This number is not authorized to control the kiosk system.'
      );
    }

    // Parse command from message body
    const command = body.trim().toLowerCase();
    const response = await processCommand(command, from);

    // Send TwiML response
    return sendTwiMLResponse(res, response);

  } catch (error) {
    console.error('[SMS Webhook] Error:', error);
    return sendTwiMLResponse(res,
      '❌ Error processing command. Check Vercel logs for details.'
    );
  }
}

// Process user commands
async function processCommand(command, from) {
  // Extract main command and args
  const parts = command.split(' ');
  const mainCommand = parts[0];
  const args = parts.slice(1);

  switch (mainCommand) {
    case 'status':
      return await getStatus();

    case 'health':
      return await runHealthCheck();

    case 'errors':
      return await getRecentErrors(args[0] || '1h');

    case 'logs':
      return await getRecentLogs(args[0] || '10');

    case 'fix':
      return await triggerAutoFix(args[0]);

    case 'deploy':
      return await getDeploymentInfo();

    case 'deploy-kiosk':
    case 'deploy-now':
      return await triggerKioskDeployment(args);

    case 'yes':
    case 'approve':
      return await approveLastAction();

    case 'no':
    case 'reject':
      return await rejectLastAction();

    case 'ignore':
      return await ignoreLastError();

    case 'details':
    case 'info':
      return await getLastErrorDetails();

    case 'commands':
    case 'menu':
    case 'list':
      return getHelpText();

    default:
      // Treat as free-form development request
      return await createDevelopmentTask(command, from);
  }
}

// Get system status
async function getStatus() {
  try {
    const supabase = getSupabaseClient();

    // Get error count for last 24 hours
    const { data: errors, error: errorsError } = await supabase
      .from('error_log')
      .select('id', { count: 'exact', head: true })
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Get critical errors
    const { data: criticalErrors, error: criticalError } = await supabase
      .from('error_log')
      .select('id', { count: 'exact', head: true })
      .eq('severity', 'CRITICAL')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Get recent fix attempts
    const { data: fixes, error: fixesError } = await supabase
      .from('auto_fix_requests')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return `📊 System Status (24h)

🐛 Errors: ${errors?.count || 0} total
🔴 Critical: ${criticalErrors?.count || 0}
🔧 Auto-fixes: ${fixes?.count || 0}

Send "health" for detailed check
Send "errors" for recent errors`;
  } catch (err) {
    return `❌ Failed to get status: ${err.message}`;
  }
}

// Run health check
async function runHealthCheck() {
  try {
    const response = await fetch(`${getBaseUrl()}/api/health`);
    const health = await response.json();

    if (health.status === 'healthy') {
      return `✅ System Healthy

Database: ✅
Settings: ✅
Memory: ${health.checks.memory?.message || 'OK'}
Response: ${health.responseTime}ms`;
    } else {
      const failures = Object.entries(health.checks)
        .filter(([_, check]) => check.status !== 'healthy')
        .map(([name, check]) => `${name}: ${check.message}`)
        .join('\n');

      return `⚠️ System Issues Detected

${failures}

Check Vercel logs for details.`;
    }
  } catch (err) {
    return `❌ Health check failed: ${err.message}`;
  }
}

// Get recent errors
async function getRecentErrors(timeRange = '1h') {
  try {
    const supabase = getSupabaseClient();

    // Parse time range (1h, 24h, 7d, etc.)
    const ms = parseTimeRange(timeRange);
    const since = new Date(Date.now() - ms);

    const { data: errors, error } = await supabase
      .from('error_log')
      .select('message, severity, timestamp')
      .gte('timestamp', since.toISOString())
      .order('timestamp', { ascending: false })
      .limit(5);

    if (error) throw error;

    if (!errors || errors.length === 0) {
      return `✅ No errors in the last ${timeRange}`;
    }

    const errorList = errors
      .map((e, i) => {
        const time = new Date(e.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
        return `${i + 1}. [${time}] ${e.severity}: ${e.message.slice(0, 60)}...`;
      })
      .join('\n');

    return `🐛 Recent Errors (${timeRange})

${errorList}

Send "fix" to auto-fix last error
Send "details" for more info`;
  } catch (err) {
    return `❌ Failed to get errors: ${err.message}`;
  }
}

// Get recent logs
async function getRecentLogs(count = '10') {
  try {
    const supabase = getSupabaseClient();
    const limit = parseInt(count) || 10;

    const { data: logs, error } = await supabase
      .from('error_log')
      .select('level, message, timestamp')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (!logs || logs.length === 0) {
      return `📝 No recent logs found`;
    }

    const logList = logs
      .map((log, i) => {
        const time = new Date(log.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
        const emoji = log.level === 'error' ? '🔴' :
                      log.level === 'warn' ? '🟡' : '🔵';
        return `${emoji} [${time}] ${log.message.slice(0, 50)}`;
      })
      .join('\n');

    return `📝 Recent Logs (${limit})

${logList}`;
  } catch (err) {
    return `❌ Failed to get logs: ${err.message}`;
  }
}

// Trigger auto-fix
async function triggerAutoFix(errorId) {
  try {
    const supabase = getSupabaseClient();

    // Get the error to fix
    let query = supabase
      .from('error_log')
      .select('*')
      .eq('severity', 'CRITICAL')
      .is('auto_fix_attempted', null)
      .order('timestamp', { ascending: false });

    if (errorId) {
      query = query.eq('id', errorId);
    }

    const { data: errors, error } = await query.limit(1);

    if (error) throw error;

    if (!errors || errors.length === 0) {
      return `✅ No errors to fix`;
    }

    const errorToFix = errors[0];

    // Create fix request
    const fixId = `fix-${Date.now()}-manual`;
    const { error: insertError } = await supabase
      .from('auto_fix_requests')
      .insert({
        fix_id: fixId,
        error_details: {
          message: errorToFix.message,
          stack: errorToFix.stack,
          severity: errorToFix.severity,
        },
        source: errorToFix.source,
        tenant_id: errorToFix.tenant_id,
        status: 'pending',
      });

    if (insertError) throw insertError;

    // Mark error as fix attempted
    await supabase
      .from('error_log')
      .update({ auto_fix_attempted: true })
      .eq('id', errorToFix.id);

    return `🔧 Auto-fix triggered

Error: ${errorToFix.message.slice(0, 60)}...
Fix ID: ${fixId}

The auto-healer will process this shortly.`;
  } catch (err) {
    return `❌ Failed to trigger fix: ${err.message}`;
  }
}

// Get deployment info
async function getDeploymentInfo() {
  try {
    const response = await fetch(`${getBaseUrl()}/api/health`);
    const health = await response.json();

    return `🚀 Deployment Info

Version: ${health.version || 'unknown'}
Environment: ${health.environment || 'production'}
Status: ${health.status}
Response Time: ${health.responseTime}ms

Last deployed: ${new Date(health.timestamp).toLocaleString()}`;
  } catch (err) {
    return `❌ Failed to get deployment info: ${err.message}`;
  }
}

// Trigger kiosk deployment via GitHub Actions
async function triggerKioskDeployment(args) {
  try {
    // Check for required GitHub token
    if (!process.env.GITHUB_TOKEN) {
      return `❌ Deployment not configured\n\nGITHUB_TOKEN environment variable is required.`;
    }

    // Parse optional device IP from args
    const deviceIp = args[0] || '192.168.2.112:38081';

    // Trigger GitHub Actions workflow via repository dispatch
    const response = await fetch(
      'https://api.github.com/repos/geverist/chi-pins/dispatches',
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: 'deploy-kiosk',
          client_payload: {
            device_ip: deviceIp,
            fresh_install: false,
            triggered_by: 'sms',
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${error}`);
    }

    return `🚀 Deployment started!

Device: ${deviceIp}
Status: Building...

You'll receive an SMS when deployment completes (2-3 minutes).

View progress:
github.com/geverist/chi-pins/actions`;
  } catch (err) {
    return `❌ Failed to trigger deployment: ${err.message}`;
  }
}

// Approve last action
async function approveLastAction() {
  try {
    const supabase = getSupabaseClient();

    // Check for pending task
    const { data: tasks, error } = await supabase
      .from('autonomous_tasks')
      .select('*')
      .eq('status', 'awaiting_confirmation')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!tasks || tasks.length === 0) {
      return `✅ No pending tasks to approve`;
    }

    const task = tasks[0];

    // Update task to confirmed status
    await supabase
      .from('autonomous_tasks')
      .update({
        status: 'confirmed',
        confirmation_received_at: new Date().toISOString(),
        confirmation_response: 'YES',
      })
      .eq('id', task.id);

    return `✅ Task Approved!

"${task.request_text}"

The autonomous developer will begin implementation shortly. You'll receive SMS updates as it progresses.

Implementation typically takes 2-5 minutes.`;
  } catch (err) {
    return `❌ Failed to approve: ${err.message}`;
  }
}

// Reject last action
async function rejectLastAction() {
  try {
    const supabase = getSupabaseClient();

    // Check for pending task
    const { data: tasks, error } = await supabase
      .from('autonomous_tasks')
      .select('*')
      .eq('status', 'awaiting_confirmation')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!tasks || tasks.length === 0) {
      return `✅ No pending tasks to reject`;
    }

    const task = tasks[0];

    // Update task to cancelled status
    await supabase
      .from('autonomous_tasks')
      .update({
        status: 'cancelled',
        confirmation_received_at: new Date().toISOString(),
        confirmation_response: 'NO',
      })
      .eq('id', task.id);

    return `❌ Task Cancelled

"${task.request_text}"

The task will not be implemented.`;
  } catch (err) {
    return `❌ Failed to reject: ${err.message}`;
  }
}

// Ignore last error
async function ignoreLastError() {
  try {
    const supabase = getSupabaseClient();

    // Get the last unprocessed error
    const { data: errors, error } = await supabase
      .from('error_log')
      .select('id')
      .is('auto_fix_attempted', null)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!errors || errors.length === 0) {
      return `✅ No errors to ignore`;
    }

    // Mark as fix attempted (so it won't be processed)
    await supabase
      .from('error_log')
      .update({
        auto_fix_attempted: true,
        auto_fix_success: false,
        auto_fix_details: { ignored: true, reason: 'User requested' }
      })
      .eq('id', errors[0].id);

    return `✅ Last error ignored

The error will not be auto-fixed.`;
  } catch (err) {
    return `❌ Failed to ignore error: ${err.message}`;
  }
}

// Get last error details
async function getLastErrorDetails() {
  try {
    const supabase = getSupabaseClient();

    const { data: errors, error } = await supabase
      .from('error_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!errors || errors.length === 0) {
      return `✅ No recent errors`;
    }

    const err = errors[0];
    const time = new Date(err.timestamp).toLocaleString();

    return `🔍 Error Details

Message: ${err.message}
Severity: ${err.severity}
Level: ${err.level}
Time: ${time}
Source: ${err.source || 'unknown'}

${err.stack ? `Stack: ${err.stack.slice(0, 200)}...` : ''}

Send "fix" to auto-fix
Send "ignore" to skip`;
  } catch (err) {
    return `❌ Failed to get error details: ${err.message}`;
  }
}

// Create development task from free-form request
async function createDevelopmentTask(request, requesterPhone) {
  try {
    const supabase = getSupabaseClient();

    console.log(`[SMS] Creating development task: "${request}"`);

    // Use Claude AI to analyze the request
    const analysis = await analyzeTaskWithAI(request);

    if (!analysis.success) {
      return `❌ Could not analyze request: ${analysis.error}`;
    }

    // Create task record
    const { data: task, error: insertError } = await supabase
      .from('autonomous_tasks')
      .insert({
        request_text: request,
        request_source: 'sms',
        requester_phone: requesterPhone,
        task_type: analysis.taskType,
        estimated_complexity: analysis.complexity,
        affected_files: analysis.affectedFiles,
        status: 'awaiting_confirmation',
        ai_plan: analysis.plan,
        ai_confidence: analysis.confidence,
        ai_provider: 'anthropic',
        ai_model: 'claude-sonnet-4-20250514',
        requires_confirmation: analysis.confidence < 90, // Auto-approve high confidence
        tenant_id: 'chicago-mikes',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Format confirmation message
    const filesText = analysis.affectedFiles && analysis.affectedFiles.length > 0
      ? `\nFiles: ${analysis.affectedFiles.slice(0, 3).join(', ')}${analysis.affectedFiles.length > 3 ? '...' : ''}`
      : '';

    return `🤖 Task Analysis Complete

Request: ${request}

Type: ${analysis.taskType}
Complexity: ${analysis.complexity}
Confidence: ${analysis.confidence}%${filesText}

Plan:
${analysis.plan}

${analysis.confidence >= 90 ? '✅ Auto-approved! Implementation starting...' : 'Reply YES to proceed, NO to cancel'}`;

  } catch (err) {
    console.error('[SMS] Failed to create task:', err);
    return `❌ Failed to create task: ${err.message}\n\nSend "commands" for available commands.`;
  }
}

// Analyze task with Claude AI
async function analyzeTaskWithAI(request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'ANTHROPIC_API_KEY not configured',
      };
    }

    const prompt = `You are analyzing a development task request for a React kiosk application.

Request: "${request}"

Analyze this request and provide:
1. taskType: feature, bug_fix, refactor, config, docs, or other
2. complexity: simple, medium, complex, or very_complex
3. confidence: 0-100 score of how well you understand the request
4. affectedFiles: Array of likely files that will be modified (max 5)
5. plan: 2-3 sentence implementation plan

Respond in JSON format:
{
  "taskType": "feature",
  "complexity": "medium",
  "confidence": 85,
  "affectedFiles": ["src/App.jsx", "src/components/Settings.jsx"],
  "plan": "Add a dark mode toggle to the settings page. Implement theme context and CSS variables. Update all components to support theming."
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    const analysisText = result.content[0].text;

    // Parse JSON from response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      ...analysis,
    };

  } catch (err) {
    console.error('[SMS] AI analysis failed:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

// Get help text
function getHelpText() {
  return `🤖 Chi-Pins Command Center

Commands:
• status - System status (24h)
• health - Health check
• errors [time] - Recent errors (1h, 24h, 7d)
• logs [count] - Recent logs (default 10)
• fix - Auto-fix last error
• deploy - Deployment info
• deploy-kiosk - Deploy to kiosk now
• details - Last error details

Responses:
• yes/approve - Approve action
• no/reject - Reject action
• ignore - Ignore last error

Examples:
"errors 24h" - Errors from last 24h
"logs 20" - Last 20 log entries
"fix" - Fix most recent critical error
"deploy-kiosk" - Build and deploy to kiosk`;
}

// Helper: Send TwiML response
function sendTwiMLResponse(res, message) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;

  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(twiml);
}

// Helper: Escape XML special characters
function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// Helper: Get Supabase client
function getSupabaseClient() {
  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
}

// Helper: Get base URL
function getBaseUrl() {
  return process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
}

// Helper: Parse time range (1h, 24h, 7d, etc.)
function parseTimeRange(range) {
  const match = range.match(/^(\d+)(h|d|m)$/);
  if (!match) return 60 * 60 * 1000; // Default 1 hour

  const [_, amount, unit] = match;
  const num = parseInt(amount);

  switch (unit) {
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    default: return 60 * 60 * 1000;
  }
}
