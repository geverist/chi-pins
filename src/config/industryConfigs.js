// src/config/industryConfigs.js
// Industry-specific configurations for demo environments
// Access via: ?industry=restaurant

export const industryConfigs = {
  restaurant: {
    name: "Chicago Mikes Hot Dogs",
    logo: "/logo.png",
    brandColor: "#ef4444", // red
    tagline: "Chicago's Best Hot Dogs Since 1985",
    enabledFeatures: {
      games: true,
      photoBooth: true,
      jukebox: true,
      feedback: true,
      popularSpots: true,
      thenAndNow: true,
      aiVoice: true,
    },
    games: ["trivia", "hotdog", "deepdish"], // which games to show
    welcomeMessage: "Welcome to Chicago Mikes! Play games while you wait for your order.",
    attractorMessage: "🌭 Tap to explore Chicago • Play trivia • Win prizes!",
    // Custom UI text
    ui: {
      gamesMenuTitle: "Games & Fun",
      photoBoothTitle: "Take a Chicago Photo",
      feedbackPrompt: "How was your hot dog?",
    },
    // Demo-specific settings
    demo: {
      showPricing: true,
      showVoiceAgent: true,
      highlightFeatures: ["AI Voice Ordering", "24/7 Support", "Order Tracking"],
    },
    // Industry-specific metrics for demo
    metrics: {
      monthlyRevenue: "$2,501",
      roi: "751%",
      averageTicket: "+22%",
      customerSatisfaction: "4.6/5 stars",
    },
  },

  medspa: {
    name: "Radiance Med Spa",
    logo: "/logo.png",
    brandColor: "#ec4899", // pink
    tagline: "Your Journey to Radiance",
    enabledFeatures: {
      games: false,
      photoBooth: true,
      jukebox: true,
      feedback: true,
      popularSpots: false,
      thenAndNow: true,
      aiVoice: true,
    },
    games: [], // no games for med spa
    welcomeMessage: "Welcome to Radiance! Explore treatments while you wait.",
    attractorMessage: "💆 View before & after • Book treatments • Relaxing music",
    ui: {
      gamesMenuTitle: "Explore Treatments",
      photoBoothTitle: "Before & After Gallery",
      feedbackPrompt: "How was your experience?",
    },
    demo: {
      showPricing: true,
      showVoiceAgent: true,
      highlightFeatures: ["Appointment Scheduling", "Treatment Upsells", "HIPAA Compliant"],
    },
    metrics: {
      monthlyRevenue: "$5,651",
      roi: "846%",
      upsellRevenue: "$2,400/mo",
      membershipGrowth: "+489%",
    },
  },

  auto: {
    name: "Precision Auto Service",
    logo: "/logo.png",
    brandColor: "#3b82f6", // blue
    tagline: "Expert Care for Your Vehicle",
    enabledFeatures: {
      games: true,
      photoBooth: false,
      jukebox: true,
      feedback: true,
      popularSpots: false,
      thenAndNow: false,
      aiVoice: true,
    },
    games: ["trivia"],
    welcomeMessage: "Welcome to Precision Auto! Relax while we service your vehicle.",
    attractorMessage: "🚗 Check service status • Play trivia • Browse parts",
    ui: {
      gamesMenuTitle: "Entertainment",
      photoBoothTitle: "Photo Booth",
      feedbackPrompt: "How was your service?",
    },
    demo: {
      showPricing: true,
      showVoiceAgent: true,
      highlightFeatures: ["Service Booking", "Parts Upsells", "Loaner Car Requests"],
    },
    metrics: {
      monthlyRevenue: "$3,601",
      roi: "480%",
      partsUpsells: "$1,800/mo",
      laborSavings: "$600/mo",
    },
  },

  healthcare: {
    name: "Westside Family Practice",
    logo: "/logo.png",
    brandColor: "#10b981", // green
    tagline: "Caring for Chicago Families",
    enabledFeatures: {
      games: true,
      photoBooth: false,
      jukebox: false,
      feedback: true,
      popularSpots: false,
      thenAndNow: false,
      aiVoice: true,
    },
    games: ["trivia"],
    welcomeMessage: "Welcome! Complete your health assessment while you wait.",
    attractorMessage: "💊 Patient portal • Health trivia • Appointment reminders",
    ui: {
      gamesMenuTitle: "Patient Education",
      photoBoothTitle: "Photo Booth",
      feedbackPrompt: "How was your visit?",
    },
    demo: {
      showPricing: true,
      showVoiceAgent: true,
      highlightFeatures: ["Appointment Reminders", "Patient Portal", "HIPAA Compliant"],
    },
    metrics: {
      hcahpsImprovement: "+8 points",
      portalRegistration: "+30%",
      perceivedWaitTime: "-40%",
      roi: "1,100%",
    },
  },

  fitness: {
    name: "Chicago Strength & Conditioning",
    logo: "/logo.png",
    brandColor: "#f59e0b", // orange
    tagline: "Transform Your Fitness Journey",
    enabledFeatures: {
      games: true,
      photoBooth: true,
      jukebox: true,
      feedback: true,
      popularSpots: false,
      thenAndNow: false,
      aiVoice: true,
    },
    games: ["trivia"],
    welcomeMessage: "Welcome to Chicago Strength! Sign up for classes and challenges.",
    attractorMessage: "💪 Class schedules • PT bookings • Fitness challenges",
    ui: {
      gamesMenuTitle: "Fitness Challenges",
      photoBoothTitle: "Progress Photos",
      feedbackPrompt: "How was your workout?",
    },
    demo: {
      showPricing: true,
      showVoiceAgent: true,
      highlightFeatures: ["Class Bookings", "PT Lead Generation", "Challenge Enrollment"],
    },
    metrics: {
      churnReduction: "-12%",
      ptLeads: "+15%",
      memberEngagement: "+40%",
      roi: "900%",
    },
  },

  retail: {
    name: "The Chicago Collection",
    logo: "/logo.png",
    brandColor: "#8b5cf6", // purple
    tagline: "Fashion Forward Since 1995",
    enabledFeatures: {
      games: true,
      photoBooth: true,
      jukebox: true,
      feedback: true,
      popularSpots: false,
      thenAndNow: false,
      aiVoice: false,
    },
    games: ["trivia"],
    welcomeMessage: "Welcome! Take style quizzes and discover new looks.",
    attractorMessage: "🛍️ Style quizzes • Photo booth • Loyalty rewards",
    ui: {
      gamesMenuTitle: "Style Quiz",
      photoBoothTitle: "Fashion Photos",
      feedbackPrompt: "How was your shopping experience?",
    },
    demo: {
      showPricing: true,
      showVoiceAgent: false,
      highlightFeatures: ["Style Recommendations", "Instagram UGC", "Loyalty Integration"],
    },
    metrics: {
      dwellTimeIncrease: "+18%",
      conversionLift: "+18%",
      socialShares: "30/day",
      roi: "800%",
    },
  },

  banking: {
    name: "Redwood Credit Union",
    logo: "/logo.png",
    brandColor: "#059669", // teal
    tagline: "Banking on Community Since 1952",
    enabledFeatures: {
      games: true,
      photoBooth: false,
      jukebox: false,
      feedback: true,
      popularSpots: false,
      thenAndNow: false,
      aiVoice: false,
    },
    games: ["trivia"],
    welcomeMessage: "Welcome! Learn about our financial products while you wait.",
    attractorMessage: "🏦 Financial literacy • Product info • Digital banking",
    ui: {
      gamesMenuTitle: "Financial Literacy",
      photoBoothTitle: "Photo Booth",
      feedbackPrompt: "How was your banking experience?",
    },
    demo: {
      showPricing: true,
      showVoiceAgent: false,
      highlightFeatures: ["Cross-Sell Prompts", "Digital Banking Adoption", "NPS Improvement"],
    },
    metrics: {
      crossSellIncrease: "+13 points",
      npsImprovement: "+9 points",
      digitalAdoption: "+22%",
      roi: "836%",
    },
  },

  events: {
    name: "Elegant Events by Sarah",
    logo: "/logo.png",
    brandColor: "#ec4899", // pink
    tagline: "Creating Unforgettable Moments",
    enabledFeatures: {
      games: true,
      photoBooth: true,
      jukebox: true,
      feedback: false,
      popularSpots: false,
      thenAndNow: false,
      aiVoice: false,
    },
    games: ["trivia"],
    welcomeMessage: "Welcome to the celebration! Take photos and play games.",
    attractorMessage: "🎉 Photo booth • Games • Share memories",
    ui: {
      gamesMenuTitle: "Wedding Games",
      photoBoothTitle: "Event Photos",
      feedbackPrompt: "How's the event?",
    },
    demo: {
      showPricing: true,
      showVoiceAgent: false,
      highlightFeatures: ["White Label", "Social Sharing", "Guest Engagement"],
    },
    metrics: {
      guestEngagement: "70%",
      socialPosts: "3x increase",
      clientRetention: "+20%",
      roi: "1,100%",
    },
  },
};

// Get industry config from URL parameter or default to restaurant
export function getIndustryConfig() {
  const params = new URLSearchParams(window.location.search);
  const industry = params.get('industry') || 'restaurant';
  return industryConfigs[industry] || industryConfigs.restaurant;
}

// Check if running in industry demo mode
export function isIndustryDemo() {
  const params = new URLSearchParams(window.location.search);
  return params.has('industry');
}

// Get industry name from URL
export function getIndustryName() {
  const params = new URLSearchParams(window.location.search);
  return params.get('industry') || 'restaurant';
}
