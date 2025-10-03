// api/square-create-payment.js
// Vercel serverless function to create Square payment

import { randomUUID } from 'crypto';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID } = process.env;

  if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
    return res.status(500).json({ error: 'Square API not configured' });
  }

  try {
    const { sourceId, orderId, amountMoney, customerName } = req.body;

    if (!sourceId || !orderId || !amountMoney) {
      return res.status(400).json({ error: 'sourceId, orderId, and amountMoney are required' });
    }

    const paymentData = {
      idempotency_key: randomUUID(),
      source_id: sourceId,
      order_id: orderId,
      amount_money: {
        amount: amountMoney.amount,
        currency: amountMoney.currency || 'USD',
      },
      location_id: SQUARE_LOCATION_ID,
      autocomplete: true,
      ...(customerName && {
        note: `Order for ${customerName}`
      }),
    };

    // Create payment via Square API
    const response = await fetch('https://connect.squareup.com/v2/payments', {
      method: 'POST',
      headers: {
        'Square-Version': '2024-10-17',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Square Payment API error:', errorData);
      return res.status(response.status).json({
        error: 'Failed to process payment',
        details: errorData
      });
    }

    const data = await response.json();
    const payment = data.payment;

    return res.status(200).json({
      paymentId: payment.id,
      status: payment.status,
      receiptUrl: payment.receipt_url,
      totalMoney: payment.total_money,
      orderId: payment.order_id,
    });
  } catch (error) {
    console.error('Error creating Square payment:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
