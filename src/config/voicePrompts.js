// src/config/voicePrompts.js
// Industry-specific suggested voice prompts for the AI Voice Agent

export const voicePrompts = {
  restaurant: [
    "What are today's specials?",
    "Show me the menu",
    "I'd like to place an order",
    "What's your most popular dish?",
    "Do you have gluten-free options?",
    "How long is the wait time?",
    "Can I add fries to my order?",
    "What drinks do you have?",
    "Tell me about your hot dogs",
    "Do you have vegetarian options?",
  ],

  medspa: [
    "What treatments do you offer?",
    "Book me a facial appointment",
    "Show me before and after photos",
    "What's included in a membership?",
    "Tell me about Botox pricing",
    "I want to schedule a consultation",
    "What skincare products do you sell?",
    "How long does a facial take?",
    "Do you have gift certificates?",
    "What's your cancellation policy?",
  ],

  auto: [
    "Check my service status",
    "What's the estimated completion time?",
    "Show me available services",
    "I need an oil change appointment",
    "What parts do you recommend?",
    "Do I need new brake pads?",
    "Can I get a loaner car?",
    "What's the cost for tire rotation?",
    "Schedule my next service",
    "Show me your service packages",
  ],

  healthcare: [
    "What's my wait time?",
    "I need to update my information",
    "Access the patient portal",
    "What vaccines do you offer?",
    "Schedule a follow-up appointment",
    "How do I refill my prescription?",
    "What health screenings are available?",
    "Tell me about preventive care",
    "I need to see a specialist",
    "What are your office hours?",
  ],

  fitness: [
    "What classes are available today?",
    "Book me a spin class",
    "Show me the class schedule",
    "I want to hire a personal trainer",
    "What fitness challenges are running?",
    "How do I join a challenge?",
    "Tell me about membership options",
    "What's the gym layout?",
    "Do you have nutrition counseling?",
    "Show me workout programs",
  ],

  retail: [
    "What's on sale today?",
    "Show me new arrivals",
    "I need style recommendations",
    "What sizes do you have?",
    "Do you have this in another color?",
    "Tell me about your return policy",
    "Join the loyalty program",
    "What brands do you carry?",
    "I'm looking for a gift",
    "Do you offer personal shopping?",
  ],

  banking: [
    "What accounts do you offer?",
    "I want to open a checking account",
    "Tell me about your credit cards",
    "What are your mortgage rates?",
    "I need help with online banking",
    "How do I set up direct deposit?",
    "What's the routing number?",
    "Tell me about savings accounts",
    "I want to apply for a loan",
    "What's your CD rates?",
  ],

  events: [
    "Where's the photo booth?",
    "Play wedding trivia",
    "Share photos to social media",
    "What games are available?",
    "Send a message to the couple",
    "Show me event photos",
    "What's the WiFi password?",
    "When's dinner served?",
    "Tell me about the venue",
    "How do I request a song?",
  ],

  hospitality: [
    "What's nearby to visit?",
    "Book a spa service",
    "I need restaurant recommendations",
    "What time is checkout?",
    "Order room service",
    "Can I get a late checkout?",
    "What amenities do you have?",
    "Book a tour or activity",
    "I need extra towels",
    "Show me local attractions",
  ],
};

// Get prompts for specific industry
export function getVoicePrompts(industry) {
  return voicePrompts[industry] || voicePrompts.restaurant;
}
