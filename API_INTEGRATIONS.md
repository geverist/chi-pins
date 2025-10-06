# API Integrations Guide - EngageOS™

Complete guide for integrating EngageOS with third-party platforms including POS systems, CDP platforms, CRM tools, and more.

---

## Table of Contents

1. [Overview](#overview)
2. [POS System Integrations](#pos-system-integrations)
3. [Customer Data Platforms (CDP)](#customer-data-platforms-cdp)
4. [CRM Integrations](#crm-integrations)
5. [Email Marketing Platforms](#email-marketing-platforms)
6. [SMS & Communication](#sms--communication)
7. [Analytics & Business Intelligence](#analytics--business-intelligence)
8. [Payment Processors](#payment-processors)
9. [Social Media Integrations](#social-media-integrations)
10. [Custom API Development](#custom-api-development)

---

## Overview

EngageOS provides a comprehensive REST API and pre-built connectors to integrate with your existing business systems. All integrations are designed to:

- **Sync in real-time** - Customer actions on the kiosk instantly reflect in your systems
- **Two-way data flow** - Pull data from your systems (menus, prices, customer profiles) and push engagement data back
- **Secure** - OAuth 2.0, API keys, webhook signature verification
- **Scalable** - Rate-limited, paginated, cached for high-traffic environments

---

## POS System Integrations

### Square POS

**Status:** ✅ Production Ready
**Features:** Menu sync, order creation, loyalty points, payment processing

#### Setup

1. **Get Square Credentials**
   ```bash
   # Go to https://developer.squareup.com/apps
   # Create new application
   # Get Application ID and Access Token
   ```

2. **Configure Environment Variables**
   ```bash
   SQUARE_ACCESS_TOKEN=your_access_token_here
   SQUARE_LOCATION_ID=your_location_id
   SQUARE_ENVIRONMENT=production  # or 'sandbox' for testing
   VITE_SQUARE_APPLICATION_ID=your_app_id  # Client-side
   VITE_SQUARE_LOCATION_ID=your_location_id
   ```

3. **Enable Features**
   - ✅ Menu Sync: Pull items, prices, modifiers from Square catalog
   - ✅ Order Creation: Send kiosk orders directly to Square POS
   - ✅ Loyalty Integration: Add points when customers play games or order
   - ✅ Payment Processing: Accept payments via Square Web Payments SDK

#### API Example: Create Order

```javascript
// api/square-create-order.js
import { Client } from 'square'

const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.SQUARE_ENVIRONMENT
})

export default async function handler(req, res) {
  const { lineItems, customerId, locationId } = req.body

  const { result } = await client.ordersApi.createOrder({
    order: {
      locationId: locationId,
      lineItems: lineItems,
      customerId: customerId,
      state: 'OPEN'
    }
  })

  return res.status(200).json(result)
}
```

#### Webhook Setup

Square sends webhooks for order updates, payment status changes:

```javascript
// api/square-webhook.js
import crypto from 'crypto'

export default async function handler(req, res) {
  const signature = req.headers['x-square-signature']
  const webhookUrl = process.env.SQUARE_WEBHOOK_URL
  const webhookSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY

  // Verify signature
  const hmac = crypto.createHmac('sha256', webhookSignatureKey)
  const hash = hmac.update(webhookUrl + JSON.stringify(req.body)).digest('base64')

  if (hash !== signature) {
    return res.status(403).json({ error: 'Invalid signature' })
  }

  // Process event
  const { type, data } = req.body

  if (type === 'order.updated') {
    // Handle order status change
  }

  return res.status(200).json({ received: true })
}
```

---

### Toast POS

**Status:** ✅ Production Ready
**Features:** Menu sync, online ordering integration, guest management

#### Setup

```bash
TOAST_CLIENT_ID=your_client_id
TOAST_CLIENT_SECRET=your_client_secret
TOAST_RESTAURANT_GUID=your_restaurant_id
TOAST_ACCESS_TOKEN=your_access_token
```

#### API Example: Sync Menu

```javascript
async function syncToastMenu() {
  const response = await fetch(
    `https://ws-api.toasttab.com/restaurants/v1/menus?restaurantGuid=${restaurantGuid}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Toast-Restaurant-External-ID': restaurantGuid
      }
    }
  )

  const menus = await response.json()

  // Transform Toast menu format to EngageOS format
  const items = menus.flatMap(menu =>
    menu.groups.flatMap(group =>
      group.items.map(item => ({
        id: item.guid,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.imageUrl,
        category: group.name
      }))
    )
  )

  return items
}
```

---

### Clover POS

**Status:** 🚧 Beta
**Features:** Inventory sync, order creation, customer profiles

#### Setup

```bash
CLOVER_API_KEY=your_api_key
CLOVER_MERCHANT_ID=your_merchant_id
CLOVER_ENVIRONMENT=production  # or 'sandbox'
```

#### API Example

```javascript
async function createCloverOrder(orderData) {
  const response = await fetch(
    `https://api.clover.com/v3/merchants/${merchantId}/orders`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        state: 'open',
        total: orderData.total,
        lineItems: orderData.items
      })
    }
  )

  return response.json()
}
```

---

### Other Supported POS Systems

| POS System | Status | Key Features |
|------------|--------|--------------|
| **Lightspeed** | ✅ Ready | Retail POS, inventory management |
| **TouchBistro** | ✅ Ready | Restaurant-specific features |
| **Aloha** | 🚧 Beta | Enterprise restaurant chains |
| **Micros (Oracle)** | 🚧 Beta | Hotel & hospitality |
| **Revel** | 📅 Planned | iPad-based POS |
| **ShopKeep** | 📅 Planned | Small business retail |

---

## Customer Data Platforms (CDP)

### Segment

**Status:** ✅ Production Ready
**Use Case:** Centralize customer data, trigger workflows, analytics

#### Setup

```bash
SEGMENT_WRITE_KEY=your_write_key
```

#### Track Events

```javascript
import Analytics from 'analytics-node'

const analytics = new Analytics(process.env.SEGMENT_WRITE_KEY)

// Track customer interaction
analytics.track({
  userId: customerId,
  event: 'Game Completed',
  properties: {
    gameName: 'Trivia Challenge',
    score: 850,
    prizesWon: ['Free Appetizer'],
    timeSpent: 120,
    location: 'Chicago - River North'
  },
  context: {
    device: {
      type: 'kiosk',
      model: 'EngageOS Touch 32"'
    }
  }
})

// Identify customer
analytics.identify({
  userId: customerId,
  traits: {
    email: 'customer@example.com',
    phone: '+13125550123',
    firstName: 'John',
    lastName: 'Doe',
    engagementScore: 850,
    totalInteractions: 12,
    favoriteGame: 'Trivia',
    lastVisit: new Date().toISOString()
  }
})
```

#### Events Tracked

- `Kiosk Interaction Started`
- `Game Started`
- `Game Completed`
- `Order Placed`
- `Photo Taken`
- `Feedback Submitted`
- `Upsell Accepted`
- `Loyalty Points Earned`
- `Social Share Completed`

---

### Rudderstack

**Status:** ✅ Production Ready
**Use Case:** Open-source Segment alternative

```javascript
// Similar to Segment API
const rudderanalytics = require('rudder-sdk-node')

const client = new rudderanalytics(
  process.env.RUDDERSTACK_WRITE_KEY,
  process.env.RUDDERSTACK_DATA_PLANE_URL
)

client.track({
  userId: customerId,
  event: 'Kiosk Interaction Started',
  properties: { /* ... */ }
})
```

---

### mParticle

**Status:** 🚧 Beta
**Use Case:** Enterprise CDP with data quality controls

```bash
MPARTICLE_API_KEY=your_api_key
MPARTICLE_API_SECRET=your_api_secret
```

---

## CRM Integrations

### Salesforce

**Status:** ✅ Production Ready
**Use Case:** B2B sales tracking, customer engagement data in CRM

#### Setup

```bash
SALESFORCE_CLIENT_ID=your_client_id
SALESFORCE_CLIENT_SECRET=your_client_secret
SALESFORCE_USERNAME=your_username
SALESFORCE_PASSWORD=your_password
SALESFORCE_SECURITY_TOKEN=your_security_token
```

#### API Example: Create Lead

```javascript
import jsforce from 'jsforce'

const conn = new jsforce.Connection({
  loginUrl: 'https://login.salesforce.com'
})

await conn.login(username, password + securityToken)

// Create lead from kiosk interaction
await conn.sobject('Lead').create({
  FirstName: 'John',
  LastName: 'Doe',
  Email: 'john@example.com',
  Phone: '+13125550123',
  Company: 'Unknown',
  LeadSource: 'EngageOS Kiosk',
  Description: 'Engaged with kiosk - played trivia game, score: 850',
  Custom_Field__c: {
    Engagement_Score__c: 850,
    Favorite_Game__c: 'Trivia',
    Total_Interactions__c: 12
  }
})
```

---

### HubSpot

**Status:** ✅ Production Ready
**Use Case:** Marketing automation, contact enrichment

#### Setup

```bash
HUBSPOT_API_KEY=your_api_key
# Or use OAuth
HUBSPOT_CLIENT_ID=your_client_id
HUBSPOT_CLIENT_SECRET=your_client_secret
```

#### API Example: Create/Update Contact

```javascript
async function syncToHubSpot(customerData) {
  const response = await fetch(
    `https://api.hubapi.com/crm/v3/objects/contacts`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          email: customerData.email,
          firstname: customerData.firstName,
          lastname: customerData.lastName,
          phone: customerData.phone,
          engagement_score: customerData.engagementScore,
          total_kiosk_interactions: customerData.totalInteractions,
          last_kiosk_visit: customerData.lastVisit,
          favorite_game: customerData.favoriteGame
        }
      })
    }
  )

  return response.json()
}
```

---

### Other CRM Integrations

| CRM | Status | Use Case |
|-----|--------|----------|
| **Pipedrive** | ✅ Ready | Sales pipeline management |
| **Zoho CRM** | ✅ Ready | Small business CRM |
| **Microsoft Dynamics** | 🚧 Beta | Enterprise CRM |
| **Copper** | 📅 Planned | G Suite native CRM |

---

## Email Marketing Platforms

### Mailchimp

**Status:** ✅ Production Ready
**Features:** List sync, automated campaigns, segmentation

#### Setup

```bash
MAILCHIMP_API_KEY=your_api_key
MAILCHIMP_SERVER_PREFIX=us1  # Your datacenter
MAILCHIMP_LIST_ID=your_list_id
```

#### API Example: Add Subscriber

```javascript
import mailchimp from '@mailchimp/mailchimp_marketing'

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY,
  server: process.env.MAILCHIMP_SERVER_PREFIX
})

