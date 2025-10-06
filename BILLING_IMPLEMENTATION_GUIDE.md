# Billing Implementation Guide - Part 2

## Hardware Fulfillment Automation

### Trigger Billing When Hardware Ships

```javascript
// api/update-hardware-status.js
import { supabase } from '../lib/supabase'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  // Called by shipping provider webhook or manual admin update
  const { subscription_id, tracking_number, carrier, estimated_delivery } = req.body

  try {
    // Update hardware shipment
    const { data: shipment } = await supabase
      .from('hardware_shipments')
      .update({
        status: 'shipped',
        tracking_number,
        carrier,
        shipped_at: new Date().toISOString(),
        estimated_delivery
      })
      .eq('subscription_id', subscription_id)
      .select()
      .single()

    // Update subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .update({
        hardware_status: 'shipped',
        hardware_tracking_number: tracking_number,
        hardware_estimated_delivery: estimated_delivery,
        billing_start_date: estimated_delivery,
        status: 'active'
      })
      .eq('id', subscription_id)
      .select()
      .single()

    // Activate Stripe subscription
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      billing_cycle_anchor: Math.floor(new Date(estimated_delivery).getTime() / 1000),
      proration_behavior: 'none'
    })

    // Send notification email
    await sendEmail({
      to: subscription.user_email,
      template: 'hardware_shipped',
      data: {
        tracking_number,
        carrier,
        estimated_delivery,
        tracking_url: getTrackingUrl(carrier, tracking_number),
        first_charge_date: estimated_delivery,
        first_charge_amount: calculateFirstCharge(subscription)
      }
    })

    return res.json({ success: true, shipment, subscription })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

function calculateFirstCharge(subscription) {
  // Monthly subscription + hardware (if financed)
  let total = subscription.monthly_total

  if (subscription.hardware_financing) {
    total += subscription.hardware_monthly_payment
  } else {
    // Or one-time hardware charge
    total += subscription.hardware_upfront_cost
  }

  return total
}
```

---

## Email Notifications

### Templates

**1. Welcome & Setup (Immediately After Signup)**
```html
Subject: 🎉 Welcome to EngageOS! Let's get you set up

Hi {{business_name}},

Your EngageOS account is ready! Here's what happens next:

✅ AVAILABLE NOW (No hardware needed):
• Configure your kiosk branding and features
• Add trivia questions and menu items
• Invite team members
• Preview your kiosk in demo mode
• Set up integrations

👉 Get Started: {{admin_panel_url}}

📦 HARDWARE STATUS:
Your {{hardware_package}} is being prepared.
Ships in: 7-10 business days
Delivery: {{estimated_delivery}}

💳 BILLING:
First charge: {{first_charge_date}}
Amount: ${{first_charge_amount}}
(Includes first month + hardware)

Questions? Reply to this email or call (720) 702-2122.

Let's make your customers love waiting!
- The EngageOS Team
```

**2. Hardware Shipped**
```html
Subject: 📦 Your EngageOS kiosk is on the way!

Hi {{business_name}},

Great news - your kiosk hardware has shipped!

📦 TRACKING INFO:
Carrier: {{carrier}}
Tracking: {{tracking_number}}
Track it: {{tracking_url}}
Estimated Delivery: {{estimated_delivery}}

💳 BILLING STARTS:
First charge: {{first_charge_date}} (${{first_charge_amount}})
We'll email you a receipt after the charge.

📋 BEFORE IT ARRIVES:
☐ Complete your kiosk configuration
☐ Train your team (5-minute video: {{training_url}})
☐ Test your setup in demo mode
☐ Schedule installation (if purchased)

Need help? We're here: hello@agentiosk.com

See you soon!
```

**3. First Charge Notification (3 Days Before)**
```html
Subject: 💳 Your first charge is coming up

Hi {{business_name}},

Your kiosk is arriving soon! Here's a reminder about your first charge:

CHARGE DATE: {{charge_date}} (in 3 days)
AMOUNT: ${{amount}}

BREAKDOWN:
• Monthly subscription ({{locations}} locations): ${{monthly_sub}}
• Hardware ({{hardware_package}}): ${{hardware_cost}}
• Add-ons: ${{addons_total}}
───────────────────────────
TOTAL: ${{total}}

Payment method: {{card_brand}} ending in {{last4}}

Need to update? {{update_payment_url}}

Questions? Reply or call (720) 702-2122.
```

