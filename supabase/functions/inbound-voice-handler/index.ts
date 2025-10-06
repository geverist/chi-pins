// Inbound Voice Handler - Twilio Integration
// Handles inbound phone calls and routes to AI agent

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse Twilio webhook data
    const formData = await req.formData();
    const callSid = formData.get('CallSid')?.toString() || '';
    const from = formData.get('From')?.toString() || '';
    const to = formData.get('To')?.toString() || '';
    const speechResult = formData.get('SpeechResult')?.toString() || '';

    console.log(`Incoming call: ${callSid} from ${from} to ${to}`);

    // Identify tenant from phone number
    const { data: phoneNumber, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('id, tenant_id, greeting_message, voice_type')
      .eq('phone_number', to)
      .eq('status', 'active')
      .single();

    if (phoneError || !phoneNumber) {
      return new Response(generateErrorTwiML('This number is not in service.'), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // Set tenant context
    await supabase.rpc('set_tenant_context', {
      p_tenant_id: phoneNumber.tenant_id
    });

    // Get or create call record
    let { data: call } = await supabase
      .from('voice_calls')
      .select('*')
      .eq('call_sid', callSid)
      .single();

    if (!call) {
      // Create new call record
      const { data: newCall } = await supabase
        .from('voice_calls')
        .insert([{
          tenant_id: phoneNumber.tenant_id,
          phone_number_id: phoneNumber.id,
          caller_number: from,
          call_sid: callSid,
          status: 'in-progress'
        }])
        .select()
        .single();

      call = newCall;
    }

    // Load tenant information
    const { data: location } = await supabase
      .from('locations')
      .select('name, industry')
      .eq('id', phoneNumber.tenant_id)
      .single();

    // Load knowledge base
    const { data: knowledge } = await supabase
      .from('voice_agent_knowledge')
      .select('question, answer, category')
      .eq('tenant_id', phoneNumber.tenant_id)
      .order('priority', { ascending: false });

    // Check if business is open
    const { data: isOpen } = await supabase.rpc('is_business_open', {
      p_tenant_id: phoneNumber.tenant_id
    });

    // Build conversation context
    const conversationHistory = call.conversation_transcript || [];

    if (speechResult) {
      // Add user's speech to conversation
      conversationHistory.push({
        role: 'user',
        content: speechResult,
        timestamp: new Date().toISOString()
      });
    }

    // Generate AI response
    const aiResponse = await generateAIResponse(
      location?.name || 'our business',
      location?.industry || 'service',
      knowledge || [],
      conversationHistory,
      isOpen,
      speechResult
    );

    // Add AI response to conversation
    conversationHistory.push({
      role: 'assistant',
      content: aiResponse.text,
      intent: aiResponse.intent,
      timestamp: new Date().toISOString()
    });

    // Update call record
    await supabase
      .from('voice_calls')
      .update({
        conversation_transcript: conversationHistory,
        intent: aiResponse.intent,
        sentiment: aiResponse.sentiment
      })
      .eq('id', call.id);

    // Generate TwiML response
    const twiml = generateTwiML(aiResponse, phoneNumber.voice_type);

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('Error handling call:', error);
    return new Response(generateErrorTwiML('We are experiencing technical difficulties. Please try again later.'), {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
});

// Generate AI response using Claude
async function generateAIResponse(
  businessName: string,
  industry: string,
  knowledge: any[],
  conversationHistory: any[],
  isOpen: boolean,
  userInput: string
) {
  // Build knowledge base context
  const knowledgeContext = knowledge.map(k =>
    `Q: ${k.question}\nA: ${k.answer}`
  ).join('\n\n');

  // Build system prompt
  const systemPrompt = `You are a helpful voice assistant for ${businessName}, a ${industry} business.

${isOpen ? 'The business is currently OPEN.' : 'The business is currently CLOSED.'}

Knowledge Base:
${knowledgeContext}

Your role:
- Answer questions about hours, location, menu, and services
- Take orders for food/services
- Collect feedback and voicemails
- Be conversational, friendly, and concise
- Keep responses under 30 seconds when spoken aloud
- If you can't help, offer to take a message or transfer to staff

Important:
- Always confirm order details before finalizing
- Ask clarifying questions if needed
- Offer to send SMS confirmations
- Be empathetic to complaints

Response format:
Respond with a JSON object:
{
  "text": "Your spoken response",
  "intent": "hours|menu|order|feedback|appointment|directions|other",
  "sentiment": "positive|neutral|negative",
  "action": "continue|voicemail|transfer|complete"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: conversationHistory.filter(m => m.role).map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }))
      })
    });

    const data = await response.json();
    const aiText = data.content[0].text;

    // Try to parse JSON response
    try {
      return JSON.parse(aiText);
    } catch {
      // Fallback if not JSON
      return {
        text: aiText,
        intent: 'other',
        sentiment: 'neutral',
        action: 'continue'
      };
    }
  } catch (error) {
    console.error('AI generation error:', error);
    return {
      text: 'I apologize, but I am having trouble processing your request. Let me take a message for our staff.',
      intent: 'other',
      sentiment: 'neutral',
      action: 'voicemail'
    };
  }
}

// Generate TwiML response
function generateTwiML(aiResponse: any, voiceType: string = 'nova'): string {
  const { text, action } = aiResponse;

  let twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voiceType}">${escapeXML(text)}</Say>`;

  if (action === 'voicemail') {
    twiml += `
  <Say voice="${voiceType}">Please leave a message after the beep, and we'll get back to you shortly.</Say>
  <Record
    action="/voice-voicemail-complete"
    maxLength="120"
    transcribe="true"
    transcribeCallback="/voice-transcription"
  />`;
  } else if (action === 'transfer') {
    twiml += `
  <Say voice="${voiceType}">Let me transfer you to our staff.</Say>
  <Dial>
    <Number>+1-555-FALLBACK</Number>
  </Dial>`;
  } else if (action === 'complete') {
    twiml += `
  <Say voice="${voiceType}">Thank you for calling. Goodbye!</Say>
  <Hangup/>`;
  } else {
    // Continue conversation
    twiml += `
  <Gather
    input="speech"
    action="/inbound-voice-handler"
    method="POST"
    timeout="5"
    speechTimeout="auto"
  >
    <Say voice="${voiceType}">Is there anything else I can help you with?</Say>
  </Gather>`;
  }

  twiml += `
</Response>`;

  return twiml;
}

// Generate error TwiML
function generateErrorTwiML(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="nova">${escapeXML(message)}</Say>
  <Hangup/>
</Response>`;
}

// Escape XML special characters
function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
