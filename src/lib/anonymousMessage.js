// src/lib/anonymousMessage.js
// Handle anonymous messaging between users via Twilio SMS

/**
 * Send anonymous message from one user to another
 * @param {object} params - Message parameters
 * @param {string} params.senderPhone - Sender's phone number (E.164 format)
 * @param {string} params.recipientPhone - Recipient's phone number (E.164 format)
 * @param {string} params.message - Message text
 * @param {string} params.pinId - Pin ID for context
 * @param {object} settings - Admin settings with Twilio credentials
 */
export async function sendAnonymousMessage({ senderPhone, recipientPhone, message, pinId }, settings) {
  try {
    // Validate Twilio is enabled
    if (!settings.twilioEnabled) {
      throw new Error('Messaging is not enabled');
    }

    if (!settings.twilioAccountSid || !settings.twilioAuthToken || !settings.twilioPhoneNumber) {
      throw new Error('Twilio is not configured properly');
    }

    // Format the message to include context and sender's number
    const formattedMessage = `Message from Chicago Mike's visitor:\n\n${message}\n\n---\nReply directly to ${senderPhone} to continue the conversation.`;

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
        to: [recipientPhone],
        message: formattedMessage,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `SMS API failed: ${response.status}`);
    }

    const result = await response.json();

    console.log('Anonymous message sent successfully');
    return {
      success: true,
      details: result,
    };
  } catch (error) {
    console.error('Anonymous message error:', error);
    throw error;
  }
}
