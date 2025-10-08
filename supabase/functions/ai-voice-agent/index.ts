// supabase/functions/ai-voice-agent/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const openAIKey = Deno.env.get('OPENAI_API_KEY')
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')
const googleApiKey = Deno.env.get('GOOGLE_API_KEY')
const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY')
const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT')

serve(async (req) => {
  try {
    const { message, locationId, industry, context, phoneNumberId } = await req.json()

    // Get location-specific context
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: location } = await supabase
      .from('locations')
      .select('name, description, settings')
      .eq('id', locationId)
      .single()

    // Get AI provider configuration
    const { data: phoneConfig } = await supabase
      .from('phone_numbers')
      .select('ai_provider, ai_model, ai_temperature, ai_max_tokens')
      .eq('id', phoneNumberId)
      .single()

    const provider = phoneConfig?.ai_provider || 'anthropic'
    const model = phoneConfig?.ai_model || 'claude-3-5-sonnet-20241022'
    const temperature = phoneConfig?.ai_temperature || 0.7
    const maxTokens = phoneConfig?.ai_max_tokens || 1024

    // Build industry-specific system prompt
    const systemPrompt = buildSystemPrompt(industry, location, context)

    // Call the configured AI provider
    let aiResponse = ''

    switch (provider) {
      case 'anthropic':
        aiResponse = await callAnthropic(model, systemPrompt, message, temperature, maxTokens)
        break
      case 'openai':
        aiResponse = await callOpenAI(model, systemPrompt, message, temperature, maxTokens)
        break
      case 'google':
        aiResponse = await callGoogle(model, systemPrompt, message, temperature, maxTokens)
        break
      case 'azure':
        aiResponse = await callAzure(model, systemPrompt, message, temperature, maxTokens)
        break
      default:
        throw new Error(`Unsupported AI provider: ${provider}`)
    }

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

function buildSystemPrompt(industry: string, location: any, context: any): string {
  const basePrompt = `You are a helpful voice assistant for ${location?.name || 'this business'}.
Provide concise, friendly responses (2-3 sentences max).
Speak naturally as if talking to a customer in person.`

  const industryPrompts = {
    restaurant: `
You are a restaurant assistant. Help customers with:
- Menu recommendations and descriptions
- Allergen information and dietary restrictions
- Wait times and table availability
- Ordering food and drinks
- Daily specials and promotions

Keep responses brief and appetizing. Always be welcoming and helpful.`,

    auto: `
You are an auto dealership assistant. Help customers with:
- Vehicle information and comparisons
- Service scheduling and status updates
- Trade-in valuations
- Financing options
- Warranty and maintenance plans

Be professional, knowledgeable, and trustworthy.`,

    healthcare: `
You are a healthcare facility assistant. Help patients with:
- Check-in procedures
- Wait time updates
- General facility information
- Appointment scheduling
- Insurance and billing questions

Be empathetic, clear, and HIPAA-compliant. Never provide medical advice.`,

    retail: `
You are a retail store assistant. Help shoppers with:
- Product locations and availability
- Size and color options
- Current sales and promotions
- Return policy
- Store hours and services

Be enthusiastic and helpful. Focus on great customer service.`,

    fitness: `
You are a fitness facility assistant. Help members with:
- Class schedules and descriptions
- Trainer availability
- Equipment locations
- Membership options
- Facility amenities

Be energetic, motivating, and supportive.`,

    hospitality: `
You are a hotel concierge assistant. Help guests with:
- Check-in and check-out
- Room amenities and services
- Local recommendations
- Transportation options
- Facility information

Be warm, professional, and accommodating.`,

    cannabis: `
You are a dispensary assistant. Help customers with:
- Product information (strains, effects, potency)
- Recommendations based on preferences
- Inventory availability
- Compliance and legal information
- Store policies

Be knowledgeable, non-judgmental, and compliant with regulations.`,

    events: `
You are an event venue assistant. Help attendees with:
- Session schedules and locations
- Speaker information
- Networking opportunities
- Venue amenities
- Event logistics

Be organized, informative, and welcoming.`
  }

  return basePrompt + '\n\n' + (industryPrompts[industry as keyof typeof industryPrompts] || basePrompt)
}

// Call Anthropic Claude API
async function callAnthropic(
  model: string,
  systemPrompt: string,
  message: string,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey ?? '',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        { role: 'user', content: message }
      ]
    })
  })

  const data = await response.json()
  return data.content[0].text
}

// Call OpenAI GPT API
async function callOpenAI(
  model: string,
  systemPrompt: string,
  message: string,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openAIKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature,
      max_tokens: maxTokens
    })
  })

  const data = await response.json()
  return data.choices[0].message.content
}

// Call Google Gemini API
async function callGoogle(
  model: string,
  systemPrompt: string,
  message: string,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleApiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: systemPrompt + '\n\nUser: ' + message }]
          }
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens
        }
      })
    }
  )

  const data = await response.json()
  return data.candidates[0].content.parts[0].text
}

// Call Azure OpenAI API
async function callAzure(
  model: string,
  systemPrompt: string,
  message: string,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const response = await fetch(
    `${azureEndpoint}/openai/deployments/${model}/chat/completions?api-version=2024-02-15-preview`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': azureApiKey ?? ''
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature,
        max_tokens: maxTokens
      })
    }
  )

  const data = await response.json()
  return data.choices[0].message.content
}
