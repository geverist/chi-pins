// src/lib/anonymousMessage.js
// Handle anonymous messaging between users via Twilio SMS

/**
 * Send anonymous message from one user to another
 * @param {object} params - Message parameters
 * @param {string} params.senderPhone - Sender's phone number (E.164 format)
 * @param {string} params.recipientPhone - Recipient's phone number (E.164 format, optional)
 * @param {string} params.recipientEmail - Recipient's email (optional)
 * @param {string} params.message - Message text
 * @param {string} params.pinId - Pin ID for context
 * @param {string} params.pinSlug - Pin slug for context
 * @param {object} settings - Admin settings
 */
export async function sendAnonymousMessage({ senderPhone, recipientPhone, recipientEmail, message, pinId, pinSlug }, settings) {
  try {
    // Use the new API endpoint that handles rate limiting
    const response = await fetch('/api/send-anonymous-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipientPinSlug: pinSlug,
        message,
        senderContactInfo: senderPhone,
        recipientPhone,
        recipientEmail,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Message API failed: ${response.status}`);
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