async function addToMailchimp(customerData) {
  const response = await mailchimp.lists.addListMember(listId, {
    email_address: customerData.email,
    status: 'subscribed',
    merge_fields: {
      FNAME: customerData.firstName,
      LNAME: customerData.lastName,
      PHONE: customerData.phone
    },
    tags: ['Kiosk User', `Game: ${customerData.favoriteGame}`],
    interests: {
      // Map to your Mailchimp groups
      'trivia_players': customerData.favoriteGame === 'Trivia'
    }
  })

  return response
}
```

---

### SendGrid

**Status:** ✅ Production Ready
**Features:** Transactional emails, marketing campaigns

```javascript
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

// Send prize notification
await sgMail.send({
  to: customer.email,
  from: 'hello@yourbusiness.com',
  templateId: 'd-xxx', // Your SendGrid template
  dynamicTemplateData: {
    customerName: customer.firstName,
    prizeName: 'Free Appetizer',
    gameScore: 850,
    redeemCode: 'TRIVIA850'
  }
})
```

---

### Constant Contact

**Status:** ✅ Production Ready

```bash
CONSTANT_CONTACT_API_KEY=your_api_key
CONSTANT_CONTACT_ACCESS_TOKEN=your_access_token
```

---

## SMS & Communication

### Twilio

**Status:** ✅ Production Ready
**Features:** SMS notifications, voice ordering integration

#### Setup

```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+13125550100
```

#### Send SMS

```javascript
import twilio from 'twilio'

