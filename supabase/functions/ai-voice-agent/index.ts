// supabase/functions/ai-voice-agent/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const openAIKey = Deno.env.get('OPENAI_API_KEY')

serve(async (req) => {
  try {
    const { message, locationId, industry, context } = await req.json()

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

    // Build industry-specific system prompt
    const systemPrompt = buildSystemPrompt(industry, location, context)

    // Call OpenAI GPT-4
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    })

    const data = await response.json()
    const aiResponse = data.choices[0].message.content

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
