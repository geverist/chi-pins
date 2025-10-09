# Vestaboard & POS Integration

## Overview

This document describes the Vestaboard integration for displaying real-time notifications on the kiosk's Vestaboard display, including "Now Playing" music and order notifications from POS systems.

## Vestaboard Features

### 1. **Now Playing Display** ✅ IMPLEMENTED

Automatically displays the currently playing song on the Vestaboard before playback starts.

**Format:**
```
NOW PLAYING

ARTIST NAME

SONG TITLE
```

**Configuration:**
- Enable in Admin Panel: `Settings > Vestaboard Enabled`
- Set API Key: `.env` → `VITE_VESTABOARD_API_KEY`
- Automatically triggers when a song starts playing

**Code Location:**
- `src/lib/vestaboard.js` - Vestaboard API functions
- `src/components/GlobalAudioPlayer.jsx` - Integration point

### 2. **Order Ready Notifications** 🚧 STUBBED

Displays customer name and order number when orders are ready from POS systems.

**Format:**
```
ORDER READY

CUSTOMER NAME

ORDER #123456
```

**Supported POS Systems:**
- ✅ Square (stubbed - webhook ready)
- ✅ Toast (stubbed - webhook ready)
- ✅ Clover (stubbed - webhook ready)
- ✅ Custom (webhook with transformer function)

**Code Location:**
- `src/lib/posIntegration.js` - POS integration stubs
- `src/lib/vestaboard.js` - Order notification formatting

## Setup Instructions

### Vestaboard API Setup

1. **Get API Key:**
   - Visit https://www.vestaboard.com/developers
   - Create a Read/Write API key
   - Copy the key

2. **Configure Environment:**
   ```bash
   # .env
   VITE_VESTABOARD_API_KEY=your-api-key-here
   ```

3. **Enable in Admin Panel:**
   - Open Admin Panel
   - Navigate to Settings
   - Check "Vestaboard Enabled"
   - Save settings

### POS Integration Setup (Square Example)

1. **Square Developer Account:**
   - Create app at https://developer.squareup.com/apps
   - Get Access Token and Location ID
   - Configure webhook for Order events

2. **Environment Variables:**
   ```bash
   # .env (server-side)
   SQUARE_ACCESS_TOKEN=your-access-token
   SQUARE_LOCATION_ID=your-location-id
   ```

3. **Webhook Endpoint:**
   ```javascript
   // api/webhooks/square.js (Vercel/Netlify function)
   import { handlePOSWebhook } from '../../src/lib/posIntegration';

   export default async function handler(req, res) {
     const adminSettings = { vestaboardEnabled: true }; // Load from DB

     const order = await handlePOSWebhook(req, adminSettings);

     res.status(200).json({ success: true, order });
   }
   ```

4. **Square Webhook Configuration:**
   - URL: `https://your-domain.com/api/webhooks/square`
   - Events: `order.updated`, `order.fulfilled`

## API Reference

### Vestaboard Functions

```javascript
import {
  sendTextToVestaboard,
  notifyNowPlaying,
  notifyOrderReady
} from './lib/vestaboard';

// Send custom text
await sendTextToVestaboard('HELLO WORLD');

// Send "Now Playing" (automatic in GlobalAudioPlayer)
await notifyNowPlaying(
  { artist: 'The Beatles', title: 'Hey Jude' },
  vestaboardEnabled
);

// Send order notification
await notifyOrderReady(
  { customerName: 'John Doe', orderNumber: '12345' },
  vestaboardEnabled
);
```

### POS Manager

```javascript
import { POSManager, POS_PROVIDERS } from './lib/posIntegration';

// Initialize manager
const manager = new POSManager(
  POS_PROVIDERS.SQUARE,
  {
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    locationId: process.env.SQUARE_LOCATION_ID
  },
  adminSettings
);

// Handle webhook
const order = await manager.handleOrderWebhook(webhookEvent);
```

## Rate Limiting

Vestaboard API has a rate limit of **1 message per 15 seconds**. The integration automatically handles rate limiting with a queue system.

If messages are sent too quickly, they will be delayed automatically.

## Customization

### Custom Order Transformer

For custom POS systems, provide a transformer function:

```javascript
const customTransformer = (webhook) => ({
  orderNumber: webhook.data.order_id,
  customerName: webhook.data.customer.name,
  status: webhook.data.status,
  items: webhook.data.line_items
});

const manager = new POSManager(
  POS_PROVIDERS.CUSTOM,
  {},
  adminSettings
);

const order = await manager.handleOrderWebhook(
  webhookEvent,
  customTransformer
);
```

### Custom Message Formatting

Create custom Vestaboard layouts:

```javascript
import { sendLayoutToVestaboard } from './lib/vestaboard';

// 6x22 array of character codes
// See: https://docs.vestaboard.com/docs/characterCodes
const layout = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,14,15,23,0,16,12,1,25,9,14,7,0,0,0,0,0,0,0],
  // ... 4 more rows
];

await sendLayoutToVestaboard(layout);
```

## Production Deployment

### Webhook Security

1. **Verify Webhook Signatures:**
   ```javascript
   // Square signature verification
   const crypto = require('crypto');

   function verifySquareSignature(body, signature, signatureKey) {
     const hmac = crypto
       .createHmac('sha256', signatureKey)
       .update(body)
       .digest('base64');

     return hmac === signature;
   }
   ```

2. **Use HTTPS:**
   - All webhook endpoints must use HTTPS
   - Vestaboard API requires HTTPS

3. **Environment Variables:**
   - Never commit API keys to git
   - Use `.env` files (ignored in `.gitignore`)
   - Set environment variables in deployment platform

## Testing

### Manual Testing

```javascript
// Test Vestaboard connection
import { sendTextToVestaboard } from './lib/vestaboard';

await sendTextToVestaboard('TEST MESSAGE');
```

### Webhook Testing

Use tools like:
- **ngrok** - Expose local server for webhook testing
- **Postman** - Send mock webhook payloads
- **Square Sandbox** - Test environment for Square webhooks

## Troubleshooting

### Vestaboard Not Updating

1. Check API key is set in `.env`
2. Verify `vestaboardEnabled` is true in admin settings
3. Check browser console for errors
4. Verify rate limit not exceeded (15s between messages)

### Orders Not Appearing

1. Verify webhook endpoint is publicly accessible
2. Check POS webhook configuration
3. Verify webhook signature (if required)
4. Check server logs for errors

### Error Codes

- `API key not configured` - Set `VITE_VESTABOARD_API_KEY` in `.env`
- `Vestaboard not enabled` - Enable in Admin Panel
- `Rate limit exceeded` - Wait 15 seconds between messages

## Future Enhancements

- [ ] Queue system for multiple messages
- [ ] Message templates in admin panel
- [ ] Custom color schemes (if Vestaboard supports)
- [ ] Integration with loyalty system
- [ ] Display reservations/appointments
- [ ] Social media mentions display

## Support

- **Vestaboard Docs:** https://docs.vestaboard.com/
- **Square Webhooks:** https://developer.squareup.com/docs/webhooks
- **Toast API:** https://doc.toasttab.com/
- **Clover Webhooks:** https://docs.clover.com/docs/webhooks
