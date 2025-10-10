// api/twilio-call-status.js
/**
 * Twilio Call Status Webhook
 *
 * Receives call status updates from Twilio (StatusCallback events)
 * Updates the twilio_call_status table in Supabase
 * Triggers CallBorderIndicator component to show/hide visual border
 *
 * Status flow:
 * - ringing → Call is ringing (is_active = true)
 * - in-progress → Call connected (is_active = true)
 * - completed/busy/failed/no-answer/canceled → Call ended (is_active = false)
 *
 * Setup in Twilio:
 * 1. Go to your phone number settings in Twilio Console
 * 2. Set Status Callback URL to: https://your-domain.com/api/twilio-call-status
 * 3. Enable status events: ringing, answered, completed
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse Twilio status callback data
    const {
      CallSid,
      CallStatus,
      From,
      To,
      Direction,
    } = req.body;

    console.log('[Twilio Status] Call update:', {
      CallSid,
      CallStatus,
      From,
      Direction,
    });

    // Validate required fields
    if (!CallSid || !CallStatus) {
      console.error('[Twilio Status] Missing required fields:', req.body);
      return res.status(400).json({ error: 'Missing CallSid or CallStatus' });
    }

    // Initialize Supabase client with service role key (bypasses RLS)
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Determine if call is active based on status
    // Active: ringing, in-progress, queued
    // Inactive: completed, busy, failed, no-answer, canceled
    const activeStatuses = ['ringing', 'in-progress', 'queued'];
    const isActive = activeStatuses.includes(CallStatus);

    // Get tenant ID from environment (default to chicago-mikes)
    const tenantId = process.env.VITE_TENANT_ID || 'chicago-mikes';

    // Upsert call status record
    const { data, error } = await supabase
      .from('twilio_call_status')
      .upsert(
        {
          call_sid: CallSid,
          call_status: CallStatus,
          caller_number: From,
          is_active: isActive,
          tenant_id: tenantId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'call_sid', // Update if call_sid already exists
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[Twilio Status] Database error:', error);
      // Return 200 anyway so Twilio doesn't retry
      return res.status(200).json({
        success: false,
        error: error.message,
        note: 'Returned 200 to prevent Twilio retries'
      });
    }

    console.log('[Twilio Status] Database updated:', data);

    // If call ended, also mark any other active calls from same number as inactive
    if (!isActive) {
      const { error: cleanupError } = await supabase
        .from('twilio_call_status')
        .update({ is_active: false })
        .eq('caller_number', From)
        .eq('is_active', true)
        .neq('call_sid', CallSid);

      if (cleanupError) {
        console.error('[Twilio Status] Cleanup error:', cleanupError);
      }
    }

    // Success response
    return res.status(200).json({
      success: true,
      call_sid: CallSid,
      status: CallStatus,
      is_active: isActive,
    });

  } catch (error) {
    console.error('[Twilio Status] Error:', error);

    // Return 200 to prevent Twilio from retrying
    return res.status(200).json({
      success: false,
      error: error.message,
      note: 'Returned 200 to prevent Twilio retries'
    });
  }
}
