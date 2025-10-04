// src/lib/phoneUtils.js
// Phone number normalization utilities

/**
 * Normalize a phone number to E.164-ish format
 * @param {string} raw - Raw phone number input
 * @returns {string|null} - Normalized phone number or null if invalid
 */
export function normalizePhoneToE164ish(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D+/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}