**4. Payment Receipt**
```html
Subject: ✅ Receipt for your EngageOS subscription

Invoice #{{invoice_number}}
Date: {{invoice_date}}

Hi {{business_name}},

Thank you for your payment!

AMOUNT PAID: ${{amount_paid}}
Payment method: {{card_brand}} ••••{{last4}}

NEXT CHARGE:
Date: {{next_charge_date}}
Amount: ${{next_amount}}

View full invoice: {{invoice_url}}

Your EngageOS Team
```

---

## Admin UI - Billing Dashboard

```jsx
// src/components/BillingDashboard.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { loadStripe } from '@stripe/stripe-js'

export default function BillingDashboard({ user }) {
  const [subscription, setSubscription] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [hardwareStatus, setHardwareStatus] = useState(null)

  useEffect(() => {
    loadBillingData()
  }, [user])

  const loadBillingData = async () => {
    // Load subscription
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    setSubscription(sub)

    // Load invoices
    const { data: inv } = await supabase
      .from('invoices')
      .select('*')
      .eq('subscription_id', sub.id)
      .order('created_at', { ascending: false })
      .limit(12)

    setInvoices(inv)

    // Load hardware status
    const { data: hw } = await supabase
      .from('hardware_shipments')
      .select('*')
      .eq('subscription_id', sub.id)
      .single()

    setHardwareStatus(hw)
  }

  return (
    <div style={styles.dashboard}>
      {/* Current Plan */}
      <Card>
        <h2>Current Plan</h2>
        <PlanBadge tier={subscription.plan_tier}>
          {subscription.plan_tier.toUpperCase()}
        </PlanBadge>

        <PriceDisplay>
          ${subscription.monthly_total}
          <span>/month</span>
        </PriceDisplay>

        <Features>
          <Feature>✓ {subscription.locations} location{subscription.locations > 1 ? 's' : ''}</Feature>
          <Feature>✓ Up to {getInteractionLimit(subscription.plan_tier)} interactions/mo</Feature>
          {subscription.addons?.map(addon => (
            <Feature key={addon.type}>✓ {addon.name}</Feature>
          ))}
        </Features>

        <Actions>
          <button onClick={() => setShowUpgrade(true)}>
            Upgrade Plan
          </button>
          <button onClick={() => setShowAddons(true)}>
            Add Features
          </button>
        </Actions>
      </Card>

      {/* Billing Status */}
      <Card>
        <h2>Billing Status</h2>

        {subscription.status === 'pending_hardware' && (
          <StatusBanner color="blue">
            ⏸️ Billing Paused
            <p>Your first charge will occur when hardware ships</p>
          </StatusBanner>
        )}

        {subscription.status === 'active' && (
          <>
            <StatusBanner color="green">
              ✅ Active
            </StatusBanner>
            <InfoRow>
              <span>Next charge:</span>
              <strong>{formatDate(subscription.current_period_end)}</strong>
            </InfoRow>
            <InfoRow>
              <span>Amount:</span>
              <strong>${subscription.monthly_total}</strong>
            </InfoRow>
          </>
        )}

        {subscription.status === 'past_due' && (
          <StatusBanner color="red">
            ⚠️ Payment Failed
            <p>Please update your payment method</p>
            <button onClick={updatePaymentMethod}>
              Update Payment Method
            </button>
          </StatusBanner>
        )}

        <InfoRow>
          <span>Payment method:</span>
          <PaymentMethod>
            {subscription.payment_method_brand} ••••{subscription.payment_method_last4}
            <button onClick={updatePaymentMethod}>Update</button>
          </PaymentMethod>
        </InfoRow>
      </Card>

      {/* Hardware Status */}
      {hardwareStatus && (
        <Card>
          <h2>Hardware Status</h2>

          <Timeline>
            <Step completed={hardwareStatus.status !== 'pending'}>
              <icon>✓</icon>
              <label>Ordered</label>
              <date>{formatDate(hardwareStatus.ordered_at)}</date>
            </Step>

            <Step completed={['shipped', 'in_transit', 'delivered'].includes(hardwareStatus.status)}>
              <icon>📦</icon>
              <label>Shipped</label>
              {hardwareStatus.shipped_at && (
                <date>{formatDate(hardwareStatus.shipped_at)}</date>
              )}
            </Step>

            <Step completed={hardwareStatus.status === 'delivered'}>
              <icon>🚚</icon>
              <label>Delivered</label>
              {hardwareStatus.delivered_at && (
                <date>{formatDate(hardwareStatus.delivered_at)}</date>
              )}
            </Step>
          </Timeline>

          {hardwareStatus.tracking_number && (
            <TrackingInfo>
              <label>Tracking Number:</label>
              <value>{hardwareStatus.tracking_number}</value>
              <a href={getTrackingUrl(hardwareStatus.carrier, hardwareStatus.tracking_number)} target="_blank">
                Track Package →
              </a>
            </TrackingInfo>
          )}

          {hardwareStatus.estimated_delivery && (
            <InfoRow>
              <span>Estimated Delivery:</span>
              <strong>{formatDate(hardwareStatus.estimated_delivery)}</strong>
            </InfoRow>
          )}
        </Card>
      )}

      {/* Usage This Month */}
      <Card>
        <h2>Usage This Month</h2>

        <UsageBar
          label="Customer Interactions"
          current={subscription.current_usage?.interactions || 0}
          limit={getInteractionLimit(subscription.plan_tier)}
        />

        {subscription.addons?.some(a => a.type === 'sms') && (
          <UsageBar
            label="SMS Messages"
            current={subscription.current_usage?.sms_sent || 0}
            limit={1000}
            overage={0.05}
          />
        )}

        {subscription.addons?.some(a => a.type === 'ai_voice') && (
          <UsageBar
            label="Voice AI Minutes"
            current={subscription.current_usage?.voice_minutes || 0}
            limit={Infinity}
            note="Unlimited on your plan"
          />
        )}
      </Card>

      {/* Recent Invoices */}
      <Card>
        <h2>Billing History</h2>

        <InvoiceList>
          {invoices.map(invoice => (
            <InvoiceRow key={invoice.id}>
              <InvoiceNumber>{invoice.invoice_number}</InvoiceNumber>
              <InvoiceDate>{formatDate(invoice.created_at)}</InvoiceDate>
              <InvoiceAmount>${invoice.amount_due}</InvoiceAmount>
              <InvoiceStatus status={invoice.status}>
                {invoice.status}
              </InvoiceStatus>
              <InvoiceActions>
                <button onClick={() => downloadInvoice(invoice.id)}>
                  Download PDF
                </button>
              </InvoiceActions>
            </InvoiceRow>
          ))}
        </InvoiceList>

        <ViewAll href="/admin/invoices">
          View All Invoices →
        </ViewAll>
      </Card>

      {/* Danger Zone */}
      <Card danger>
        <h2>Cancel Subscription</h2>
        <p>
          Cancel anytime. You'll have access until the end of your current billing period.
        </p>
        <button onClick={() => setShowCancelModal(true)} style={{ color: 'red' }}>
          Cancel Subscription
        </button>
      </Card>
    </div>
  )
}
```

