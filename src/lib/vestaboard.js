// src/lib/vestaboard.js
// Vestaboard Read/Write API integration
// Docs: https://docs.vestaboard.com/docs/read-write-api/introduction/

/**
 * Vestaboard API Configuration
 * Set VITE_VESTABOARD_API_KEY in your .env file
 * Get your API key from: https://www.vestaboard.com/developers
 */

const VESTABOARD_API_URL = 'https://rw.vestaboard.com/';
const RATE_LIMIT_MS = 15000; // 1 message per 15 seconds

let lastMessageTime = 0;

/**
 * Send a text message to Vestaboard
 * @param {string} text - The message text to display (will be centered)
 * @returns {Promise<{status: string, id: string, created: number}>}
 */
export async function sendTextToVestaboard(text) {
  const apiKey = import.meta.env.VITE_VESTABOARD_API_KEY;

  if (!apiKey) {
    console.warn('Vestaboard API key not configured');
    return { status: 'error', message: 'API key not configured' };
  }

  // Rate limiting check
  const now = Date.now();
  const timeSinceLastMessage = now - lastMessageTime;

  if (timeSinceLastMessage < RATE_LIMIT_MS) {
    const waitTime = RATE_LIMIT_MS - timeSinceLastMessage;
    console.warn(`Vestaboard rate limit: waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  try {
    const response = await fetch(VESTABOARD_API_URL, {
      method: 'POST',
      headers: {
        'X-Vestaboard-Read-Write-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`Vestaboard API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    lastMessageTime = Date.now();

    return data;
  } catch (error) {
    console.error('Failed to send message to Vestaboard:', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Send character codes to Vestaboard (advanced usage)
 * @param {number[][]} layout - 6x22 array of character codes
 * @returns {Promise<{status: string, id: string, created: number}>}
 */
export async function sendLayoutToVestaboard(layout) {
  const apiKey = import.meta.env.VITE_VESTABOARD_API_KEY;

  if (!apiKey) {
    console.warn('Vestaboard API key not configured');
    return { status: 'error', message: 'API key not configured' };
  }

  // Validate layout dimensions
  if (!Array.isArray(layout) || layout.length !== 6 || !layout.every(row => row.length === 22)) {
    throw new Error('Layout must be a 6x22 array of character codes');
  }

  // Rate limiting check
  const now = Date.now();
  const timeSinceLastMessage = now - lastMessageTime;

  if (timeSinceLastMessage < RATE_LIMIT_MS) {
    const waitTime = RATE_LIMIT_MS - timeSinceLastMessage;
    console.warn(`Vestaboard rate limit: waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  try {
    const response = await fetch(VESTABOARD_API_URL, {
      method: 'POST',
      headers: {
        'X-Vestaboard-Read-Write-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(layout),
    });

    if (!response.ok) {
      throw new Error(`Vestaboard API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    lastMessageTime = Date.now();

    return data;
  } catch (error) {
    console.error('Failed to send layout to Vestaboard:', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Format a pin placement for Vestaboard display
 * @param {Object} pin - The pin data
 * @returns {string} Formatted message text
 */
export function formatPinForVestaboard(pin) {
  const lines = [];

  // Title: "NEW PIN"
  lines.push('NEW PIN');
  lines.push('');

  // Location: slug or neighborhood
  if (pin.slug) {
    lines.push(pin.slug.toUpperCase());
  }

  // Team affiliation
  if (pin.team) {
    const teamName = {
      cubs: 'CUBS',
      whitesox: 'WHITE SOX',
      chicago: 'CHICAGO',
      na: 'NORTH AMERICA',
      sa: 'SOUTH AMERICA',
      eu: 'EUROPE',
      af: 'AFRICA',
      as: 'ASIA',
    }[pin.team] || pin.team.toUpperCase();
    lines.push(teamName);
  }

  // Notes (truncate if too long)
  if (pin.notes) {
    const maxLength = 66; // Roughly 3 lines on Vestaboard
    const notes = pin.notes.length > maxLength
      ? pin.notes.substring(0, maxLength - 3) + '...'
      : pin.notes;
    lines.push('');
    lines.push(notes);
  }

  return lines.join('\n');
}

/**
 * Send pin placement notification to Vestaboard
 * @param {Object} pin - The pin data
 * @returns {Promise<{status: string, id?: string, created?: number}>}
 */
export async function notifyPinPlacement(pin) {
  const message = formatPinForVestaboard(pin);
  return await sendTextToVestaboard(message);
}

/**
 * Check if Vestaboard is configured
 * @returns {boolean}
 */
export function isVestaboardConfigured() {
  return !!import.meta.env.VITE_VESTABOARD_API_KEY;
}
