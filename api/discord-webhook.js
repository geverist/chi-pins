// api/discord-webhook.js - Discord webhook receiver for console logs
// This endpoint receives console webhook events and forwards them to Discord
// with nice formatting using Discord's embed system
//
// Setup:
// 1. Create a Discord webhook in your channel: Server Settings → Integrations → Webhooks → New Webhook
// 2. Copy the webhook URL
// 3. Set DISCORD_WEBHOOK_URL in Vercel environment variables
// 4. In admin panel, set Console Webhook URL to: https://your-app.vercel.app/api/discord-webhook
// 5. Enable console webhook and select log levels to capture

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get Discord webhook URL from environment
  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!discordWebhookUrl) {
    console.error('[DiscordWebhook] DISCORD_WEBHOOK_URL not configured');
    return res.status(500).json({
      error: 'Discord webhook not configured',
      message: 'DISCORD_WEBHOOK_URL environment variable is not set'
    });
  }

  try {
    const payload = req.body;

    // Validate payload structure
    if (!payload.events || !Array.isArray(payload.events)) {
      return res.status(400).json({ error: 'Invalid payload structure' });
    }

    // Format events for Discord
    const embeds = payload.events.slice(0, 10).map(event => {
      // Determine color based on log level
      const colors = {
        error: 0xef4444,   // Red
        warn: 0xf59e0b,    // Orange
        info: 0x3b82f6,    // Blue
        log: 0x10b981,     // Green
      };

      const color = colors[event.level] || colors.log;

      // Build description
      let description = event.message;

      // Add additional data if present
      if (event.data && event.data.length > 0) {
        description += '\n\n**Data:**\n```json\n' +
          JSON.stringify(event.data, null, 2).slice(0, 1000) +
          '\n```';
      }

      // Add error stack if present
      if (event.stack) {
        description += '\n\n**Stack:**\n```\n' +
          event.stack.slice(0, 1000) +
          '\n```';
      }

      // Truncate if too long (Discord limit is 4096 chars per field)
      if (description.length > 4000) {
        description = description.slice(0, 3997) + '...';
      }

      return {
        title: `${getLevelEmoji(event.level)} ${event.level.toUpperCase()}`,
        description: description,
        color: color,
        timestamp: event.timestamp,
        footer: {
          text: `${payload.source || 'chi-pins'} | ${payload.tenantId || 'unknown'}`
        },
        fields: [
          event.url ? { name: 'URL', value: event.url, inline: true } : null,
          event.userAgent ? {
            name: 'User Agent',
            value: event.userAgent.slice(0, 100),
            inline: false
          } : null,
        ].filter(Boolean)
      };
    });

    // Send to Discord
    const discordPayload = {
      username: 'Chi-Pins Kiosk',
      avatar_url: 'https://emoji.slack-edge.com/T024F9CQE/chicago/b02b6eaa160d9ba0.png',
      embeds: embeds,
    };

    const discordResponse = await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(discordPayload),
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error('[DiscordWebhook] Discord API error:', discordResponse.status, errorText);
      return res.status(500).json({
        error: 'Failed to send to Discord',
        status: discordResponse.status,
        details: errorText
      });
    }

    // Success
    return res.status(200).json({
      success: true,
      message: `Forwarded ${payload.events.length} events to Discord`,
      processedCount: embeds.length
    });

  } catch (error) {
    console.error('[DiscordWebhook] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

function getLevelEmoji(level) {
  const emojis = {
    error: '🔴',
    warn: '🟡',
    info: '🔵',
    log: '🟢',
  };
  return emojis[level] || '⚪';
}
