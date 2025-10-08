// src/lib/pinShare.js
// Pin sharing utilities - URL generation and QR codes

import QRCode from 'qrcode';

/**
 * Generate shareable URL for a pin
 * @param {string} slug - The pin's unique slug
 * @param {Object} options - Additional options
 * @param {boolean} options.absolute - Return absolute URL (default: true)
 * @returns {string} Shareable URL
 */
export function getPinShareUrl(slug, { absolute = true } = {}) {
  const baseUrl = absolute
    ? window.location.origin
    : '';
  return `${baseUrl}?pin=${encodeURIComponent(slug)}`;
}

/**
 * Generate pin image URL
 * @param {string} slug - The pin's unique slug
 * @returns {string} Pin image URL
 */
export function getPinImageUrl(slug) {
  const baseUrl = window.location.origin;
  return `${baseUrl}/api/generate-pin-image?slug=${encodeURIComponent(slug)}`;
}

/**
 * Generate QR code as data URL for a pin (creates pin image URL QR)
 * @param {string} slug - The pin's unique slug
 * @param {Object} options - QR code options
 * @param {number} options.width - QR code width in pixels (default: 256)
 * @param {string} options.color - QR code color (default: '#000000')
 * @param {string} options.background - Background color (default: '#ffffff')
 * @param {Object} options.pin - Pin data for SMS message
 * @returns {Promise<string>} Data URL of the QR code image
 */
export async function generatePinQRCode(slug, options = {}) {
  const {
    width = 256,
    color = '#000000',
    background = '#ffffff',
    pin = {},
  } = options;

  // Use direct pin image URL - when scanned, user can tap to open and share
  const imageUrl = getPinImageUrl(slug);

  try {
    const dataUrl = await QRCode.toDataURL(imageUrl, {
      width,
      color: {
        dark: color,
        light: background,
      },
      margin: 2,
      errorCorrectionLevel: 'M',
    });
    return dataUrl;
  } catch (error) {
    console.error('QR code generation failed:', error);
    throw error;
  }
}

/**
 * Extract pin slug from URL query parameters
 * @param {string} search - URL search string (default: window.location.search)
 * @returns {string|null} Pin slug if found
 */
export function getPinSlugFromUrl(search = window.location.search) {
  const params = new URLSearchParams(search);
  return params.get('pin');
}

/**
 * Generate Facebook share URL with deep link
 * @param {string} slug - The pin's unique slug
 * @param {Object} options - Share options
 * @param {string} options.facebookPage - Facebook page handle to tag
 * @returns {string} Facebook share URL
 */
export function getFacebookShareUrl(slug, { facebookPage = 'ChicagoMikes' } = {}) {
  const shareUrl = getPinShareUrl(slug);
  // Use Facebook's web-based sharer (most reliable across devices)
  // Note: Facebook doesn't support pre-filled text with tags anymore, but the user can manually tag @ChicagoMikes
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
}

/**
 * Generate Twitter share URL with mention
 * @param {string} slug - The pin's unique slug
 * @param {Object} options - Share options
 * @param {string} options.text - Tweet text
 * @param {string} options.via - Twitter handle to mention
 * @returns {string} Twitter share URL
 */
export function getTwitterShareUrl(slug, { text = '', via = 'ChicagoMikes' } = {}) {
  const shareUrl = getPinShareUrl(slug);
  const tweetText = text || `Just dropped a pin at Chicago Mike's! 📍 Check it out!`;
  // Add @mention in the tweet text
  const textWithMention = `${tweetText} @${via}`;
  return `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(textWithMention)}`;
}

/**
 * Generate Instagram share URL (opens Instagram app)
 * Note: Instagram doesn't support URL parameters, but we can encourage users to tag
 * @param {string} slug - The pin's unique slug
 * @param {Object} options - Share options
 * @param {string} options.instagramHandle - Instagram handle to tag
 * @returns {string} Instagram URL
 */
export function getInstagramShareUrl(slug, { instagramHandle = 'chicagomikes' } = {}) {
  // Instagram doesn't have a web share API, so we open their profile
  // Users will need to manually post and tag
  return `https://www.instagram.com/${instagramHandle}/`;
}

/**
 * Generate SMS share URL
 * @param {string} slug - The pin's unique slug
 * @param {Object} options - Share options
 * @param {string} options.message - SMS message text
 * @returns {string} SMS URL
 */
export function getSMSShareUrl(slug, { message = '' } = {}) {
  const shareUrl = getPinShareUrl(slug);
  const smsText = message || `Check out my pin: ${shareUrl}`;
  // iOS uses 'sms:', Android supports both 'sms:' and 'smsto:'
  return `sms:?&body=${encodeURIComponent(smsText)}`;
}

/**
 * Generate Email share URL
 * @param {string} slug - The pin's unique slug
 * @param {Object} options - Share options
 * @param {string} options.subject - Email subject
 * @param {string} options.body - Email body
 * @returns {string} Email URL
 */
export function getEmailShareUrl(slug, { subject = '', body = '' } = {}) {
  const shareUrl = getPinShareUrl(slug);
  const emailSubject = subject || 'Check out my pin!';
  const emailBody = body || `I dropped a pin on the map! View it here: ${shareUrl}`;
  return `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
}

/**
 * Copy URL to clipboard
 * @param {string} slug - The pin's unique slug
 * @returns {Promise<boolean>} Success status
 */
export async function copyPinUrlToClipboard(slug) {
  const shareUrl = getPinShareUrl(slug);
  try {
    await navigator.clipboard.writeText(shareUrl);
    return true;
  } catch (error) {
    console.error('Failed to copy URL:', error);
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = shareUrl;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

