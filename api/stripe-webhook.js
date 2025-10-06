// api/stripe-webhook.js
// Handles Stripe webhook events for subscription management

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Disable body parsing to get raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
}

// Helper to read raw body
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const rawBody = await getRawBody(req)
    const signature = req.headers['stripe-signature']

    // Verify webhook signature
    let event
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return res.status(400).json({ error: 'Invalid signature' })
    }

    console.log('Stripe webhook event:', event.type)

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object)
        break

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return res.status(200).json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return res.status(500).json({
      error: 'Webhook handler failed',
      message: error.message,
    })
  }
}

// Event handlers

async function handleSubscriptionCreated(subscription) {
  console.log('Subscription created:', subscription.id)

  // Update subscription status in database
  const { error } = await supabase
    .from('subscriptions')
    .update({
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error updating subscription:', error)
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id)

  // Map Stripe status to our status
  let status = subscription.status
  if (status === 'trialing' || status === 'incomplete') {
    status = 'pending_hardware'
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error updating subscription:', error)
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Subscription deleted:', subscription.id)

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error updating subscription:', error)
  }

  // Send cancellation email
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (sub) {
    const { data: { user } } = await supabase.auth.admin.getUserById(sub.user_id)
    if (user?.email) {
      try {
        await fetch('https://app.agentiosk.com/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: user.email,
            subject: 'Your EngageOS Subscription Has Been Canceled',
            html: `
              <h2>Subscription Canceled</h2>
              <p>Your EngageOS subscription has been canceled. You'll continue to have access until the end of your current billing period.</p>
              <p>We're sorry to see you go! If you have any feedback or want to reactivate, please contact us at <a href="mailto:hello@agentiosk.com">hello@agentiosk.com</a>.</p>
            `,
          }),
        })
      } catch (emailError) {
        console.error('Error sending cancellation email:', emailError)
      }
    }
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  console.log('Invoice payment succeeded:', invoice.id)

  // Get subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', invoice.subscription)
    .single()

  if (!sub) {
    console.error('Subscription not found for invoice:', invoice.id)
    return
  }

  // Create invoice record
  const lineItems = invoice.lines.data.map(line => ({
    description: line.description,
    amount: line.amount,
    quantity: line.quantity,
  }))

  const { error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      subscription_id: sub.id,
      user_id: sub.user_id,
      stripe_invoice_id: invoice.id,
      stripe_payment_intent_id: invoice.payment_intent,
      invoice_number: invoice.number,
      status: 'paid',
      subtotal: invoice.subtotal,
      tax: invoice.tax || 0,
      total: invoice.total,
      amount_paid: invoice.amount_paid,
      amount_due: invoice.amount_due,
      currency: invoice.currency,
      period_start: new Date(invoice.period_start * 1000).toISOString(),
      period_end: new Date(invoice.period_end * 1000).toISOString(),
      payment_method: 'card',
      paid_at: new Date(invoice.status_transitions.paid_at * 1000).toISOString(),
      line_items: lineItems,
      invoice_pdf_url: invoice.invoice_pdf,
      hosted_invoice_url: invoice.hosted_invoice_url,
    })

  if (invoiceError) {
    console.error('Error creating invoice record:', invoiceError)
  }

  // Send receipt email
  const { data: { user } } = await supabase.auth.admin.getUserById(sub.user_id)
  if (user?.email) {
    try {
      await fetch('https://app.agentiosk.com/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          subject: `Receipt from EngageOS - $${(invoice.total / 100).toFixed(2)}`,
          html: `
            <h2>Payment Receipt</h2>
            <p>Thank you for your payment!</p>

            <h3>Invoice Details</h3>
            <p><strong>Invoice #:</strong> ${invoice.number}</p>
            <p><strong>Amount Paid:</strong> $${(invoice.amount_paid / 100).toFixed(2)}</p>
            <p><strong>Date:</strong> ${new Date(invoice.status_transitions.paid_at * 1000).toLocaleDateString()}</p>

            <h3>Line Items</h3>
            <ul>
              ${lineItems.map(item => `<li>${item.description} - $${(item.amount / 100).toFixed(2)}</li>`).join('')}
            </ul>

            <p><a href="${invoice.hosted_invoice_url}">View Full Invoice</a></p>

            <p>Questions? Contact us at <a href="mailto:hello@agentiosk.com">hello@agentiosk.com</a></p>
          `,
        }),
      })
    } catch (emailError) {
      console.error('Error sending receipt email:', emailError)
    }
  }
}

async function handleInvoicePaymentFailed(invoice) {
  console.log('Invoice payment failed:', invoice.id)

  // Update subscription status to past_due
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
    })
    .eq('stripe_subscription_id', invoice.subscription)

  if (error) {
    console.error('Error updating subscription to past_due:', error)
  }

  // Create failed invoice record
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', invoice.subscription)
    .single()

  if (sub) {
    await supabase
      .from('invoices')
      .insert({
        subscription_id: sub.id,
        user_id: sub.user_id,
        stripe_invoice_id: invoice.id,
        invoice_number: invoice.number,
        status: 'uncollectible',
        subtotal: invoice.subtotal,
        total: invoice.total,
        amount_due: invoice.amount_due,
        currency: invoice.currency,
        period_start: new Date(invoice.period_start * 1000).toISOString(),
        period_end: new Date(invoice.period_end * 1000).toISOString(),
      })

    // Send payment failed email
    const { data: { user } } = await supabase.auth.admin.getUserById(sub.user_id)
    if (user?.email) {
      try {
        await fetch('https://app.agentiosk.com/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: user.email,
            subject: '⚠️ Payment Failed - Action Required',
            html: `
              <h2>Payment Failed</h2>
              <p>We were unable to process your payment for EngageOS.</p>

              <p><strong>Amount Due:</strong> $${(invoice.amount_due / 100).toFixed(2)}</p>

              <h3>What You Need To Do</h3>
              <ol>
                <li>Update your payment method in your <a href="https://app.agentiosk.com/admin/billing">billing dashboard</a></li>
                <li>We'll automatically retry the payment</li>
              </ol>

              <p><strong>Important:</strong> Your service may be interrupted if payment is not received within 7 days.</p>

              <p>Questions? Contact us at <a href="mailto:hello@agentiosk.com">hello@agentiosk.com</a></p>
            `,
          }),
        })
      } catch (emailError) {
        console.error('Error sending payment failed email:', emailError)
      }
    }
  }
}

async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log('Payment intent succeeded:', paymentIntent.id)

  // Check if this is a hardware payment
  if (paymentIntent.metadata?.hardware_package) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', paymentIntent.metadata.user_id)
      .single()

    if (sub) {
      // Update shipment with payment confirmation
      await supabase
        .from('hardware_shipments')
        .update({
          notes: `Hardware payment received: ${paymentIntent.id}`,
        })
        .eq('subscription_id', sub.id)
    }
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  console.log('Payment intent failed:', paymentIntent.id)

  // Log the failure
  if (paymentIntent.metadata?.hardware_package) {
    console.error('Hardware payment failed:', paymentIntent.last_payment_error?.message)
  }
}
