# Billing & Self-Service Payment System Design

## Overview

Enable customers to sign up, configure features, enter payment info, and start using EngageOS immediately - with billing deferred until hardware ships.

---

## Pricing Structure

### Base Plans (Per Location/Month)

**Starter - $399/mo**
- ✅ Core kiosk features (games, photo booth, feedback)
- ✅ Up to 5,000 customer interactions/month
- ✅ Basic analytics
- ✅ Email support
- ❌ Voice AI
- ❌ Advanced integrations
- Hardware: Standard tablet + stand

**Professional - $799/mo** ⭐ Most Popular
- ✅ Everything in Starter
- ✅ Voice AI ordering
- ✅ Up to 25,000 interactions/month
- ✅ Advanced analytics & reports
- ✅ POS/EMR integrations
- ✅ Custom branding
- ✅ Priority phone support
- Hardware: Premium tablet + stand

**Enterprise - Custom**
- ✅ Everything in Professional
- ✅ Unlimited interactions
- ✅ White-label option
- ✅ Multi-location dashboard
- ✅ Dedicated success manager
- ✅ Custom integrations
- ✅ SLA guarantees
- Hardware: Premium + backup unit

### Add-Ons (Monthly)

**AI Voice Agent** - $200/mo
- Conversational ordering
- Menu recommendations
- FAQs & support

**SMS Notifications** - $49/mo
- Send up to 1,000 messages
- $0.05 per additional message

**Advanced Analytics** - $99/mo
- Heat maps
- Customer journey tracking
- Predictive insights

**Custom Games** - $299 one-time
- Branded trivia
- Custom mini-games
- Seasonal content

### Volume Discounts

| Locations | Discount |
|-----------|----------|
| 2-5       | 10% off  |
| 6-15      | 15% off  |
| 16-50     | 20% off  |
| 51+       | 25% off  |

### Hardware

**One-Time Hardware Costs:**
- Standard Package: $1,299 (tablet + stand + shipping)
- Premium Package: $1,899 (larger tablet + premium stand)
- Installation Service: $299 (optional)

**Or Finance Hardware:**
- $49/mo for 36 months (0% APR)
- Included in monthly bill

---

## Billing Flow

### Phase 1: Immediate (No Hardware Required)

**Features Available Without Kiosk:**
1. ✅ Admin panel access
2. ✅ Configuration & branding
3. ✅ Content management (trivia, menu items)
4. ✅ Analytics dashboard (demo data)
5. ✅ Team member invites
6. ✅ Integration setup
7. ✅ SMS notifications (can use immediately)
8. ✅ Training materials

**What Requires Hardware:**
1. ❌ Customer-facing kiosk interface
2. ❌ In-person interactions
3. ❌ Voice AI (needs kiosk)
4. ❌ Photo booth (needs camera)
5. ❌ Games (need kiosk display)

**Billing Status:** ⏸️ **Paused** until hardware ships
- Card on file, not charged yet
- Can configure everything
- Preview kiosk in demo mode

---

### Phase 2: Hardware Shipped

**Automatic Triggers:**
```javascript
// When hardware tracking shows "Shipped"
if (hardware.status === 'shipped') {
  subscription.billing_start_date = hardware.delivery_date
  subscription.status = 'active'
  sendEmail({
    template: 'hardware_shipped',
    estimated_delivery: hardware.delivery_date,
    first_charge_date: hardware.delivery_date
  })
}
```

**First Charge:**
- Occurs on estimated delivery date
- Prorated if mid-month
- Includes: Monthly subscription + hardware (if financed)
- Email notification 3 days before charge

---

### Phase 3: Active Subscription

**Monthly Billing Cycle:**
- Charge on same day each month
- Usage-based add-ons calculated
- Invoice emailed automatically
- Payment via Stripe

**What Happens:**
1. **Day 1 of month:**
   - Calculate usage (interactions, SMS, etc.)
   - Generate invoice
   - Charge payment method
   - Email receipt

2. **If payment fails:**
   - Retry in 3 days
   - Email notification
   - After 3 failures: Downgrade to read-only mode

