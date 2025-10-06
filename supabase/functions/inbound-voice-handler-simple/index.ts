// Simple Inbound Voice Handler - Twilio Integration
// Handles inbound phone calls with call limits, forwarding, and recording

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    console.log('Incoming webhook request');

    // Parse Twilio webhook data
    const formData = await req.formData();
    const callSid = formData.get('CallSid')?.toString() || '';
    const from = formData.get('From')?.toString() || '';
    const to = formData.get('To')?.toString() || '';
    const speechResult = formData.get('SpeechResult')?.toString() || '';
    const callStatus = formData.get('CallStatus')?.toString() || '';

    console.log(`Call: ${callSid}, From: ${from}, To: ${to}, Speech: ${speechResult}, Status: ${callStatus}`);

    // Load phone number configuration
    const { data: phoneConfig, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('phone_number', to)
      .eq('status', 'active')
      .single();

    if (phoneError || !phoneConfig) {
      console.error('Phone number not found:', phoneError);
      return new Response(generateErrorTwiML(), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // Check if this is the initial call (no speech result yet)
    if (!speechResult) {
      // Check call limits
      const { data: limitInfo } = await supabase.rpc('check_call_limit', {
        p_phone_id: phoneConfig.id
      });

      if (limitInfo) {
        console.log('Call limit reached, forwarding...');

        // Increment counter anyway to track attempted calls
        await supabase.rpc('increment_call_counter', {
          p_phone_id: phoneConfig.id
        });

        // Log usage
        await supabase.from('call_usage_history').insert({
          phone_id: phoneConfig.id,
          tenant_id: phoneConfig.tenant_id,
          call_sid: callSid,
          caller_number: from,
          call_type: 'inbound',
          was_forwarded: true,
          forward_reason: 'limit_reached'
        });

        if (phoneConfig.forwarding_enabled && phoneConfig.forward_on_limit_reached && phoneConfig.forwarding_number) {
          return new Response(generateForwardTwiML(phoneConfig.forwarding_number, 'limit_reached'), {
            headers: { 'Content-Type': 'text/xml' }
          });
        } else {
          return new Response(generateLimitReachedTwiML(), {
            headers: { 'Content-Type': 'text/xml' }
          });
        }
      }

      // Increment call counter
      await supabase.rpc('increment_call_counter', {
        p_phone_id: phoneConfig.id
      });

      // Log call start
      await supabase.from('call_usage_history').insert({
        phone_id: phoneConfig.id,
        tenant_id: phoneConfig.tenant_id,
        call_sid: callSid,
        caller_number: from,
        call_type: 'inbound',
        was_forwarded: false
      });
    }

    // Check business hours
    const isOpen = checkBusinessHours(phoneConfig.business_hours);
    if (!isOpen && !speechResult) {
      if (phoneConfig.forwarding_enabled && phoneConfig.forward_after_hours && phoneConfig.forwarding_number) {
        await supabase.from('call_usage_history').update({
          was_forwarded: true,
          forward_reason: 'after_hours'
        }).eq('call_sid', callSid);

        return new Response(generateForwardTwiML(phoneConfig.forwarding_number, 'after_hours'), {
          headers: { 'Content-Type': 'text/xml' }
        });
      }
    }

    let responseText = '';
    let shouldForward = false;

    // If user said something, respond to it
    if (speechResult) {
      const speech = speechResult.toLowerCase();

      if (speech.includes('hour') || speech.includes('open') || speech.includes('close')) {
        responseText = "We are open Monday through Thursday 9 AM to 9 PM, Friday and Saturday 9 AM to 10 PM, and Sunday 10 AM to 8 PM.";
      } else if (speech.includes('gluten') || speech.includes('allerg')) {
        responseText = "Yes! We offer gluten-free buns for all our sandwiches. Just let us know when ordering.";
      } else if (speech.includes('where') || speech.includes('location') || speech.includes('address')) {
        responseText = "We are located in Chicago, Illinois.";
      } else if (speech.includes('order') || speech.includes('beef') || speech.includes('hot dog')) {
        responseText = "Great! For orders, please call us during business hours and we'll be happy to help you place an order.";
      } else if (speech.includes('human') || speech.includes('person') || speech.includes('staff') || speech.includes('transfer')) {
        shouldForward = true;
        responseText = "Let me transfer you to a team member.";
      } else {
        responseText = "I can help you with our hours, location, menu, or orders. What would you like to know?";
      }
    }

    // Handle forwarding request
    if (shouldForward) {
      if (phoneConfig.forwarding_enabled && phoneConfig.forward_on_unable_to_help && phoneConfig.forwarding_number) {
        await supabase.from('call_usage_history').update({
          was_forwarded: true,
          forward_reason: 'user_request'
        }).eq('call_sid', callSid);

        return new Response(generateForwardTwiML(phoneConfig.forwarding_number, 'user_request', responseText), {
          headers: { 'Content-Type': 'text/xml' }
        });
      } else {
        responseText = "I'm sorry, but no one is available to take your call right now. Please try calling during our business hours.";
      }
    }

    // Generate TwiML response with recording if enabled
    const twiml = generateResponseTwiML(
      responseText,
      !speechResult ? phoneConfig.greeting_message : null,
      phoneConfig.recording_enabled,
      phoneConfig.recording_channels
    );

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('Error handling call:', error);
    return new Response(generateErrorTwiML(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
});

function checkBusinessHours(businessHours: any): boolean {
  if (!businessHours) return true; // Default to open if not configured

  const now = new Date();
  const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const dayConfig = businessHours[day];

  if (!dayConfig || !dayConfig.enabled) return false;

  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMin] = dayConfig.open.split(':').map(Number);
  const [closeHour, closeMin] = dayConfig.close.split(':').map(Number);
  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;

  return currentTime >= openTime && currentTime < closeTime;
}

function generateResponseTwiML(
  responseText: string,
  greeting: string | null,
  recordingEnabled: boolean,
  recordingChannels: string
): string {
  let twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>`;

  // Add recording if enabled
  if (recordingEnabled) {
    twiml += `
  <Record
    maxLength="3600"
    transcribe="true"
    transcribeCallback="/functions/v1/inbound-voice-handler-simple/transcribe"
    playBeep="false"
    recordingStatusCallback="/functions/v1/inbound-voice-handler-simple/recording"
    recordingChannels="${recordingChannels}"
  />`;
  }

  if (greeting && !responseText) {
    // Initial greeting
    twiml += `
  <Say voice="Polly.Joanna">${greeting}</Say>
  <Gather input="speech" action="https://xxwqmakcrchgefgzrulf.supabase.co/functions/v1/inbound-voice-handler-simple" method="POST" timeout="5" speechTimeout="auto">
    <Say voice="Polly.Joanna">You can ask about our hours, menu, or location.</Say>
  </Gather>`;
  } else if (responseText) {
    // Response to user input
    twiml += `
  <Say voice="Polly.Joanna">${responseText}</Say>
  <Gather input="speech" action="https://xxwqmakcrchgefgzrulf.supabase.co/functions/v1/inbound-voice-handler-simple" method="POST" timeout="5" speechTimeout="auto">
    <Say voice="Polly.Joanna">Is there anything else I can help you with?</Say>
  </Gather>`;
  }

  twiml += `
  <Say voice="Polly.Joanna">Thank you for calling. Goodbye!</Say>
  <Hangup/>
</Response>`;

  return twiml;
}

function generateForwardTwiML(forwardNumber: string, reason: string, message?: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${message ? `<Say voice="Polly.Joanna">${message}</Say>` : ''}
  ${reason === 'limit_reached' ? '<Say voice="Polly.Joanna">Our call volume is high. Let me transfer you to a staff member.</Say>' : ''}
  ${reason === 'after_hours' ? '<Say voice="Polly.Joanna">We are currently closed. Let me connect you to an on-call staff member.</Say>' : ''}
  <Dial>
    <Number>${forwardNumber}</Number>
  </Dial>
  <Say voice="Polly.Joanna">Sorry, we could not complete the transfer. Please try again later.</Say>
  <Hangup/>
</Response>`;
}

function generateLimitReachedTwiML(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">We have reached our maximum call volume for this month. Please try calling again next month or leave a voicemail after the beep.</Say>
  <Record maxLength="120" transcribe="true" />
  <Say voice="Polly.Joanna">Thank you for your message. Goodbye!</Say>
  <Hangup/>
</Response>`;
}

function generateErrorTwiML(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">We are experiencing technical difficulties. Please try again later.</Say>
  <Hangup/>
</Response>`;
}
