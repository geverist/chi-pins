// Feature gating logic based on subscription status
import { supabase } from './supabase'

// Feature definitions with their requirements
export const FEATURES = {
  // Software features (available immediately after signup)
  admin_panel: {
    name: 'Admin Panel',
    requiresHardware: false,
    requiresSubscription: true,
    allowedPlans: ['starter', 'professional', 'enterprise'],
  },
  analytics_basic: {
    name: 'Basic Analytics',
    requiresHardware: false,
    requiresSubscription: true,
    allowedPlans: ['starter', 'professional', 'enterprise'],
  },
  analytics_advanced: {
    name: 'Advanced Analytics',
    requiresHardware: false,
    requiresSubscription: true,
    allowedPlans: ['professional', 'enterprise'],
    requiresAddon: 'analytics',
  },
  configuration: {
    name: 'Kiosk Configuration',
    requiresHardware: false,
    requiresSubscription: true,
    allowedPlans: ['starter', 'professional', 'enterprise'],
  },
  team_management: {
    name: 'Team Management',
    requiresHardware: false,
    requiresSubscription: true,
    allowedPlans: ['professional', 'enterprise'],
  },

  // Hardware-dependent features (require kiosk to be delivered)
  kiosk_interface: {
    name: 'Kiosk Interface',
    requiresHardware: true,
    requiresSubscription: true,
    allowedPlans: ['starter', 'professional', 'enterprise'],
  },
  games: {
    name: 'Interactive Games',
    requiresHardware: true,
    requiresSubscription: true,
    allowedPlans: ['starter', 'professional', 'enterprise'],
    maxGamesStarter: 3,
  },
  photo_booth: {
    name: 'Photo Booth',
    requiresHardware: true,
    requiresSubscription: true,
    allowedPlans: ['starter', 'professional', 'enterprise'],
  },
  ai_voice: {
    name: 'AI Voice Agent',
    requiresHardware: true,
    requiresSubscription: true,
    allowedPlans: ['starter', 'professional', 'enterprise'],
    requiresAddon: 'ai_voice',
  },
  feedback_capture: {
    name: 'Feedback System',
    requiresHardware: true,
    requiresSubscription: true,
    allowedPlans: ['starter', 'professional', 'enterprise'],
  },

  // Communication features
  sms_notifications: {
    name: 'SMS Notifications',
    requiresHardware: false,
    requiresSubscription: true,
    allowedPlans: ['starter', 'professional', 'enterprise'],
    requiresAddon: 'sms',
    usageLimit: 1000, // per month for base addon
  },
  email_notifications: {
    name: 'Email Notifications',
    requiresHardware: false,
    requiresSubscription: true,
    allowedPlans: ['starter', 'professional', 'enterprise'],
  },

  // Advanced features
  custom_branding: {
    name: 'Custom Branding',
    requiresHardware: false,
    requiresSubscription: true,
    allowedPlans: ['professional', 'enterprise'],
  },
  custom_domain: {
    name: 'Custom Domain',
    requiresHardware: false,
    requiresSubscription: true,
    allowedPlans: ['professional', 'enterprise'],
  },
  api_access: {
    name: 'API Access',
    requiresHardware: false,
    requiresSubscription: true,
    allowedPlans: ['enterprise'],
  },
}

// Check if user has access to a feature
export async function checkFeatureAccess(userId, featureId) {
  const feature = FEATURES[featureId]

  if (!feature) {
    return {
      allowed: false,
      reason: 'Unknown feature',
    }
  }

  // Get user's subscription
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('*, hardware_shipments(*)')
    .eq('user_id', userId)
    .single()

  if (error || !subscription) {
    return {
      allowed: false,
      reason: 'No active subscription',
      upgradeRequired: true,
    }
  }

  // Check if subscription is active
  if (!['active', 'pending_hardware', 'trialing'].includes(subscription.status)) {
    return {
      allowed: false,
      reason: `Subscription is ${subscription.status}`,
      actionRequired: subscription.status === 'past_due' ? 'update_payment' : 'reactivate',
    }
  }

  // Check if plan has access to this feature
  if (!feature.allowedPlans.includes(subscription.plan_type)) {
    return {
      allowed: false,
      reason: `Feature requires ${feature.allowedPlans.join(' or ')} plan`,
      upgradeRequired: true,
      requiredPlan: feature.allowedPlans[feature.allowedPlans.length - 1],
    }
  }

  // Check if feature requires an addon
  if (feature.requiresAddon) {
    const hasAddon = (subscription.addons || []).some(
      addon => addon.name === feature.requiresAddon
    )

    if (!hasAddon) {
      return {
        allowed: false,
        reason: `Feature requires ${feature.requiresAddon} add-on`,
        addonRequired: feature.requiresAddon,
      }
    }
  }

  // Check if feature requires hardware to be delivered
  if (feature.requiresHardware) {
    const hardwareShipment = subscription.hardware_shipments?.[0]

    if (!hardwareShipment) {
      return {
        allowed: false,
        reason: 'Hardware shipment not found',
        hardwareRequired: true,
      }
    }

    if (hardwareShipment.status !== 'delivered') {
      return {
        allowed: false,
        reason: `Hardware is ${hardwareShipment.status}. Feature will be available when hardware is delivered.`,
        hardwareRequired: true,
        hardwareStatus: hardwareShipment.status,
        estimatedDelivery: hardwareShipment.estimated_delivery,
      }
    }
  }

  // Check usage limits (for features like SMS)
  if (feature.usageLimit) {
    const currentUsage = subscription.current_usage?.[featureId] || 0

    if (currentUsage >= feature.usageLimit) {
      return {
        allowed: false,
        reason: `Monthly limit of ${feature.usageLimit} reached`,
        usageLimitReached: true,
        currentUsage,
        limit: feature.usageLimit,
      }
    }
  }

  // Check game limits for starter plan
  if (featureId === 'games' && subscription.plan_type === 'starter') {
    // This would need additional logic to count how many games are enabled
    // For now, we just return the limit info
    return {
      allowed: true,
      maxGames: feature.maxGamesStarter,
    }
  }

  // All checks passed!
  return {
    allowed: true,
  }
}

