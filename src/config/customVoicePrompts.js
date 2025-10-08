// src/config/customVoicePrompts.js
// Configurable voice prompts with custom AI instructions

/**
 * Default voice prompt structure
 * Each prompt can have:
 * - text: What the user sees/says
 * - aiInstruction: Custom instruction sent to AI agent
 * - category: Organization category
 */

export const DEFAULT_CUSTOM_PROMPTS = [
  {
    id: 'help',
    text: "What can you help me with?",
    aiInstruction: "List all available features and services. Be concise and friendly.",
    category: 'general',
    enabled: true,
  },
  {
    id: 'about',
    text: "Tell me about this business",
    aiInstruction: "Provide a brief overview of the business, location, and key offerings.",
    category: 'general',
    enabled: true,
  },
  {
    id: 'games',
    text: "What games can I play?",
    aiInstruction: "List available games (trivia, deep dish, popcorn wind, hotdog assembly). Offer to start one.",
    category: 'features',
    enabled: true,
  },
  {
    id: 'music',
    text: "Play some music",
    aiInstruction: "Open the jukebox feature and show available songs. Ask what genre they prefer.",
    category: 'features',
    enabled: true,
  },
  {
    id: 'play-song',
    text: "Play [song name]",
    aiInstruction: "Search the jukebox library for the requested song and play it. If multiple matches found, ask which one. If not found, suggest similar songs.",
    category: 'features',
    enabled: true,
    phoneExposed: false,
  },
  {
    id: 'photo',
    text: "Take a photo",
    aiInstruction: "Open the photo booth. Explain they can take a photo with fun backgrounds.",
    category: 'features',
    enabled: true,
  },
  {
    id: 'feedback',
    text: "Leave feedback",
    aiInstruction: "Open the feedback/comments modal. Thank them for wanting to share their thoughts.",
    category: 'features',
    enabled: true,
  },
  {
    id: 'popular',
    text: "Show me popular spots",
    aiInstruction: "Display popular locations on the map. Highlight Chicago hotdog and Italian beef spots.",
    category: 'navigation',
    enabled: true,
  },
  {
    id: 'pin',
    text: "I want to drop a pin",
    aiInstruction: "Guide them through placing a pin on the map. Ask for their favorite Chicago spot.",
    category: 'navigation',
    enabled: true,
  },
  {
    id: 'chicago',
    text: "Tell me about Chicago",
    aiInstruction: "Share interesting Chicago facts, history, and culture. Focus on food, sports, and landmarks.",
    category: 'general',
    enabled: true,
  },
  {
    id: 'hotdog',
    text: "What's a Chicago-style hot dog?",
    aiInstruction: "Explain Chicago hot dog toppings (mustard, relish, onion, tomato, pickle, sport peppers, celery salt, NO KETCHUP). Be enthusiastic!",
    category: 'general',
    enabled: true,
  },
  {
    id: 'nav-games',
    text: "Go to games",
    aiInstruction: "Navigate to the games section. Open the games menu or feature.",
    category: 'navigation',
    enabled: true,
    phoneExposed: false, // Not accessible via phone
  },
  {
    id: 'nav-jukebox',
    text: "Go to jukebox",
    aiInstruction: "Navigate to the jukebox feature. Open the music player.",
    category: 'navigation',
    enabled: true,
    phoneExposed: false,
  },
  {
    id: 'nav-order',
    text: "Go to ordering",
    aiInstruction: "Navigate to the ordering/marketplace feature.",
    category: 'navigation',
    enabled: true,
    phoneExposed: false,
  },
  {
    id: 'place-pin-chicago',
    text: "Drop a pin in Chicago",
    aiInstruction: "Center map on Chicago and help user place a pin. Ask for their favorite Chicago location.",
    category: 'map-action',
    enabled: true,
    phoneExposed: false,
  },
  {
    id: 'place-pin-custom',
    text: "Drop a pin in [city]",
    aiInstruction: "Center map on the specified city and help user place a pin. Extract city name from user's command.",
    category: 'map-action',
    enabled: true,
    phoneExposed: false,
  },
];

/**
 * Get prompts filtered by enabled status
 */
export function getEnabledPrompts(customPrompts = []) {
  const prompts = customPrompts.length > 0 ? customPrompts : DEFAULT_CUSTOM_PROMPTS;
  return prompts.filter(p => p.enabled !== false);
}

/**
 * Get AI instruction for a given prompt text
 */
export function getAIInstruction(promptText, customPrompts = []) {
  const prompts = customPrompts.length > 0 ? customPrompts : DEFAULT_CUSTOM_PROMPTS;
  const prompt = prompts.find(p =>
    p.text.toLowerCase() === promptText.toLowerCase() ||
    promptText.toLowerCase().includes(p.text.toLowerCase())
  );
  return prompt?.aiInstruction || null;
}

/**
 * Format prompts for Twilio/phone system (exclude phoneExposed: false)
 */
export function formatPromptsForTwilio(customPrompts = []) {
  const prompts = getEnabledPrompts(customPrompts);
  // Filter out prompts not exposed to phone system
  const phonePrompts = prompts.filter(p => p.phoneExposed !== false);
  return phonePrompts.map((p, index) => ({
    option: index + 1,
    text: p.text,
    instruction: p.aiInstruction,
    category: p.category,
  }));
}
