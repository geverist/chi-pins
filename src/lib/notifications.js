// src/lib/notifications.js
// Handle webhook and SMS notifications for pin placements

/**
 * Send notification for new pin placement
 * @param {object} pin - Pin data
 * @param {object} settings - Admin settings
 */
export async function sendPinNotification(pin, settings) {
  if (!settings.notificationsEnabled) {
    return { success: true, message: 'Notifications disabled' };
  }

  const results = {
    webhook: null,
    sms: null,
  };

  try {
    // Send webhook notification
    if (
      (settings.notificationType === 'webhook' ||
        settings.notificationType === 'both') &&
      settings.webhookUrl
    ) {
      results.webhook = await sendWebhook(pin, settings.webhookUrl);
    }

    // Send SMS notification
    if (
      (settings.notificationType === 'sms' ||
        settings.notificationType === 'both') &&
      settings.twilioEnabled
    ) {
      results.sms = await sendSMS(pin, settings);
    }

    return {
      success: true,
      results,
    };
  } catch (error) {
    console.error('Error sending notifications:', error);
    return {
      success: false,
      error: error.message,
      results,
    };
  }
}

/**
 * Send webhook notification
 */
async function sendWebhook(pin, webhookUrl) {
  try {
    const payload = {
      event: 'pin_created',
      timestamp: new Date().toISOString(),
      pin: {
        slug: pin.slug,
        name: pin.name,
        neighborhood: pin.neighborhood,
        team: pin.team,
        hotdog: pin.hotdog,
        note: pin.note,
        lat: pin.lat,
        lng: pin.lng,
        created_at: pin.created_at,
      },
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    console.log('Webhook sent successfully');
    return {
      success: true,
      status: response.status,
    };
  } catch (error) {
    console.error('Webhook error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send SMS via Twilio
 * Note: This requires a backend proxy to keep Twilio credentials secure
 */
async function sendSMS(pin, settings) {
  try {
    // Parse recipients
    const recipients = settings.notificationRecipients
      .split(',')
      .map((num) => num.trim())
      .filter((num) => num);

    if (recipients.length === 0) {
      return {
        success: false,
        error: 'No recipients configured',
      };
    }

    // Format message
    const message = `New pin placed at Chicago Mike's!\n\nLocation: ${
      pin.neighborhood || 'Chicago'
    }\nName: ${pin.name || 'Anonymous'}\nTeam: ${
      pin.team?.toUpperCase() || 'OTHER'
    }\n\nView: ${window.location.origin}/?pin=${pin.slug}`;

    // In a production app, you'd send this to a backend endpoint that
    // securely uses Twilio API. Never expose Twilio credentials to the client!
    const response = await fetch('/api/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountSid: settings.twilioAccountSid,
        authToken: settings.twilioAuthToken,
        from: settings.twilioPhoneNumber,
        to: recipients,
        message: message,
      }),
    });

    if (!response.ok) {
      throw new Error(`SMS API failed: ${response.status}`);
    }

    const result = await response.json();

    console.log('SMS sent successfully');
    return {
      success: true,
      recipients: recipients.length,
      details: result,
    };
  } catch (error) {
    console.error('SMS error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Test notification settings
 */
export async function testNotifications(settings) {
  const testPin = {
    slug: 'test-' + Date.now(),
    name: 'Test Pin',
    neighborhood: 'Chicago',
    team: 'cubs',
    hotdog: 'classic',
    note: 'This is a test notification',
    lat: 41.8781,
    lng: -87.6298,
    created_at: new Date().toISOString(),
  };

  return await sendPinNotification(testPin, settings);
}
