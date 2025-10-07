// api/voice-assistant.js
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory cache for responses (resets on serverless function cold start)
const responseCache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function getCacheKey(userMessage, industry, context) {
  // Normalize the message for better cache hits
  const normalized = userMessage.toLowerCase().trim().replace(/[^\w\s]/g, '');
  return `${industry}:${normalized}:${JSON.stringify(context)}`;
}

function getCachedResponse(cacheKey) {
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[VoiceAssistant] Cache hit:', cacheKey);
    return cached.response;
  }
  return null;
}

function setCachedResponse(cacheKey, response) {
  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now(),
  });

  // Limit cache size to 100 entries
  if (responseCache.size > 100) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, industry, context = {} } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check cache first
    const cacheKey = getCacheKey(message, industry, context);
    const cachedResponse = getCachedResponse(cacheKey);

    if (cachedResponse) {
      return res.status(200).json({
        response: cachedResponse,
        cached: true,
      });
    }

    // Build system prompt based on industry and context
    const systemPrompt = buildSystemPrompt(industry, context);

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cost-effective
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: 150, // Keep responses concise for voice
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;

    // Cache the response
    setCachedResponse(cacheKey, aiResponse);

    return res.status(200).json({
      response: aiResponse,
      cached: false,
    });

  } catch (error) {
    console.error('[VoiceAssistant] Error:', error);
    return res.status(500).json({
      error: 'Failed to process voice command',
      details: error.message,
    });
  }
}

function buildSystemPrompt(industry, context) {
  const basePrompt = `You are a helpful voice assistant for a ${industry} business using an interactive kiosk.
Keep responses brief (1-3 sentences) since they will be spoken aloud.
Be friendly, helpful, and conversational.`;

  const industryPrompts = {
    restaurant: `You help customers with orders, menu questions, and special requests.
Popular items: Chicago-style hot dogs, Italian beef, deep dish pizza.
You can help them place orders, ask about dietary restrictions, and provide recommendations.`,

    medspa: `You help clients book treatments, learn about services, and answer wellness questions.
Services: facials, massages, body treatments, skincare consultations.
Provide treatment durations and help with appointment scheduling.`,

    auto: `You help customers check on their vehicle service status and add services.
Common services: oil changes, tire rotations, brake service, inspections.
Provide status updates and service recommendations.`,

    healthcare: `You help patients with wait times, check-in, and general health questions.
Provide wait time estimates, help update contact info, and answer facility questions.`,

    fitness: `You help members with class schedules, equipment questions, and membership info.
Popular classes: spin, yoga, HIIT, strength training.
Help with class booking and facility information.`,

    retail: `You help shoppers find products, check inventory, and learn about promotions.
Assist with product recommendations, sizing, and store navigation.`,

    banking: `You help customers with account questions, services, and appointment scheduling.
Services: checking/savings accounts, loans, mortgages, financial planning.
Provide basic info and help schedule appointments with bankers.`,

    events: `You help attendees with event info, photo booth, and activities.
Provide event schedule, activity locations, and help coordinate group activities.`,

    hospitality: `You help guests with hotel services, amenities, and local recommendations.
Services: spa, dining, concierge, room service.
Provide info about hotel facilities and local attractions.`,
  };

  const industryContext = industryPrompts[industry] || industryPrompts.restaurant;

  let fullPrompt = `${basePrompt}\n\n${industryContext}`;

  // Add context if provided
  if (context.locationName) {
    fullPrompt += `\n\nLocation: ${context.locationName}`;
  }
  if (context.features) {
    fullPrompt += `\n\nAvailable features: ${context.features.join(', ')}`;
  }

  return fullPrompt;
}