// Check multiple features at once
export async function checkMultipleFeatures(userId, featureIds) {
  const results = {}

  for (const featureId of featureIds) {
    results[featureId] = await checkFeatureAccess(userId, featureId)
  }

  return results
}

// Get all available features for a user
export async function getAvailableFeatures(userId) {
  const results = await checkMultipleFeatures(userId, Object.keys(FEATURES))

  return {
    available: Object.keys(results).filter(key => results[key].allowed),
    unavailable: Object.keys(results).filter(key => !results[key].allowed),
    details: results,
  }
}

// Increment usage counter for a feature
export async function incrementFeatureUsage(userId, featureId, amount = 1) {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, current_usage')
    .eq('user_id', userId)
    .single()

  if (!subscription) {
    throw new Error('Subscription not found')
  }

  const currentUsage = subscription.current_usage || {}
  const newUsage = {
    ...currentUsage,
    [featureId]: (currentUsage[featureId] || 0) + amount,
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({ current_usage: newUsage })
    .eq('id', subscription.id)

  if (error) {
    throw error
  }

  return newUsage[featureId]
}

// Reset usage counters (run monthly via cron job)
export async function resetMonthlyUsage() {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      current_usage: {
        interactions: 0,
        sms_sent: 0,
        voice_minutes: 0,
        photos_captured: 0,
      }
    })
    .in('status', ['active', 'trialing'])

  if (error) {
    throw error
  }

  console.log('Monthly usage counters reset')
}

// Helper function to show upgrade prompt
export function getUpgradeMessage(featureAccess, featureName) {
  if (featureAccess.allowed) return null

  if (featureAccess.hardwareRequired) {
    return {
      title: 'Hardware Required',
      message: `${featureName} will be available when your hardware is delivered.`,
      action: featureAccess.hardwareStatus === 'preparing' ? 'Track Shipment' : null,
    }
  }

  if (featureAccess.addonRequired) {
    return {
      title: 'Add-on Required',
      message: `${featureName} requires the ${featureAccess.addonRequired} add-on.`,
      action: 'Add to Plan',
      ctaUrl: '/admin/billing?addon=' + featureAccess.addonRequired,
    }
  }

  if (featureAccess.upgradeRequired) {
    return {
      title: 'Upgrade Required',
      message: `${featureName} is available on the ${featureAccess.requiredPlan} plan.`,
      action: 'Upgrade Plan',
      ctaUrl: '/admin/billing?upgrade=' + featureAccess.requiredPlan,
    }
  }

  if (featureAccess.usageLimitReached) {
    return {
      title: 'Usage Limit Reached',
      message: `You've reached your monthly limit of ${featureAccess.limit}. Upgrade for unlimited access.`,
      action: 'Upgrade Plan',
      ctaUrl: '/admin/billing',
    }
  }

  if (featureAccess.actionRequired === 'update_payment') {
    return {
      title: 'Payment Required',
      message: 'Please update your payment method to continue using this feature.',
      action: 'Update Payment',
      ctaUrl: '/admin/billing',
    }
  }

  return {
    title: 'Feature Unavailable',
    message: featureAccess.reason || 'This feature is not available on your current plan.',
    action: 'Contact Support',
    ctaUrl: 'mailto:hello@agentiosk.com',
  }
}
