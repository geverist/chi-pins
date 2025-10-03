// api/square-loyalty-add-points.js
// Add loyalty points to a customer account by phone number

import { Client, Environment } from 'square';

// Initialize Square client
const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.SQUARE_ENVIRONMENT === 'production'
    ? Environment.Production
    : Environment.Sandbox,
});

const { loyaltyApi } = client;

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phoneNumber, points = 1, reason = 'Pin placement on Chi-Pins map' } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Ensure phone number is in E.164 format (+1XXXXXXXXXX for US)
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Step 1: Search for loyalty account by phone number
    const searchResponse = await loyaltyApi.searchLoyaltyAccounts({
      query: {
        phoneNumber: normalizedPhone,
      },
      limit: 1,
    });

    if (!searchResponse.result.loyaltyAccounts || searchResponse.result.loyaltyAccounts.length === 0) {
      return res.status(404).json({
        error: 'No loyalty account found for this phone number',
        message: 'Customer needs to enroll in the loyalty program first',
      });
    }

    const loyaltyAccount = searchResponse.result.loyaltyAccounts[0];
    const accountId = loyaltyAccount.id;

    // Step 2: Adjust loyalty points
    const adjustResponse = await loyaltyApi.adjustLoyaltyPoints(accountId, {
      idempotencyKey: `pin-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      adjustPoints: {
        points: points,
        reason: reason,
      },
    });

    const updatedAccount = adjustResponse.result.loyaltyAccount;

    return res.status(200).json({
      success: true,
      message: `Added ${points} point${points !== 1 ? 's' : ''} to loyalty account`,
      account: {
        id: updatedAccount.id,
        balance: updatedAccount.balance,
        lifetimePoints: updatedAccount.lifetimePoints,
      },
    });

  } catch (error) {
    console.error('Square Loyalty API error:', error);

    // Handle specific Square API errors
    if (error.result && error.result.errors) {
      return res.status(400).json({
        error: 'Square API error',
        details: error.result.errors,
      });
    }

    return res.status(500).json({
      error: 'Failed to add loyalty points',
      message: error.message,
    });
  }
}

/**
 * Normalize phone number to E.164 format
 * @param {string} phone - Raw phone number
 * @returns {string|null} - Normalized phone or null if invalid
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null;

  // Remove all non-digit characters
  const digits = phone.replace(/\D+/g, '');

  // Handle different formats
  if (digits.length === 10) {
    // Assume US number without country code
    return `+1${digits}`;
  } else if (digits.length === 11 && digits[0] === '1') {
    // US number with country code
    return `+${digits}`;
  } else if (digits.length >= 10 && digits.length <= 15) {
    // International number
    return `+${digits}`;
  }

  return null;
}
