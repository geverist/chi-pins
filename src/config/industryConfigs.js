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
    // ROI calculation parameters
    roiCalc: {
      defaultCustomersPerDay: 200,
      defaultAvgTicket: 12,
      engagementRate: 0.65, // 65% of waiting customers engage
      upsellConversionRate: 0.28, // 28% of engaged customers add items
      avgUpsellValue: 4.50, // Average upsell amount
      laborSavingsPerMonth: 500, // Reduced host/cashier needs
      retentionLift: 0.18, // 18% increase in return visits
      avgRetentionValue: 80, // Monthly value per retained customer
      assumptionText: "Based on QSR with 200 daily customers, $12 avg ticket. Upsells: fries, drinks, desserts.",
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
    // ROI calculation parameters
    roiCalc: {
      defaultCustomersPerDay: 80,
      defaultAvgTicket: 250,
      engagementRate: 0.75, // 75% of waiting clients engage
      upsellConversionRate: 0.42, // 42% buy products/upgrades
      avgUpsellValue: 95, // Skincare products, treatment upgrades
      laborSavingsPerMonth: 450, // Reduced front desk needs
      membershipConversionRate: 0.15, // 15% sign up for memberships
      avgMembershipValue: 300, // Monthly membership fee
      assumptionText: "Based on med spa with 80 daily appointments, $250 avg service. Upsells: products, upgrades, memberships.",
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
    // ROI calculation parameters
    roiCalc: {
      defaultCustomersPerDay: 50,
      defaultAvgTicket: 350,
      engagementRate: 0.60, // 60% of waiting customers engage
      upsellConversionRate: 0.35, // 35% add parts/services
      avgUpsellValue: 120, // Air filters, wipers, fluids, detailing
      laborSavingsPerMonth: 600, // Reduced service advisor needs
      appointmentBookingRate: 0.25, // 25% book future service
      avgFutureAppointmentValue: 280,
      assumptionText: "Based on auto shop with 50 daily service appointments, $350 avg ticket. Upsells: parts, fluids, detailing.",
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
    // ROI calculation parameters
    roiCalc: {
      defaultCustomersPerDay: 120,
      defaultAvgTicket: 0, // Not revenue-focused
      engagementRate: 0.70, // 70% complete health assessments
      hcahpsImprovementPoints: 8, // HCAHPS score increase
      hcahpsValuePerPoint: 50000, // Annual value per HCAHPS point
      portalRegistrationIncrease: 0.30, // 30% more portal sign-ups
      portalValuePerPatient: 85, // Annual value per digital patient
      noShowReduction: 0.35, // 35% reduction in no-shows
      noShowCostSaved: 150, // Cost per prevented no-show
      assumptionText: "Based on family practice with 120 daily patients. Benefits: HCAHPS scores, portal adoption, no-show reduction.",
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
    // ROI calculation parameters
    roiCalc: {
      defaultCustomersPerDay: 300, // Daily member visits
      defaultAvgTicket: 89, // Monthly membership fee
      engagementRate: 0.65, // 65% participate in challenges
      churnReduction: 0.12, // 12% reduction in member churn
      avgMemberLifetimeValue: 1200, // LTV per retained member
      ptLeadConversion: 0.15, // 15% more PT leads
      avgPTPackageValue: 800,
      supplementSalesIncrease: 0.25, // 25% more supplement sales
      avgSupplementValue: 45,
      assumptionText: "Based on gym with 300 daily visits, $89/mo membership. Benefits: reduced churn, PT leads, supplement sales.",
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
    // ROI calculation parameters
    roiCalc: {
      defaultCustomersPerDay: 180,
      defaultAvgTicket: 85,
      engagementRate: 0.55, // 55% take style quiz or photo
      dwellTimeIncrease: 0.18, // 18% longer shopping time
      conversionLift: 0.18, // 18% higher conversion rate
      avgConversionValue: 85,
      socialSharesPerDay: 30, // Instagram/social posts
      socialShareValue: 3.50, // Value per social impression
      loyaltySignupRate: 0.22, // 22% join loyalty program
      loyaltyMemberValue: 240, // Annual value per loyalty member
      assumptionText: "Based on boutique with 180 daily visitors, $85 avg sale. Benefits: dwell time, conversion, social UGC, loyalty.",
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
    // ROI calculation parameters
    roiCalc: {
      defaultCustomersPerDay: 250,
      defaultAvgTicket: 0, // Not transaction-focused
      engagementRate: 0.60, // 60% complete financial literacy content
      crossSellIncrease: 13, // 13 point increase in cross-sell ratio
      crossSellValuePerPoint: 12000, // Annual value per cross-sell point
      digitalAdoptionIncrease: 0.22, // 22% more digital banking adoption
      digitalUserValue: 120, // Annual value per digital user
      npsImprovement: 9, // 9 point NPS increase
      npsValuePerPoint: 8500, // Annual value per NPS point
      assumptionText: "Based on credit union branch with 250 daily visitors. Benefits: cross-sell, digital adoption, NPS improvement.",
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
    // ROI calculation parameters
    roiCalc: {
      defaultCustomersPerDay: 150, // Average wedding guests
      defaultAvgTicket: 0, // Client pays, not guests
      engagementRate: 0.70, // 70% of guests use photo booth/games
      socialSharesPerEvent: 45, // Social media posts per event
      socialShareValue: 8, // Value per event-related social post
      clientRetentionIncrease: 0.20, // 20% more repeat clients
      avgClientValue: 4500, // Revenue per event client
      referralIncrease: 0.30, // 30% more referrals from engaged guests
      avgReferralValue: 4200,
      assumptionText: "Based on event (wedding, corporate) with 150 guests. Benefits: social sharing, client retention, referrals.",
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
