// Stripe configuration
import { loadStripe } from '@stripe/stripe-js'

// Publishable key (safe to expose in client-side code)
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_...'

// Initialize Stripe
let stripePromise
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey)
  }
  return stripePromise
}

// Pricing configuration (matches BILLING_SYSTEM_DESIGN.md)
export const PRICING = {
  plans: {
    starter: {
      id: 'starter',
      name: 'Starter',
      basePrice: 399,
      stripePriceId: import.meta.env.VITE_STRIPE_PRICE_STARTER || 'price_starter',
      features: [
        'Up to 3 games',
        'Basic analytics',
        'Email support',
        'Photo booth',
        'Feedback system',
        '1 location'
      ]
    },
    professional: {
      id: 'professional',
      name: 'Professional',
      basePrice: 799,
      stripePriceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL || 'price_professional',
      features: [
        'Unlimited games',
        'Advanced analytics',
        'Priority support',
        'Photo booth',
        'Feedback system',
        'Custom branding',
        'Multiple languages',
        'Up to 5 locations'
      ],
      popular: true
    },
    enterprise: {
      id: 'enterprise',
      name: 'Enterprise',
      basePrice: null, // Custom pricing
      stripePriceId: null,
      features: [
        'Everything in Professional',
        'Unlimited locations',
        'Dedicated account manager',
        '24/7 phone support',
        'Custom integrations',
        'SLA guarantees',
        'White-label options'
      ],
      custom: true
    }
  },

  addons: {
    ai_voice: {
      id: 'ai_voice',
      name: 'AI Voice Agent',
      price: 200,
      stripePriceId: import.meta.env.VITE_STRIPE_PRICE_VOICE || 'price_voice',
      description: 'Natural language voice ordering and assistance',
      requiresHardware: true
    },
    sms: {
      id: 'sms',
      name: 'SMS Notifications',
      price: 49,
      stripePriceId: import.meta.env.VITE_STRIPE_PRICE_SMS || 'price_sms',
      description: 'Automated SMS for order updates and promotions',
      usageBased: true,
      includedSMS: 1000
    },
    analytics: {
      id: 'analytics',
      name: 'Advanced Analytics',
      price: 99,
      stripePriceId: import.meta.env.VITE_STRIPE_PRICE_ANALYTICS || 'price_analytics',
      description: 'Deep insights, custom reports, and data exports'
    }
  },

  hardware: {
    standard: {
      id: 'standard',
      name: 'Standard Package',
      price: 1299,
      financePrice: 49, // per month for 36 months
      stripePriceId: import.meta.env.VITE_STRIPE_PRICE_HW_STANDARD || 'price_hw_standard',
      items: [
        'iPad Pro 12.9"',
        'Floor stand',
        'Card reader',
        'Installation & setup'
      ]
    },
    premium: {
      id: 'premium',
      name: 'Premium Package',
      price: 1899,
      financePrice: 69,
      stripePriceId: import.meta.env.VITE_STRIPE_PRICE_HW_PREMIUM || 'price_hw_premium',
      items: [
        'iPad Pro 12.9"',
        'Premium floor stand',
        'Card reader',
        'Printer for receipts',
        'Installation & setup',
        'Extended warranty'
      ]
    }
  },

  // Volume discounts
  volumeDiscounts: [
    { minLocations: 1, maxLocations: 1, discount: 0, label: '1 location' },
    { minLocations: 2, maxLocations: 4, discount: 10, label: '2-4 locations (10% off)' },
    { minLocations: 5, maxLocations: 9, discount: 15, label: '5-9 locations (15% off)' },
    { minLocations: 10, maxLocations: 19, discount: 20, label: '10-19 locations (20% off)' },
    { minLocations: 20, maxLocations: Infinity, discount: 25, label: '20+ locations (25% off)' }
  ]
}

// Calculate total monthly price
export function calculateMonthlyTotal(plan, locations = 1, addons = []) {
  if (!plan || plan.custom) {
    return null // Enterprise is custom pricing
  }

  // Get base price
  let basePrice = plan.basePrice

  // Calculate volume discount
  const volumeDiscount = PRICING.volumeDiscounts.find(
    tier => locations >= tier.minLocations && locations <= tier.maxLocations
  )
  const discountPercent = volumeDiscount?.discount || 0

  // Apply discount to base price
  const discountedBase = basePrice * (1 - discountPercent / 100)

  // Calculate addon total
  const addonTotal = addons.reduce((sum, addonId) => {
    const addon = PRICING.addons[addonId]
    return sum + (addon?.price || 0)
  }, 0)

  // Total per location
  const perLocationTotal = discountedBase + addonTotal

  // Multiply by locations
  return perLocationTotal * locations
}

// Format price for display
export function formatPrice(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(cents)
}

// Get volume discount for location count
export function getVolumeDiscount(locations) {
  const tier = PRICING.volumeDiscounts.find(
    t => locations >= t.minLocations && locations <= t.maxLocations
  )
  return tier?.discount || 0
}