3. **Grace period:**
   - 7 days to update payment method
   - Kiosk shows "Please update billing" banner
   - Admin panel accessible

---

## Self-Service Signup Flow

### Step 1: Setup Wizard (No Payment Yet)

```
1. Business info (name, industry)
2. Choose plan
3. Customize features
4. Review pricing
```

At this point, user sees:
```
Your Configuration:
✓ Professional Plan: $799/mo
✓ 3 locations: -15% discount = $679/mo per location
✓ AI Voice Agent: +$200/mo
✓ SMS Notifications: +$49/mo
───────────────────────────────────
Monthly Total: $2,965/mo (when hardware arrives)

Hardware:
○ Standard Package (x3): $3,897 one-time
  OR
○ Finance: +$147/mo for 36 months

First charge date: When your hardware ships (est. 7-10 business days)
```

---

### Step 2: Payment Information

```jsx
<PaymentStep>
  <h2>💳 Payment Information</h2>
  <p>
    We'll hold your card but <strong>won't charge until your hardware ships</strong>.
    Setup and configure everything risk-free!
  </p>

  <StripeElements>
    <CardElement />
  </StripeElements>

  <PricingSummary>
    <Line>
      <span>Monthly subscription (3 locations)</span>
      <span>$2,965/mo</span>
    </Line>
    <Line highlight>
      <span>First charge</span>
      <span>When hardware ships (~7-10 days)</span>
    </Line>
  </PricingSummary>

  <SecurityBadges>
    🔒 Encrypted with Stripe
    ✓ PCI compliant
    💯 Cancel anytime
  </SecurityBadges>

  <button>Continue to Hardware →</button>
</PaymentStep>
```

---

### Step 3: Hardware Selection

```jsx
<HardwareStep>
  <h2>📦 Hardware Package</h2>

  <PackageOptions>
    <Package selected={standard}>
      <h3>Standard Package</h3>
      <price>$1,299/location</price>
      <ul>
        <li>10" Android tablet</li>
        <li>Countertop stand</li>
        <li>Power adapter</li>
        <li>Quick start guide</li>
      </ul>
      <button>Select Standard</button>
    </Package>

    <Package badge="Recommended">
      <h3>Premium Package</h3>
      <price>$1,899/location</price>
      <ul>
        <li>13" premium tablet</li>
        <li>Adjustable floor stand</li>
        <li>Backup power supply</li>
        <li>White-glove installation</li>
      </ul>
      <button>Select Premium</button>
    </Package>
  </PackageOptions>

  <PaymentOptions>
    <Radio checked>
      Pay upfront: $3,897 (save $300)
      <small>One-time charge when hardware ships</small>
    </Radio>
    <Radio>
      Finance: $147/mo for 36 months
      <small>0% APR, added to monthly bill</small>
    </Radio>
  </PaymentOptions>

  <ShippingForm>
    <input placeholder="Shipping Address" />
    <input placeholder="City, State, ZIP" />
    <select>Installation preferred date</select>
  </ShippingForm>

  <Timeline>
    <Step completed>✓ Payment authorized</Step>
    <Step active>📦 Hardware ordered</Step>
    <Step>🚚 Ships in 7-10 days</Step>
    <Step>💳 Billing starts on delivery</Step>
  </Timeline>
</HardwareStep>
```

---

### Step 4: Confirmation

```jsx
<ConfirmationStep>
  <h1>🎉 You're all set!</h1>
  <p>Your EngageOS kiosk is being prepared</p>

  <StatusCard>
    <h3>What happens next:</h3>
    <ol>
      <li>
        <strong>Today:</strong> Configure your kiosk, add content, train your team
        <button>Go to Admin Panel →</button>
      </li>
      <li>
        <strong>Within 7-10 days:</strong> Hardware ships to your location(s)
        <TrackingLink>Track shipment</TrackingLink>
      </li>
      <li>
        <strong>On delivery:</strong> First charge of $6,862
        (3 locations × $1,299 hardware + first month $2,965)
      </li>
    </ol>
  </StatusCard>

  <QuickActions>
    <Action icon="🎨">Customize Branding</Action>
    <Action icon="🎮">Add Trivia Questions</Action>
    <Action icon="👥">Invite Team Members</Action>
    <Action icon="📞">Setup Voice Agent</Action>
  </QuickActions>

  <SupportBox>
    <p>Questions? We're here to help!</p>
    <a href="tel:7207022122">📞 (720) 702-2122</a>
    <a href="mailto:hello@agentiosk.com">📧 hello@agentiosk.com</a>
  </SupportBox>
</ConfirmationStep>
```

