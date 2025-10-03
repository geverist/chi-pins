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
 * Generate SMS deeplink with pin image URL
 * @param {string} slug - The pin's unique slug
 * @param {Object} pin - Pin data for message content
 * @returns {string} SMS deeplink URL
 */
export function getSmsDeeplink(slug, pin = {}) {
  const imageUrl = getPinImageUrl(slug);
  const pinName = pin.name || slug;
  const message = `Check out my pin "${pinName}" on Chi-Pins!\n\n${imageUrl}`;

  // iOS and Android SMS URL format
  const encodedMessage = encodeURIComponent(message);

  // Use sms: protocol with body parameter
  // iOS: sms:&body=... or sms://&body=...
  // Android: sms:?body=...
  // Using // to avoid vCard interpretation on iOS
  return `sms://&body=${encodedMessage}`;
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
 * Copy pin share URL to clipboard
 * @param {string} slug - The pin's unique slug
 * @returns {Promise<boolean>} True if successful
 */
export async function copyPinUrlToClipboard(slug) {
  const url = getPinShareUrl(slug);

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch (err) {
        document.body.removeChild(textArea);
        console.error('Clipboard copy failed:', err);
        return false;
      }
    }
  } catch (error) {
    console.error('Clipboard access failed:', error);
    return false;
  }
}

/**
 * Download QR code as PNG file
 * @param {string} slug - The pin's unique slug
 * @param {string} filename - Optional custom filename (default: pin-{slug}.png)
 */
export async function downloadPinQRCode(slug, filename) {
  const dataUrl = await generatePinQRCode(slug, { width: 512 });
  const link = document.createElement('a');
  link.download = filename || `pin-${slug}.png`;
  link.href = dataUrl;
  link.click();
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
 * Share pin using native Web Share API (mobile)
 * @param {Object} pin - Pin data
 * @param {string} pin.slug - Pin slug
 * @param {string} pin.name - Pin name/title
 * @param {string} pin.note - Pin description
 * @returns {Promise<boolean>} True if shared successfully
 */
export async function sharePin(pin) {
  if (!navigator.share) {
    console.warn('Web Share API not supported');
    return false;
  }

  const url = getPinShareUrl(pin.slug);
  const title = pin.name || `Pin: ${pin.slug}`;
  const text = pin.note
    ? `${title}\n\n${pin.note}`
    : title;

  try {
    await navigator.share({
      title,
      text,
      url,
    });
    return true;
  } catch (error) {
    // User cancelled or error occurred
    if (error.name !== 'AbortError') {
      console.error('Web Share failed:', error);
    }
    return false;
  }
}

/**
 * Check if Web Share API is available
 * @returns {boolean}
 */
export function isWebShareSupported() {
  return typeof navigator !== 'undefined' && !!navigator.share;
}

/**
 * Generate social media share URLs
 * @param {Object} pin - Pin data
 * @returns {Object} Social media URLs
 */
export function getSocialShareUrls(pin) {
  const url = getPinShareUrl(pin.slug);
  const text = pin.name || `Check out this pin: ${pin.slug}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
    email: `mailto:?subject=${encodedText}&body=${encodedUrl}`,
  };
}
