// src/lib/sanitize.js
import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML to prevent XSS attacks
 * @param {string} dirty - Unsanitized HTML string
 * @returns {string} Sanitized HTML string
 */
export function sanitizeHTML(dirty) {
  if (typeof dirty !== 'string') return ''
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  })
}

/**
 * Sanitize text input (strips HTML, limits length)
 * @param {string} input - User input
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized text
 */
export function sanitizeText(input, maxLength = 500) {
  if (typeof input !== 'string') return ''

  // Strip HTML tags
  const clean = sanitizeHTML(input)

  // Trim and limit length
  return clean.trim().slice(0, maxLength)
}

/**
 * Sanitize slug (alphanumeric, hyphens, underscores only)
 * @param {string} slug - Slug input
 * @returns {string} Sanitized slug
 */
export function sanitizeSlug(slug) {
  if (typeof slug !== 'string') return ''
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '')
    .slice(0, 100)
}

/**
 * Sanitize numeric PIN code
 * @param {string|number} pin - PIN code input
 * @returns {string} Sanitized 4-digit PIN
 */
export function sanitizePIN(pin) {
  if (pin == null) return '1111'
  return String(pin)
    .replace(/\D/g, '')
    .slice(0, 4)
    .padStart(4, '0')
}

/**
 * Sanitize coordinates
 * @param {number} coord - Latitude or longitude
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} Sanitized coordinate
 */
export function sanitizeCoordinate(coord, min = -180, max = 180) {
  const num = parseFloat(coord)
  if (isNaN(num)) return 0
  return Math.max(min, Math.min(max, num))
}

/**
 * Validate and sanitize URL
 * @param {string} url - URL input
 * @returns {string|null} Sanitized URL or null if invalid
 */
export function sanitizeURL(url) {
  if (typeof url !== 'string' || !url.trim()) return null

  try {
    const parsed = new URL(url)
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }
    return parsed.href
  } catch {
    return null
  }
}