---

## Database Schema

### `subscriptions` Table

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  business_config_id UUID REFERENCES business_config(id),

  -- Plan Details
  plan_tier TEXT CHECK (plan_tier IN ('starter', 'professional', 'enterprise')),
  locations INTEGER DEFAULT 1,
  base_price_per_location DECIMAL(10,2), -- Before discounts
  volume_discount_pct DECIMAL(5,2) DEFAULT 0,
  monthly_total DECIMAL(10,2), -- After discounts

  -- Add-ons
  addons JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"type": "ai_voice", "price": 200}, {"type": "sms", "price": 49}]

  -- Billing Status
  status TEXT DEFAULT 'pending_hardware' CHECK (
    status IN ('pending_hardware', 'active', 'past_due', 'paused', 'cancelled')
  ),
  billing_start_date DATE, -- Set when hardware ships
  current_period_start DATE,
  current_period_end DATE,

  -- Payment
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  payment_method_last4 TEXT,
  payment_method_brand TEXT, -- visa, mastercard, etc.

  -- Hardware
  hardware_status TEXT DEFAULT 'not_ordered' CHECK (
    hardware_status IN ('not_ordered', 'ordered', 'shipped', 'delivered', 'installed')
  ),
  hardware_tracking_number TEXT,
  hardware_estimated_delivery DATE,

  -- Usage Tracking (for usage-based billing)
  current_usage JSONB DEFAULT '{
    "interactions": 0,
    "sms_sent": 0,
    "voice_minutes": 0
  }'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  trial_end_date DATE
);
```

### `invoices` Table

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id),

  invoice_number TEXT UNIQUE, -- INV-2025-001234
  amount_due DECIMAL(10,2),
  amount_paid DECIMAL(10,2) DEFAULT 0,
  status TEXT CHECK (status IN ('draft', 'sent', 'paid', 'failed', 'refunded')),

  line_items JSONB, -- Breakdown of charges

  due_date DATE,
  paid_at TIMESTAMPTZ,

  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `hardware_shipments` Table

```sql
CREATE TABLE hardware_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id),

  package_type TEXT, -- 'standard', 'premium'
  quantity INTEGER DEFAULT 1,

  shipping_address JSONB,
  tracking_number TEXT,
  carrier TEXT, -- 'fedex', 'ups', 'usps'

  status TEXT CHECK (status IN ('pending', 'processing', 'shipped', 'in_transit', 'delivered')),

  ordered_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  estimated_delivery TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  installation_scheduled_date DATE,
  installation_completed_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Stripe Integration

### Setup Stripe

```javascript
// Install Stripe
npm install @stripe/stripe-js stripe

// Environment variables
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Create Payment Component

```jsx
// src/components/PaymentSetup.jsx
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

function PaymentForm({ subscription, onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Create payment method
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement),
      billing_details: {
        email: user.email,
        name: businessConfig.business_name
      }
    })

    if (error) {
      alert(error.message)
      return
    }

    // Save payment method to Stripe customer
    const response = await fetch('/api/create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_method_id: paymentMethod.id,
        subscription_data: subscription,
        user_id: user.id
      })
    })

    const result = await response.json()

    if (result.success) {
      onSuccess(result.subscription)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button disabled={!stripe || loading}>
        {loading ? 'Processing...' : 'Authorize Payment'}
      </button>
    </form>
  )
}