---

## Self-Service Upgrade/Downgrade

```jsx
// src/components/ChangePlanModal.jsx
export default function ChangePlanModal({ currentPlan, onClose }) {
  const [selectedPlan, setSelectedPlan] = useState(currentPlan)
  const [loading, setLoading] = useState(false)

  const plans = [
    {
      tier: 'starter',
      name: 'Starter',
      price: 399,
      features: [
        'Core kiosk features',
        'Up to 5,000 interactions/mo',
        'Basic analytics',
        'Email support'
      ]
    },
    {
      tier: 'professional',
      name: 'Professional',
      price: 799,
      badge: 'Most Popular',
      features: [
        'Everything in Starter',
        'Voice AI ordering',
        'Up to 25,000 interactions/mo',
        'Advanced analytics',
        'POS integrations',
        'Priority support'
      ]
    },
    {
      tier: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      features: [
        'Everything in Professional',
        'Unlimited interactions',
        'White-label option',
        'Dedicated success manager',
        'SLA guarantees'
      ]
    }
  ]

  const handleUpgrade = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_plan: selectedPlan,
          user_id: user.id
        })
      })

      const result = await response.json()

      if (result.success) {
        alert(`Successfully upgraded to ${selectedPlan}!`)
        onClose()
        window.location.reload()
      }
    } catch (err) {
      alert('Error changing plan: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal>
      <h2>Change Your Plan</h2>

      <PlanGrid>
        {plans.map(plan => (
          <PlanCard
            key={plan.tier}
            selected={selectedPlan === plan.tier}
            current={currentPlan === plan.tier}
            onClick={() => setSelectedPlan(plan.tier)}
          >
            {plan.badge && <Badge>{plan.badge}</Badge>}
            {currentPlan === plan.tier && <Badge>Current Plan</Badge>}

            <PlanName>{plan.name}</PlanName>
            <PlanPrice>
              {typeof plan.price === 'number' ? `$${plan.price}/mo` : plan.price}
            </PlanPrice>

            <FeatureList>
              {plan.features.map((feature, i) => (
                <Feature key={i}>✓ {feature}</Feature>
              ))}
            </FeatureList>

            {selectedPlan === plan.tier && plan.tier !== currentPlan && (
              <SelectButton>Selected</SelectButton>
            )}
          </PlanCard>
        ))}
      </PlanGrid>

      {selectedPlan !== currentPlan && (
        <Actions>
          <PricingNote>
            {selectedPlan > currentPlan
              ? `You'll be charged the difference prorated for this month`
              : `You'll receive a credit for the remainder of this month`
            }
          </PricingNote>

          <button onClick={handleUpgrade} disabled={loading}>
            {loading ? 'Processing...' : `Change to ${selectedPlan}`}
          </button>
          <button onClick={onClose}>Cancel</button>
        </Actions>
      )}
    </Modal>
  )
}
```

---

## Testing Checklist

### Stripe Test Mode

```bash
# Use Stripe test keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Test cards (no real charges)
4242424242424242 # Success
4000000000000002 # Declined
4000000000009995 # Insufficient funds
```

### Test Scenarios

- [ ] Sign up with test card
- [ ] Card authorization succeeds (no charge yet)
- [ ] Admin panel accessible immediately
- [ ] Configure features without hardware
- [ ] Mark hardware as "shipped" (admin function)
- [ ] Verify first charge triggers
- [ ] Receive all email notifications
- [ ] Change payment method
- [ ] Upgrade/downgrade plan
- [ ] Add/remove add-ons
- [ ] Cancel subscription
- [ ] Reactivate cancelled subscription
- [ ] Handle failed payment
- [ ] Retry failed payment
- [ ] Webhook events process correctly

---

## Migration Plan

### Phase 1: Database Setup (Week 1)
```sql
-- Run migrations
supabase/migrations/20251006_subscriptions_table.sql
supabase/migrations/20251006_invoices_table.sql
supabase/migrations/20251006_hardware_shipments_table.sql
```

### Phase 2: Stripe Integration (Week 1)
- [ ] Create Stripe account
- [ ] Set up products & prices
- [ ] Configure webhooks
- [ ] Test in sandbox

### Phase 3: UI Development (Week 2)
- [ ] Payment setup wizard
- [ ] Billing dashboard
- [ ] Plan upgrade/downgrade
- [ ] Invoice management

### Phase 4: Automation (Week 2-3)
- [ ] Hardware fulfillment webhook
- [ ] Email notifications
- [ ] Usage tracking
- [ ] Feature gating

### Phase 5: Testing (Week 3)
- [ ] End-to-end test scenarios
- [ ] Load testing
- [ ] Security audit
- [ ] Compliance review

### Phase 6: Launch (Week 4)
- [ ] Switch to live Stripe keys
- [ ] Monitor first transactions
- [ ] Customer support ready
- [ ] Documentation complete

---

## Pricing Calculator Tool

Add to marketing site for transparency:

```jsx
// marketing-site/pricing-calculator.html
<PricingCalculator>
  <input
    type="number"
    value={locations}
    onChange={(e) => setLocations(e.target.value)}
    label="Number of Locations"
  />

  <select value={plan} onChange={(e) => setPlan(e.target.value)}>
    <option value="starter">Starter - $399/mo</option>
    <option value="professional">Professional - $799/mo</option>
    <option value="enterprise">Enterprise - Custom</option>
  </select>

  <Addons>
    <Checkbox checked={aiVoice} onChange={setAiVoice}>
      AI Voice Agent (+$200/mo)
    </Checkbox>
    <Checkbox checked={sms} onChange={setSms}>
      SMS Notifications (+$49/mo)
    </Checkbox>
  </Addons>

  <Result>
    <h3>Your Monthly Cost</h3>
    <Breakdown>
      <Line>
        <span>{plan} plan × {locations} locations</span>
        <span>${planPrice * locations}</span>
      </Line>
      {volumeDiscount > 0 && (
        <Line highlight>
          <span>Volume discount (-{volumeDiscount}%)</span>
          <span>-${discountAmount}</span>
        </Line>
      )}
      {aiVoice && <Line><span>AI Voice</span><span>+$200</span></Line>}
      {sms && <Line><span>SMS</span><span>+$49</span></Line>}
      <Total>
        <span>Total</span>
        <span>${monthlyTotal}/mo</span>
      </Total>
    </Breakdown>

    <HardwareCost>
      <h4>One-time Hardware</h4>
      <p>${hardwareCost} or ${hardwareMonthly}/mo for 36 months</p>
    </HardwareCost>

    <CTAs>
      <button onClick={() => window.location.href = '/signup'}>
        Get Started →
      </button>
      <button onClick={() => window.location.href = '#demo'}>
        Talk to Sales
      </button>
    </CTAs>
  </Result>
</PricingCalculator>
```

---

*Last updated: October 2025*
*EngageOS™ by Agentiosk - Internal Use Only*
