// Inbound Voice Handler - Twilio Integration
// Handles inbound phone calls and routes to AI agent

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const openaiApiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
const googleApiKey = Deno.env.get('GOOGLE_API_KEY') ?? '';
const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY') ?? '';
const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT') ?? '';

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
      .select('id, tenant_id, greeting_message, voice_type, ai_provider, ai_model, ai_temperature, ai_max_tokens')
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
      speechResult,
      phoneNumber.ai_provider || 'anthropic',
      phoneNumber.ai_model || 'claude-3-5-sonnet-20241022',
      phoneNumber.ai_temperature || 0.7,
      phoneNumber.ai_max_tokens || 1024
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

// Generate AI response using configured provider
async function generateAIResponse(
  businessName: string,
  industry: string,
  knowledge: any[],
  conversationHistory: any[],
  isOpen: boolean,
  userInput: string,
  provider: string = 'anthropic',
  model: string = 'claude-3-5-sonnet-20241022',
  temperature: number = 0.7,
  maxTokens: number = 1024
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
    let aiText = '';

    // Call the appropriate AI provider
    switch (provider) {
      case 'anthropic':
        aiText = await callAnthropic(model, systemPrompt, conversationHistory, temperature, maxTokens);
        break;
      case 'openai':
        aiText = await callOpenAI(model, systemPrompt, conversationHistory, temperature, maxTokens);
        break;
      case 'google':
        aiText = await callGoogle(model, systemPrompt, conversationHistory, temperature, maxTokens);
        break;
      case 'azure':
        aiText = await callAzure(model, systemPrompt, conversationHistory, temperature, maxTokens);
        break;
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }

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

// Call Anthropic Claude API
async function callAnthropic(
  model: string,
  systemPrompt: string,
  conversationHistory: any[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: conversationHistory.filter(m => m.role).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }))
    })
  });

  const data = await response.json();
  return data.content[0].text;
}

// Call OpenAI GPT API
async function callOpenAI(
  model: string,
  systemPrompt: string,
  conversationHistory: any[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.filter(m => m.role).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }))
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

// Call Google Gemini API
async function callGoogle(
  model: string,
  systemPrompt: string,
  conversationHistory: any[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  // Gemini API uses a different format - combine system prompt with conversation
  const contents = [
    {
      role: 'user',
      parts: [{ text: systemPrompt }]
    },
    ...conversationHistory.filter(m => m.role).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }))
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleApiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens
        }
      })
    }
  );

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// Call Azure OpenAI API
async function callAzure(
  model: string,
  systemPrompt: string,
  conversationHistory: any[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.filter(m => m.role).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }))
  ];

  const response = await fetch(
    `${azureEndpoint}/openai/deployments/${model}/chat/completions?api-version=2024-02-15-preview`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': azureApiKey
      },
      body: JSON.stringify({
        messages,
        temperature,
        max_tokens: maxTokens
      })
    }
  );

  const data = await response.json();
  return data.choices[0].message.content;
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
