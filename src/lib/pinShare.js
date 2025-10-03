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

