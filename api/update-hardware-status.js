// api/update-hardware-status.js
// Updates hardware shipment status and triggers billing when delivered

import { createClient } from '@supabase/supabase-js'

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
      shipmentId,
      status,
      trackingNumber,
      carrier,
      location,
      notes,
    } = req.body

    // Validate required fields
    if (!shipmentId || !status) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['shipmentId', 'status']
      })
    }

    // Valid statuses
    const validStatuses = [
      'preparing',
      'shipped',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'failed_delivery',
      'returned'
    ]

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        validStatuses
      })
    }

    // Get current shipment
    const { data: shipment, error: shipmentError } = await supabase
      .from('hardware_shipments')
      .select('*, subscriptions(*)')
      .eq('id', shipmentId)
      .single()

    if (shipmentError || !shipment) {
      return res.status(404).json({ error: 'Shipment not found' })
    }

    // Prepare update data
    const updateData = {
      status,
    }

    // Set timestamps based on status
    if (status === 'shipped' && !shipment.shipped_at) {
      updateData.shipped_at = new Date().toISOString()
    } else if (status === 'delivered' && !shipment.delivered_at) {
      updateData.delivered_at = new Date().toISOString()
    }

    // Add tracking info if provided
    if (trackingNumber) {
      updateData.tracking_number = trackingNumber
    }
    if (carrier) {
      updateData.carrier = carrier
      // Set tracking URL based on carrier
      const trackingUrls = {
        ups: `https://www.ups.com/track?tracknum=${trackingNumber}`,
        fedex: `https://www.fedex.com/fedextrack/?tracknumbers=${trackingNumber}`,
        usps: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
        dhl: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
      }
      updateData.tracking_url = trackingUrls[carrier.toLowerCase()] || ''
    }

    // Update shipment
    const { error: updateError } = await supabase
      .from('hardware_shipments')
      .update(updateData)
      .eq('id', shipmentId)

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update shipment', details: updateError.message })
    }

    // Add tracking event to history
    const trackingEvent = {
      timestamp: new Date().toISOString(),
      status,
      location: location || null,
      notes: notes || null,
    }

    const currentEvents = shipment.tracking_events || []
    await supabase
      .from('hardware_shipments')
      .update({
        tracking_events: [...currentEvents, trackingEvent]
      })
      .eq('id', shipmentId)

    // If status is 'shipped', send notification email
    if (status === 'shipped' && shipment.subscriptions) {
      const { data: { user } } = await supabase.auth.admin.getUserById(shipment.user_id)

      if (user?.email) {
        try {
          await fetch(`${req.headers.origin || 'https://app.agentiosk.com'}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: user.email,
              subject: '📦 Your EngageOS Kiosk Has Shipped!',
              html: `
                <h2>Your Kiosk is On the Way!</h2>
                <p>Great news! Your EngageOS kiosk hardware has shipped and is heading your way.</p>

                <h3>Tracking Information</h3>
                <p><strong>Carrier:</strong> ${carrier || 'TBD'}</p>
                <p><strong>Tracking Number:</strong> ${trackingNumber || 'Will be updated soon'}</p>
                ${updateData.tracking_url ? `<p><a href="${updateData.tracking_url}">Track Your Package</a></p>` : ''}

                <h3>What Happens Next?</h3>
                <ol>
                  <li><strong>Track your shipment</strong> - Keep an eye on the tracking link above</li>
                  <li><strong>Billing starts on delivery</strong> - Your subscription begins when hardware arrives</li>
                  <li><strong>Installation support</strong> - We'll send setup instructions when delivered</li>
                </ol>

                <h3>Questions?</h3>
                <p>Contact us at <a href="mailto:hello@agentiosk.com">hello@agentiosk.com</a> or reply to this email.</p>

                <p>Best regards,<br>The EngageOS Team</p>
              `,
            }),
          })
        } catch (emailError) {
          console.error('Error sending shipped notification:', emailError)
        }
      }
    }

    // If status is 'delivered', send installation email
    if (status === 'delivered' && shipment.subscriptions) {
      const { data: { user } } = await supabase.auth.admin.getUserById(shipment.user_id)

      if (user?.email) {
        try {
          await fetch(`${req.headers.origin || 'https://app.agentiosk.com'}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: user.email,
              subject: '🎉 Your Kiosk Has Arrived - Let\'s Get Started!',
              html: `
                <h2>Your Kiosk Has Been Delivered!</h2>
                <p>Congratulations! Your EngageOS kiosk has arrived. Your subscription billing starts today.</p>

                <h3>Next Steps</h3>
                <ol>
                  <li><strong>Unbox your hardware</strong> - Everything you need is in the box</li>
                  <li><strong>Follow setup guide</strong> - We'll send detailed instructions separately</li>
                  <li><strong>Schedule installation support</strong> - <a href="https://app.agentiosk.com/admin/support">Book a setup call</a></li>
                  <li><strong>Start engaging customers!</strong> - Your kiosk is ready to go</li>
                </ol>

                <h3>Your Subscription</h3>
                <p>Your monthly billing has now started. View your subscription details in your <a href="https://app.agentiosk.com/admin/billing">billing dashboard</a>.</p>

                <h3>Need Help?</h3>
                <p>We're here to help! Contact us anytime:</p>
                <ul>
                  <li>Email: <a href="mailto:hello@agentiosk.com">hello@agentiosk.com</a></li>
                  <li>Setup Support: <a href="https://app.agentiosk.com/admin/support">Book a call</a></li>
                </ul>

                <p>Best regards,<br>The EngageOS Team</p>
              `,
            }),
          })
        } catch (emailError) {
          console.error('Error sending delivery notification:', emailError)
        }
      }

      // NOTE: The subscription status is automatically updated to 'active'
      // and billing_start_date is set by the database trigger
      // (see sync_hardware_status_to_subscription function in hardware_shipments migration)
    }

    return res.status(200).json({
      success: true,
      shipment: {
        id: shipmentId,
        status,
        trackingNumber,
        carrier,
      },
      message: `Hardware status updated to: ${status}`,
    })

  } catch (error) {
    console.error('Error updating hardware status:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
}