const client = twilio(accountSid, authToken)

// Send prize notification
await client.messages.create({
  body: `🎉 Congrats! You won a Free Appetizer! Show this code at checkout: TRIVIA850`,
  from: process.env.TWILIO_PHONE_NUMBER,
  to: customerPhone
})

// Send order ready notification
await client.messages.create({
  body: `Your order #1234 is ready for pickup! Thanks for playing while you waited 🍔`,
  from: process.env.TWILIO_PHONE_NUMBER,
  to: customerPhone
})
```

---

### AWS SNS

**Status:** ✅ Production Ready
**Use Case:** Multi-channel notifications (SMS, email, push)

```javascript
import AWS from 'aws-sdk'

const sns = new AWS.SNS({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1'
})

await sns.publish({
  Message: 'Your order is ready!',
  PhoneNumber: customerPhone
}).promise()
```

---

## Analytics & Business Intelligence

### Google Analytics 4

**Status:** ✅ Production Ready

```javascript
// Client-side tracking
import { sendGAEvent } from '@next/third-parties/google'

sendGAEvent({
  event: 'kiosk_interaction',
  category: 'engagement',
  label: 'game_completed',
  value: 850
})
```

---

### Mixpanel

**Status:** ✅ Production Ready

```javascript
import Mixpanel from 'mixpanel'