export default function PaymentSetup(props) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  )
}
```

### API Endpoint

```javascript
// api/create-subscription.js
import Stripe from 'stripe'
import { supabase } from '../lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { payment_method_id, subscription_data, user_id } = req.body

  try {
    // Create or retrieve Stripe customer
    const customer = await stripe.customers.create({
      email: subscription_data.email,
      payment_method: payment_method_id,
      invoice_settings: {
        default_payment_method: payment_method_id
      },
      metadata: {
        user_id: user_id,
        business_name: subscription_data.business_name
      }
    })

    // Create subscription (but don't charge yet)
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price: subscription_data.stripe_price_id,
          quantity: subscription_data.locations
        }
      ],
      // Don't charge until hardware ships
      billing_cycle_anchor: 'manual',
      trial_end: 'now', // No trial, just delayed billing
      metadata: {
        user_id: user_id,
        locations: subscription_data.locations
      }
    })

    // Save to database
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user_id,
        plan_tier: subscription_data.plan_tier,
        locations: subscription_data.locations,
        monthly_total: subscription_data.monthly_total,
        status: 'pending_hardware',
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        payment_method_last4: payment_method_id.slice(-4)
      })
      .select()
      .single()

    return res.status(200).json({
      success: true,
      subscription: data,
      customer_id: customer.id
    })

  } catch (err) {
    console.error('Stripe error:', err)
    return res.status(500).json({ error: err.message })
  }
}
```

### Webhook Handler (Activate Billing When Hardware Ships)

```javascript
// api/stripe-webhook.js
import Stripe from 'stripe'
import { supabase } from '../lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Handle different event types
  switch (event.type) {
    case 'invoice.payment_succeeded':
      // Payment successful
      await handlePaymentSuccess(event.data.object)
      break

    case 'invoice.payment_failed':
      // Payment failed
      await handlePaymentFailed(event.data.object)
      break

    case 'customer.subscription.deleted':
      // Subscription cancelled
      await handleSubscriptionCancelled(event.data.object)
      break
  }

  res.json({ received: true })
}

async function handlePaymentSuccess(invoice) {
  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({ status: 'active' })
    .eq('stripe_subscription_id', invoice.subscription)
}
```

---

## Feature Gating

### Based on Subscription Status

```jsx
// src/hooks/useSubscription.js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useSubscription(userId) {
  const [subscription, setSubscription] = useState(null)
  const [features, setFeatures] = useState({})

  useEffect(() => {
    loadSubscription()
  }, [userId])

  const loadSubscription = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    setSubscription(data)
    setFeatures(calculateFeatures(data))
  }

  const calculateFeatures = (sub) => {
    if (!sub) return { limited: true }

    return {
      // Always available (even pending hardware)
      adminPanel: true,
      configuration: true,
      analytics: sub.plan_tier !== 'starter',
      teamMembers: true,

      // Available when subscription active
      kioskAccess: sub.status === 'active',
      voiceAI: sub.addons?.some(a => a.type === 'ai_voice') && sub.status === 'active',
      smsNotifications: sub.addons?.some(a => a.type === 'sms'),
      advancedAnalytics: sub.addons?.some(a => a.type === 'analytics'),

      // Plan-specific
      customBranding: sub.plan_tier !== 'starter',
      posIntegrations: sub.plan_tier !== 'starter',
      prioritySupport: sub.plan_tier === 'enterprise',
      whiteLabel: sub.plan_tier === 'enterprise',

      // Hardware status
      hardwareShipped: sub.hardware_status === 'shipped',
      hardwareDelivered: sub.hardware_status === 'delivered'
    }
  }

  return { subscription, features, reload: loadSubscription }
}
```

### Usage in Components

```jsx
// Example: Gate voice AI feature
function VoiceAgentTab() {
  const { features, subscription } = useSubscription(user.id)

  if (!features.voiceAI) {
    return (
      <UpgradePrompt>
        <h3>🎤 Voice AI Ordering</h3>
        <p>Add conversational ordering to your kiosk</p>
        <ul>
          <li>Natural language processing</li>
          <li>Menu recommendations</li>
          <li>Reduces wait times by 40%</li>
        </ul>
        <Price>$200/mo</Price>
        <button onClick={() => addAddon('ai_voice')}>
          Add Voice AI →
        </button>
      </UpgradePrompt>
    )
  }

  return <VoiceAgentConfiguration />
}
```

---

## Continued in next message...
