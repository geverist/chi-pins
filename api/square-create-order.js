// api/square-create-order.js
// Vercel serverless function to create Square order

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
    const { lineItems, customerName, customerPhone, fulfillmentType = 'PICKUP' } = req.body;

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({ error: 'lineItems array is required' });
    }

    // Build the order object
    const orderData = {
      idempotency_key: randomUUID(),
      order: {
        location_id: SQUARE_LOCATION_ID,
        line_items: lineItems.map(item => ({
          catalog_object_id: item.catalogObjectId,
          quantity: String(item.quantity),
          ...(item.note && { note: item.note }),
        })),
        fulfillments: [
          {
            type: fulfillmentType,
            state: 'PROPOSED',
            ...(fulfillmentType === 'PICKUP' && {
              pickup_details: {
                schedule_type: 'ASAP',
                ...(customerName && { recipient: { display_name: customerName } }),
                ...(customerPhone && { recipient: { phone_number: customerPhone } }),
              },
            }),
          },
        ],
        ...(customerName || customerPhone ? {
          metadata: {
            ...(customerName && { customer_name: customerName }),
            ...(customerPhone && { customer_phone: customerPhone }),
          },
        } : {}),
      },
    };

    // Create order via Square API
    const response = await fetch('https://connect.squareup.com/v2/orders', {
      method: 'POST',
      headers: {
        'Square-Version': '2024-10-17',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Square API error:', errorData);
      return res.status(response.status).json({
        error: 'Failed to create order',
        details: errorData
      });
    }

    const data = await response.json();
    const order = data.order;

    return res.status(200).json({
      orderId: order.id,
      totalMoney: order.total_money,
      state: order.state,
      fulfillments: order.fulfillments,
    });
  } catch (error) {
    console.error('Error creating Square order:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