const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN)

mixpanel.track('Game Completed', {
  distinct_id: customerId,
  game: 'Trivia',
  score: 850,
  duration: 120,
  location: 'Chicago - River North'
})

mixpanel.people.set(customerId, {
  $email: customer.email,
  $phone: customer.phone,
  total_interactions: 12,
  engagement_score: 850
})
```

---

### Amplitude

**Status:** ✅ Production Ready

```javascript
import Amplitude from '@amplitude/node'

const client = Amplitude.init(process.env.AMPLITUDE_API_KEY)

client.logEvent({
  event_type: 'Game Completed',
  user_id: customerId,
  event_properties: {
    game_name: 'Trivia',
    score: 850,
    prizes_won: 1
  }
})
```

---

## Payment Processors

### Stripe

**Status:** ✅ Production Ready
**Use Case:** Subscription billing, one-time payments

See [BILLING_SYSTEM_DESIGN.md](./BILLING_SYSTEM_DESIGN.md) for complete Stripe integration guide.

---

### PayPal

**Status:** 🚧 Beta

```bash
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_MODE=production  # or 'sandbox'
```

---

## Social Media Integrations

### Facebook/Instagram

**Status:** ✅ Production Ready
**Features:** Photo sharing, page posting

```bash
VITE_FACEBOOK_APP_ID=your_app_id
VITE_FACEBOOK_PAGE_ID=your_page_id
```

#### Post Photo to Facebook Page

```javascript
async function postToFacebookPage(photoUrl, caption) {
  const response = await fetch(
    `https://graph.facebook.com/${pageId}/photos`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: photoUrl,
        caption: caption,
        access_token: pageAccessToken
      })
    }
  )

  return response.json()
}
```

---

## Custom API Development

### EngageOS REST API

Base URL: `https://app.agentiosk.com/api`

#### Authentication

```bash
# All API requests require authentication
Authorization: Bearer YOUR_API_KEY
```

#### Get Kiosk Analytics

```bash
GET /api/analytics
```

Response:
```json
{
  "totalInteractions": 1250,
  "totalRevenue": 12500,
  "averageEngagementTime": 180,
  "topGames": [
    { "name": "Trivia", "plays": 450, "avgScore": 820 },
    { "name": "Word Scramble", "plays": 380, "avgScore": 750 }
  ],
  "conversionRate": 0.38,
  "customerSatisfaction": 4.7
}
```

#### Create Custom Integration

```javascript
// api/custom-integration.js
export default async function handler(req, res) {
  // Your custom logic here

  // Example: Send data to your internal system
  const response = await fetch('https://your-internal-api.com/endpoint', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customerId: req.body.customerId,
      event: req.body.event,
      data: req.body.data
    })
  })

  return res.status(200).json({ success: true })
}
```

---

## Webhooks

EngageOS can send webhooks to your systems for real-time notifications.

### Supported Events

- `interaction.started`
- `interaction.completed`
- `game.completed`
- `order.placed`
- `photo.captured`
- `feedback.submitted`
- `prize.won`

### Webhook Payload Example

```json
{
  "event": "game.completed",
  "timestamp": "2025-10-05T14:30:00Z",
  "data": {
    "customerId": "cus_abc123",
    "gameId": "trivia_general",
    "gameName": "Trivia Challenge",
    "score": 850,
    "duration": 120,
    "prizesWon": ["free_appetizer"],
    "location": {
      "id": "loc_chi_001",
      "name": "Chicago - River North"
    }
  },
  "signature": "sha256=..." // For verification
}
```

### Webhook Security

Verify webhook signatures:

```javascript
import crypto from 'crypto'

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(JSON.stringify(payload)).digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${digest}`)
  )
}
```

---

## Rate Limits

All API endpoints are rate-limited:

| Plan | Requests/Hour | Burst |
|------|---------------|-------|
| Starter | 1,000 | 50 |
| Professional | 10,000 | 200 |
| Enterprise | Unlimited | Custom |

---

## Support

**Need help with an integration?**

- 📧 Email: integrations@agentiosk.com
- 📚 Docs: https://docs.agentiosk.com
- 💬 Slack Community: [Join here](https://slack.agentiosk.com)
- 📞 Enterprise Support: (312) 555-8200

---

*Last updated: October 2025*
*EngageOS™ by Agentiosk - API v2.0*
