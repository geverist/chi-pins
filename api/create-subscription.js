// api/create-subscription.js
// Creates a new subscription with Stripe and stores in Supabase

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      userId,
      planId,
      locations,
      addons,
      hardwarePackage,
      paymentMethodId,
      hardwarePaymentType, // 'finance' or 'upfront'
    } = req.body

    // Validate required fields
    if (!userId || !planId || !locations || !hardwarePackage || !paymentMethodId) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'planId', 'locations', 'hardwarePackage', 'paymentMethodId']
      })
    }

    // Get user from Supabase
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Create or retrieve Stripe customer
    let stripeCustomerId
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (existingSub?.stripe_customer_id) {
      stripeCustomerId = existingSub.stripe_customer_id
    } else {
      const customer = await stripe.customers.create({
        email: user.user.email,
        metadata: {
          supabase_user_id: userId
        }
      })
      stripeCustomerId = customer.id
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId,
    })

    // Set as default payment method
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    })

    // Calculate pricing
    const planPricing = {
      starter: { basePrice: 39900, stripePriceId: process.env.VITE_STRIPE_PRICE_STARTER },
      professional: { basePrice: 79900, stripePriceId: process.env.VITE_STRIPE_PRICE_PROFESSIONAL },
    }[planId]

    if (!planPricing) {
      return res.status(400).json({ error: 'Invalid plan ID' })
    }

    // Calculate volume discount
    const volumeDiscounts = [
      { min: 1, max: 1, discount: 0 },
      { min: 2, max: 4, discount: 10 },
      { min: 5, max: 9, discount: 15 },
      { min: 10, max: 19, discount: 20 },
      { min: 20, max: Infinity, discount: 25 },
    ]
    const volumeDiscount = volumeDiscounts.find(
      tier => locations >= tier.min && locations <= tier.max
    )?.discount || 0

    // Create subscription with Stripe
    // NOTE: We start it in 'trialing' status until hardware ships
    const subscriptionItems = [
      {
        price: planPricing.stripePriceId,
        quantity: locations,
      }
    ]

    // Add addons
    const addonPricing = {
      ai_voice: process.env.VITE_STRIPE_PRICE_VOICE,
      sms: process.env.VITE_STRIPE_PRICE_SMS,
      analytics: process.env.VITE_STRIPE_PRICE_ANALYTICS,
    }

    if (addons && Array.isArray(addons)) {
      addons.forEach(addonId => {
        if (addonPricing[addonId]) {
          subscriptionItems.push({
            price: addonPricing[addonId],
            quantity: locations,
          })
        }
      })
    }

    // Create subscription (starts in trial mode until hardware ships)
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: subscriptionItems,
      trial_end: 'now', // Will be updated when hardware ships
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card'],
      },
      metadata: {
        user_id: userId,
        plan_id: planId,
        locations: locations.toString(),
        volume_discount: volumeDiscount.toString(),
        hardware_package: hardwarePackage,
        hardware_payment_type: hardwarePaymentType,
      },
    })

    // Handle hardware payment
    let hardwarePaymentIntent = null
    if (hardwarePaymentType === 'upfront') {
      // Charge hardware cost immediately
      const hardwarePricing = {
        standard: 129900,
        premium: 189900,
      }[hardwarePackage]

      hardwarePaymentIntent = await stripe.paymentIntents.create({
        amount: hardwarePricing,
        currency: 'usd',
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        confirm: true,
        description: `Hardware Package: ${hardwarePackage}`,
        metadata: {
          user_id: userId,
          hardware_package: hardwarePackage,
        },
      })
    }

    // Store subscription in Supabase
    const addonsList = (addons || []).map(addonId => {
      const prices = {
        ai_voice: 20000,
        sms: 4900,
        analytics: 9900,
      }
      return {
        name: addonId,
        price: prices[addonId] || 0,
      }
    })

    const { data: subscriptionRecord, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscription.id,
        stripe_payment_method_id: paymentMethodId,
        plan_type: planId,
        status: 'pending_hardware', // Won't bill until hardware ships
        base_price: planPricing.basePrice,
        discount_percent: volumeDiscount,
        locations,
        hardware_status: 'pending',
        addons: addonsList,
      })
      .select()
      .single()

    if (subError) {
      console.error('Error storing subscription:', subError)
      // Try to cancel Stripe subscription if DB insert fails
      await stripe.subscriptions.cancel(subscription.id)
      return res.status(500).json({ error: 'Failed to create subscription', details: subError.message })
    }

    // Create hardware shipment record
    const hardwareItems = {
      standard: [
        { name: 'iPad Pro 12.9"', quantity: 1, serial: '' },
        { name: 'Floor Stand', quantity: 1, serial: '' },
        { name: 'Card Reader', quantity: 1, serial: '' },
      ],
      premium: [
        { name: 'iPad Pro 12.9"', quantity: 1, serial: '' },
        { name: 'Premium Floor Stand', quantity: 1, serial: '' },
        { name: 'Card Reader', quantity: 1, serial: '' },
        { name: 'Printer for Receipts', quantity: 1, serial: '' },
      ],
    }[hardwarePackage]

    const { data: businessConfig } = await supabase
      .from('business_config')
      .select('business_name, phone_number')
      .eq('user_id', userId)
      .single()

    const { error: shipmentError } = await supabase
      .from('hardware_shipments')
      .insert({
        subscription_id: subscriptionRecord.id,
        user_id: userId,
        package_type: hardwarePackage,
        items: hardwareItems,
        shipping_address: {
          name: businessConfig?.business_name || 'New Customer',
          phone: businessConfig?.phone_number || '',
          // Address will be collected separately
        },
        status: 'preparing',
      })

    if (shipmentError) {
      console.error('Error creating shipment:', shipmentError)
    }

    // Send welcome email
    try {
      await fetch(`${req.headers.origin || 'https://app.agentiosk.com'}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.user.email,
          subject: '🎉 Welcome to EngageOS - Your Kiosk is On the Way!',
          html: `
            <h2>Welcome to EngageOS!</h2>
            <p>Thank you for choosing EngageOS for your business.</p>

            <h3>What's Next?</h3>
            <ol>
              <li><strong>Your hardware is being prepared</strong> - We'll notify you when it ships</li>
              <li><strong>Access your admin panel now</strong> - Start configuring your kiosk at <a href="https://app.agentiosk.com/admin">app.agentiosk.com/admin</a></li>
              <li><strong>No billing yet</strong> - Your subscription starts when hardware ships</li>
            </ol>

            <h3>Your Plan Details</h3>
            <ul>
              <li>Plan: ${planId.charAt(0).toUpperCase() + planId.slice(1)}</li>
              <li>Locations: ${locations}</li>
              <li>Monthly Total: $${(planPricing.basePrice * (1 - volumeDiscount / 100) / 100).toFixed(2)}</li>
            </ul>

            <p>Questions? Reply to this email or contact us at <a href="mailto:hello@agentiosk.com">hello@agentiosk.com</a></p>

            <p>Best regards,<br>The EngageOS Team</p>
          `,
        }),
      })
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError)
      // Don't fail the whole request if email fails
    }

    // Return success
    return res.status(200).json({
      success: true,
      subscription: {
        id: subscriptionRecord.id,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: stripeCustomerId,
        status: 'pending_hardware',
        plan: planId,
        locations,
      },
      hardwarePayment: hardwarePaymentIntent ? {
        status: hardwarePaymentIntent.status,
        amount: hardwarePaymentIntent.amount,
      } : null,
    })

  } catch (error) {
    console.error('Error creating subscription:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
}
