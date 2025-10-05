// src/config/verticalModes.js
// Vertical-specific demo configurations for investor presentations

export const VERTICAL_MODES = {
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant & QSR',
    icon: '🍔',
    tagline: 'Turn wait times into upsell opportunities',

    branding: {
      primaryColor: '#ef4444',
      secondaryColor: '#f59e0b',
      logoText: "Joe's Burger Bar",
      tagline: 'Chicago\'s Best Burgers Since 1985',
    },

    features: {
      games: true,
      photoBooth: true,
      pinMap: true,
      jukebox: true,
      ordering: true,
      feedback: true,
      thenAndNow: false,
      weather: true,
    },

    games: [
      {
        id: 'hotdog',
        name: 'Build a Chicago Dog',
        enabled: true,
        customization: {
          title: 'Build Our Signature Burger',
          description: 'Stack the perfect burger in the right order!',
        }
      },
      {
        id: 'trivia',
        name: 'Food & Local Trivia',
        enabled: true,
        customization: {
          categories: ['Local History', 'Food Facts', 'Restaurant Trivia'],
        }
      },
      {
        id: 'deepdish',
        name: 'Catch the Ingredients',
        enabled: true,
        customization: {
          items: ['Lettuce', 'Tomato', 'Cheese', 'Bacon', 'Pickles'],
          badItems: ['Burnt Bun', 'Expired Sauce'],
        }
      },
    ],

    photoBoothOverlays: [
      { id: 1, name: 'Classic Frame', url: '/overlays/restaurant-classic.png' },
      { id: 2, name: 'Food Fun', url: '/overlays/restaurant-food.png' },
      { id: 3, name: 'Team Spirit', url: '/overlays/restaurant-team.png' },
    ],

    sampleMetrics: {
      avgWaitTime: '18 minutes',
      dailyPlays: 247,
      socialShares: 89,
      avgOrderIncrease: '$8.50',
      customerSatisfaction: '4.6 / 5.0',
    },

    demoNotifications: [
      'New order placed via kiosk - Table 5 - $47.50',
      'Achievement unlocked: "Perfect Burger Builder" - Sarah M.',
      'Photo shared to Instagram - 3 new followers',
    ],
  },

  healthcare: {
    id: 'healthcare',
    name: 'Healthcare Waiting Rooms',
    icon: '💊',
    tagline: 'Reduce wait anxiety, improve patient satisfaction',

    branding: {
      primaryColor: '#3b82f6',
      secondaryColor: '#10b981',
      logoText: 'Wellness Family Practice',
      tagline: 'Your Health, Our Priority',
    },

    features: {
      games: true,
      photoBooth: false,
      pinMap: true,
      jukebox: true,
      ordering: false,
      feedback: true,
      thenAndNow: false,
      weather: false,
    },

    games: [
      {
        id: 'trivia',
        name: 'Health & Wellness Trivia',
        enabled: true,
        customization: {
          categories: ['Nutrition', 'Exercise', 'Preventive Care', 'Medical History'],
          difficulty: 'easy',
        }
      },
      {
        id: 'deepdish',
        name: 'Catch Healthy Habits',
        enabled: true,
        customization: {
          items: ['🥗 Vegetables', '💧 Water', '🏃 Exercise', '😴 Sleep', '🧘 Meditation'],
          badItems: ['🍟 Junk Food', '🚬 Smoking', '📱 Screen Time'],
        }
      },
    ],

    pinMap: {
      title: 'Where Does It Hurt?',
      type: 'body-diagram',
      description: 'Help us understand your symptoms',
    },

    photoBoothOverlays: null, // Disabled for healthcare privacy

    sampleMetrics: {
      avgWaitTime: '32 minutes',
      dailyPlays: 156,
      hcahpsImprovement: '+12 points',
      appointmentFollowUps: '34% increase',
      patientSatisfaction: '4.8 / 5.0',
    },

    demoNotifications: [
      'Patient checked in - Estimated wait: 25 minutes',
      'Prescription refill reminder sent - John D.',
      'Follow-up appointment scheduled via kiosk',
    ],
  },

  automotive: {
    id: 'automotive',
    name: 'Auto Dealership Service',
    icon: '🚗',
    tagline: 'Convert service waits into parts revenue',

    branding: {
      primaryColor: '#000000',
      secondaryColor: '#ef4444',
      logoText: 'Premium Motors',
      tagline: 'Luxury Service Excellence',
    },

    features: {
      games: true,
      photoBooth: true,
      pinMap: true,
      jukebox: true,
      ordering: false,
      feedback: true,
      thenAndNow: false,
      weather: true,
    },

    games: [
      {
        id: 'trivia',
        name: 'Automotive Trivia',
        enabled: true,
        customization: {
          categories: ['Car History', 'Safety Tips', 'Maintenance Facts', 'Brand Heritage'],
        }
      },
      {
        id: 'hotdog',
        name: 'Build Your Service Package',
        enabled: true,
        customization: {
          title: 'Complete Maintenance Checklist',
          items: ['Oil Change', 'Tire Rotation', 'Brake Inspection', 'Filter Replacement'],
        }
      },
    ],

    serviceIntegration: {
      enabled: true,
      statusUpdates: true,
      upsellPrompts: [
        'Add tire rotation? Save 20% today!',
        'Brake pads at 30% - Replace now for safety',
        'Premium oil upgrade - Just $15 more',
      ],
    },

    photoBoothOverlays: [
      { id: 1, name: 'Car Owner Pride', url: '/overlays/auto-pride.png' },
      { id: 2, name: 'Service Milestone', url: '/overlays/auto-milestone.png' },
    ],

    sampleMetrics: {
      avgWaitTime: '85 minutes',
      dailyPlays: 94,
      partsUpsells: '$1,850/day',
      serviceTicketIncrease: '+$327 avg',
      npsScore: '78 (Industry avg: 53)',
    },

    demoNotifications: [
      'Service complete - Vehicle ready for pickup',
      'Upsell accepted: Cabin air filter - $45',
      'Maintenance plan converted - $1,200 annual value',
    ],
  },

  retail: {
    id: 'retail',
    name: 'Retail & Fashion',
    icon: '🛍️',
    tagline: 'Engage shoppers, boost dwell time & sales',

    branding: {
      primaryColor: '#a855f7',
      secondaryColor: '#ec4899',
      logoText: 'TrendSetter Fashion',
      tagline: 'Style Starts Here',
    },

    features: {
      games: true,
      photoBooth: true,
      pinMap: true,
      jukebox: true,
      ordering: false,
      feedback: true,
      thenAndNow: false,
      weather: false,
    },

    games: [
      {
        id: 'trivia',
        name: 'Fashion & Style Quiz',
        enabled: true,
        customization: {
          categories: ['Fashion History', 'Style Tips', 'Brand Knowledge', 'Trend Spotting'],
        }
      },
      {
        id: 'deepdish',
        name: 'Outfit Matching Game',
        enabled: true,
        customization: {
          items: ['👗 Dress', '👠 Heels', '👜 Bag', '💍 Jewelry', '🕶️ Sunglasses'],
          theme: 'Complete the Look',
        }
      },
    ],

    loyaltyIntegration: {
      enabled: true,
      scanReceipt: true,
      rewardsForPlay: {
        bronzeLevel: '5% off next purchase',
        silverLevel: '10% off + early access to sales',
        goldLevel: '15% off + free shipping',
      },
    },

    photoBoothOverlays: [
      { id: 1, name: 'Outfit of the Day', url: '/overlays/retail-ootd.png' },
      { id: 2, name: 'Fashion Week', url: '/overlays/retail-fashionweek.png' },
      { id: 3, name: 'Style Icon', url: '/overlays/retail-styleicon.png' },
    ],

    sampleMetrics: {
      avgDwellTime: '34 minutes (+22%)',
      dailyPlays: 312,
      loyaltySignups: '67/day',
      socialShares: 156,
      conversionLift: '+18% vs control stores',
    },

    demoNotifications: [
      'Loyalty member scanned - Sarah unlocked "Style Maven" badge',
      'Photo shared to Instagram - Tagged @TrendSetterFashion',
      'Game completion → 15% off coupon sent to email',
    ],
  },

  hospitality: {
    id: 'hospitality',
    name: 'Hotels & Resorts',
    icon: '🏨',
    tagline: 'Enhance guest experience, drive on-property spend',

    branding: {
      primaryColor: '#0891b2',
      secondaryColor: '#f59e0b',
      logoText: 'The Grand Resort',
      tagline: 'Where Memories Are Made',
    },

    features: {
      games: true,
      photoBooth: true,
      pinMap: true,
      jukebox: true,
      ordering: true,
      feedback: true,
      thenAndNow: true,
      weather: true,
    },

    games: [
      {
        id: 'trivia',
        name: 'Destination Trivia',
        enabled: true,
        customization: {
          categories: ['Local Attractions', 'History', 'Culture', 'Food & Dining'],
        }
      },
      {
        id: 'deepdish',
        name: 'Pack Your Suitcase',
        enabled: true,
        customization: {
          items: ['👔 Formal Wear', '👙 Swimsuit', '🥾 Hiking Boots', '📸 Camera'],
          theme: 'Perfect Vacation Packing',
        }
      },
    ],

    conciergeIntegration: {
      enabled: true,
      activityBooking: true,
      diningReservations: true,
      spaServices: true,
      roomService: true,
    },

    pinMap: {
      title: 'Where Have You Traveled?',
      type: 'world-map',
      description: 'Share your journey with fellow guests',
    },

    photoBoothOverlays: [
      { id: 1, name: 'Resort Frame', url: '/overlays/hotel-frame.png' },
      { id: 2, name: 'Vacation Vibes', url: '/overlays/hotel-vacation.png' },
      { id: 3, name: 'Memory Keeper', url: '/overlays/hotel-memories.png' },
    ],

    sampleMetrics: {
      avgWaitTime: '12 minutes (check-in)',
      dailyPlays: 178,
      onPropertySpend: '+$67/guest',
      spaBookings: '45% increase',
      guestSatisfaction: '4.9 / 5.0',
    },

    demoNotifications: [
      'Spa appointment booked via kiosk - $180',
      'Room service order - Champagne & dessert - $85',
      'Activity booked: Sunset cruise for 2 - $220',
    ],
  },

  medspa: {
    id: 'medspa',
    name: 'Med Spas & Wellness Centers',
    icon: '💆',
    tagline: 'Elevate client experience, drive treatment bookings',

    branding: {
      primaryColor: '#ec4899',
      secondaryColor: '#a855f7',
      logoText: 'Radiance Med Spa',
      tagline: 'Where Beauty Meets Science',
    },

    features: {
      games: true,
      photoBooth: true,
      pinMap: false,
      jukebox: true,
      ordering: false,
      feedback: true,
      thenAndNow: true,
      weather: false,
    },

    games: [
      {
        id: 'trivia',
        name: 'Beauty & Wellness Quiz',
        enabled: true,
        customization: {
          categories: ['Skincare Science', 'Anti-Aging', 'Treatment Benefits', 'Wellness Tips'],
        }
      },
      {
        id: 'deepdish',
        name: 'Skincare Routine Builder',
        enabled: true,
        customization: {
          items: ['🧴 Cleanser', '💧 Serum', '☀️ SPF', '🌙 Night Cream', '💎 Treatment'],
          theme: 'Build Your Perfect Routine',
        }
      },
    ],

    treatmentIntegration: {
      enabled: true,
      bookingSystem: true,
      beforeAfterGallery: true,
      packageUpsells: [
        'Add Hydrafacial? 20% off when booked today!',
        'Botox + Filler combo - Save $200',
        'Monthly membership - $399/mo (Save 30%)',
      ],
    },

    thenAndNow: {
      enabled: true,
      title: 'Real Client Results',
      description: 'See transformations from our treatments',
    },

    photoBoothOverlays: [
      { id: 1, name: 'Glow Up', url: '/overlays/medspa-glow.png' },
      { id: 2, name: 'Treatment Day', url: '/overlays/medspa-treatment.png' },
      { id: 3, name: 'Before & After', url: '/overlays/medspa-transformation.png' },
    ],

    sampleMetrics: {
      avgWaitTime: '18 minutes',
      dailyPlays: 167,
      treatmentUpsells: '$3,400/day',
      packageConversions: '42% increase',
      clientSatisfaction: '4.9 / 5.0',
    },

    demoNotifications: [
      'Treatment booked via kiosk: Botox - $450',
      'Package upgrade: Monthly Membership - $399/mo',
      'Before/After photo shared - 12 new followers',
    ],
  },

  banking: {
    id: 'banking',
    name: 'Banks & Credit Unions',
    icon: '🏦',
    tagline: 'Convert wait times into cross-sell opportunities',

    branding: {
      primaryColor: '#1e40af',
      secondaryColor: '#059669',
      logoText: 'First National Bank',
      tagline: 'Banking on Your Future',
    },

    features: {
      games: true,
      photoBooth: false,
      pinMap: false,
      jukebox: true,
      ordering: false,
      feedback: true,
      thenAndNow: false,
      weather: false,
    },

    games: [
      {
        id: 'trivia',
        name: 'Financial Literacy Quiz',
        enabled: true,
        customization: {
          categories: ['Budgeting Basics', 'Investment 101', 'Credit Scores', 'Savings Tips'],
        }
      },
      {
        id: 'hotdog',
        name: 'Build Your Financial Portfolio',
        enabled: true,
        customization: {
          title: 'Diversify Your Investments',
          items: ['Savings Account', 'Checking', '401(k)', 'Emergency Fund', 'Investments'],
        }
      },
    ],

    bankingIntegration: {
      enabled: true,
      accountOpening: true,
      productEducation: true,
      crossSellPrompts: [
        'Add a savings account? Earn 4.5% APY!',
        'Pre-qualify for our Rewards Credit Card',
        'Schedule a mortgage consultation',
      ],
    },

    sampleMetrics: {
      avgWaitTime: '12 minutes',
      dailyPlays: 234,
      accountOpenings: '18% increase',
      crossSellConversions: '$45K/month',
      customerSatisfaction: '4.7 / 5.0',
    },

    demoNotifications: [
      'Account application started: Savings account - $5,000 initial deposit',
      'Credit card pre-qualification completed - Approved',
      'Mortgage consultation scheduled - Thursday 2pm',
    ],
  },

  university: {
    id: 'university',
    name: 'Universities & Student Centers',
    icon: '🎓',
    tagline: 'Boost student engagement & campus dining revenue',

    branding: {
      primaryColor: '#7c3aed',
      secondaryColor: '#f59e0b',
      logoText: 'State University',
      tagline: 'Where Leaders Learn',
    },

    features: {
      games: true,
      photoBooth: true,
      pinMap: true,
      jukebox: true,
      ordering: true,
      feedback: true,
      thenAndNow: true,
      weather: true,
    },

    games: [
      {
        id: 'trivia',
        name: 'Campus Trivia Challenge',
        enabled: true,
        customization: {
          categories: ['University History', 'Student Life', 'Alumni Legends', 'Campus Facts'],
        }
      },
      {
        id: 'deepdish',
        name: 'Catch School Spirit',
        enabled: true,
        customization: {
          items: ['🎓 Cap', '📚 Books', '🏀 Basketball', '🎨 Art', '🔬 Science'],
          theme: 'Show Your School Pride',
        }
      },
    ],

    campusIntegration: {
      enabled: true,
      diningPreOrder: true,
      eventPromotion: true,
      courseRegistration: false,
      features: {
        dormCompetitions: 'Smith Hall vs Jones Hall leaderboards',
        greekLife: 'Fraternity/Sorority challenges',
        athleticEvents: 'Game day trivia and predictions',
      },
    },

    pinMap: {
      title: 'Where Are Students From?',
      type: 'us-map',
      description: 'Mark your hometown on the map',
    },

    sampleMetrics: {
      studentEngagement: '+40% vs baseline',
      dailyPlays: 892,
      diningRevenue: '+22% during lunch',
      eventAttendance: '+35%',
      campusSatisfaction: '4.8 / 5.0',
    },

    demoNotifications: [
      'Dining pre-order: 47 students ordered lunch via kiosk',
      'Campus event: Battle of the Bands - 234 RSVPs from kiosk',
      'Dorm challenge winner: West Tower with 1,247 games played!',
    ],
  },

  airport: {
    id: 'airport',
    name: 'Airports & Transportation Hubs',
    icon: '✈️',
    tagline: 'Turn travel delays into revenue & passenger delight',

    branding: {
      primaryColor: '#0284c7',
      secondaryColor: '#dc2626',
      logoText: 'Metro International Airport',
      tagline: 'Your Journey Begins Here',
    },

    features: {
      games: true,
      photoBooth: true,
      pinMap: true,
      jukebox: false,
      ordering: true,
      feedback: true,
      thenAndNow: false,
      weather: true,
    },

    games: [
      {
        id: 'trivia',
        name: 'Travel & Destination Trivia',
        enabled: true,
        customization: {
          categories: ['World Destinations', 'Aviation History', 'Travel Tips', 'Local Attractions'],
        }
      },
      {
        id: 'deepdish',
        name: 'Pack Your Carry-On',
        enabled: true,
        customization: {
          items: ['🎫 Passport', '💻 Laptop', '🎧 Headphones', '📱 Charger', '💊 Meds'],
          badItems: ['💧 Liquids', '✂️ Scissors', '🔪 Knife'],
        }
      },
    ],

    airportIntegration: {
      enabled: true,
      flightUpdates: true,
      concessionOrdering: true,
      dutyFreePromotions: true,
      loungeAccess: true,
    },

    advertisingRevenue: {
      enabled: true,
      formats: ['Video ads between games', 'Sponsored trivia questions', 'Duty-free product placements'],
      estimatedCPM: '$25 (high-income travelers)',
    },

    pinMap: {
      title: 'Where Are You Flying?',
      type: 'world-map',
      description: 'Share your destination with fellow travelers',
    },

    sampleMetrics: {
      avgEngagementTime: '18 minutes (flight delays)',
      dailyPlays: '1,847 (per gate)',
      concessionUpsells: '+$85/passenger',
      dutyFreeConversions: '12% increase',
      passengerSatisfaction: '4.6 / 5.0',
    },

    demoNotifications: [
      'Flight delay update: Chicago to NYC - 45 min delay (play a game!)',
      'Duty-free order: Perfume & Chocolate - $175',
      'Concession pre-order: Starbucks latte - Ready at Gate B12',
    ],
  },

  government: {
    id: 'government',
    name: 'Government Offices (DMV, Social Services)',
    icon: '🏛️',
    tagline: 'Transform citizen frustration into civic engagement',

    branding: {
      primaryColor: '#1e3a8a',
      secondaryColor: '#dc2626',
      logoText: 'Department of Motor Vehicles',
      tagline: 'Serving Our Community',
    },

    features: {
      games: true,
      photoBooth: false,
      pinMap: false,
      jukebox: true,
      ordering: false,
      feedback: true,
      thenAndNow: true,
      weather: false,
    },

    games: [
      {
        id: 'trivia',
        name: 'Civic Education Quiz',
        enabled: true,
        customization: {
          categories: ['Local History', 'Government Services', 'Traffic Laws', 'Community Resources'],
        }
      },
      {
        id: 'hotdog',
        name: 'DMV Checklist Builder',
        enabled: true,
        customization: {
          title: 'What Do You Need?',
          items: ['Photo ID', 'Proof of Residence', 'Insurance Card', 'Registration', 'Payment'],
        }
      },
    ],

    governmentIntegration: {
      enabled: true,
      servicePreparation: true,
      appointmentReminders: true,
      educationalContent: {
        dmv: 'What documents to bring for license renewal',
        socialServices: 'Eligibility requirements for programs',
        permits: 'Building permit process walkthrough',
      },
    },

    thenAndNow: {
      enabled: true,
      title: 'Our City Through Time',
      description: 'Historical photos of local landmarks',
    },

    sampleMetrics: {
      avgWaitTime: '38 minutes (reduced anxiety)',
      dailyPlays: 412,
      complaintReduction: '-30%',
      satisfactionImprovement: '+15 points',
      servicePreparedness: '82% (vs 45% baseline)',
    },

    demoNotifications: [
      'Service checklist completed: License renewal - All docs ready',
      'Educational video watched: How to renew vehicle registration',
      'Feedback submitted: "Games made the wait bearable!" - 5 stars',
    ],
  },

  fitness: {
    id: 'fitness',
    name: 'Gyms & Fitness Centers',
    icon: '💪',
    tagline: 'Gamify workouts, reduce churn, boost engagement',

    branding: {
      primaryColor: '#10b981',
      secondaryColor: '#ef4444',
      logoText: 'PowerFit Studio',
      tagline: 'Stronger Every Day',
    },

    features: {
      games: true,
      photoBooth: true,
      pinMap: false,
      jukebox: true,
      ordering: false,
      feedback: true,
      thenAndNow: false,
      weather: false,
    },

    games: [
      {
        id: 'trivia',
        name: 'Fitness & Nutrition Quiz',
        enabled: true,
        customization: {
          categories: ['Exercise Science', 'Nutrition', 'Workout Tips', 'Fitness Myths'],
        }
      },
      {
        id: 'deepdish',
        name: 'Healthy Habits Challenge',
        enabled: true,
        customization: {
          items: ['🥗 Protein', '🥤 Hydration', '💪 Strength', '🏃 Cardio', '😴 Recovery'],
          badItems: ['🍔 Junk Food', '📱 Excuses', '😴 Skipping Workouts'],
        }
      },
      {
        id: 'wind',
        name: 'HIIT Challenge',
        enabled: true,
        customization: {
          title: 'Protect Your Gains!',
          description: 'Dodge obstacles during your cardio session',
        }
      },
    ],

    fitnessIntegration: {
      enabled: true,
      classBooking: true,
      trainerScheduling: true,
      workoutTracking: true,
      leaderboards: true,
      challenges: {
        weekly: '7-Day Streak Challenge',
        monthly: 'Most Games Played',
        social: 'Challenge a Friend',
      },
    },

    photoBoothOverlays: [
      { id: 1, name: 'Progress Photo', url: '/overlays/fitness-progress.png' },
      { id: 2, name: 'Workout Warrior', url: '/overlays/fitness-warrior.png' },
      { id: 3, name: 'Goal Achieved', url: '/overlays/fitness-goal.png' },
    ],

    sampleMetrics: {
      memberEngagement: '+85% vs baseline',
      dailyPlays: 423,
      churnReduction: '-15% (12-month avg)',
      ptBookings: '39% increase',
      classAttendance: '+28%',
    },

    demoNotifications: [
      'Personal training session booked - Marcus J. - $120',
      'Weekly challenge winner: Sarah M. - 127 games played!',
      'Class reminder: HIIT @ 6pm - 3 spots left',
    ],
  },

  // TIER 2 VERTICALS
  urgentcare: {
    id: 'urgentcare',
    name: 'Emergency Rooms & Urgent Care',
    icon: '🚑',
    tagline: 'Reduce patient anxiety, improve HCAHPS scores',

    branding: {
      primaryColor: '#dc2626',
      secondaryColor: '#3b82f6',
      logoText: 'CareNow Urgent Care',
      tagline: 'Fast, Compassionate Care',
    },

    features: {
      games: true,
      photoBooth: false,
      pinMap: false,
      jukebox: true,
      ordering: false,
      feedback: true,
      thenAndNow: false,
      weather: false,
    },

    games: [
      {
        id: 'trivia',
        name: 'Health Literacy Quiz',
        enabled: true,
        customization: {
          categories: ['First Aid', 'When to Visit ER', 'Insurance Basics', 'Preventive Care'],
        }
      },
      {
        id: 'deepdish',
        name: 'Build a First Aid Kit',
        enabled: true,
        customization: {
          items: ['🩹 Bandages', '💊 Pain Relief', '🌡️ Thermometer', '🧴 Antiseptic', '📋 Emergency Contacts'],
        }
      },
    },

    sampleMetrics: {
      avgWaitTime: '125 minutes (ER avg)',
      dailyPlays: 267,
      anxietyReduction: '-45%',
      hcahpsImprovement: '+12 points',
      patientSatisfaction: '4.5 / 5.0',
    },

    demoNotifications: [
      'Patient education: Understanding your diagnosis - Video watched',
      'Insurance info: Copay estimator completed - $75 estimated',
      'Wait time update: Doctor will see you in 20 minutes',
    ],
  },

  theater: {
    id: 'theater',
    name: 'Movie Theaters & Entertainment',
    icon: '🎬',
    tagline: 'Turn pre-show waits into concession revenue',

    branding: {
      primaryColor: '#dc2626',
      secondaryColor: '#f59e0b',
      logoText: 'Regal Cinemas',
      tagline: 'The Best Seat in Town',
    },

    features: {
      games: true,
      photoBooth: true,
      pinMap: false,
      jukebox: false,
      ordering: true,
      feedback: true,
      thenAndNow: false,
      weather: false,
    },

    games: [
      {
        id: 'trivia',
        name: 'Movie & Pop Culture Quiz',
        enabled: true,
        customization: {
          categories: ['Film History', 'Actor Trivia', 'Director Classics', 'Box Office Records'],
        }
      },
      {
        id: 'deepdish',
        name: 'Catch the Popcorn',
        enabled: true,
        customization: {
          items: ['🍿 Popcorn', '🥤 Soda', '🍬 Candy', '🌭 Hotdog', '🧈 Butter'],
        }
      },
    },

    concessionIntegration: {
      enabled: true,
      mobileOrdering: true,
      seatDelivery: false,
      comboPromotions: [
        'Large popcorn + 2 sodas = $12 (save $4)',
        'Add candy to your order - Just $3 more',
      ],
    },

    sampleMetrics: {
      avgWaitTime: '18 minutes (pre-show)',
      dailyPlays: 1456,
      concessionUpsells: '+$4.50/person',
      comboConversions: '35% increase',
      guestSatisfaction: '4.7 / 5.0',
    },

    demoNotifications: [
      'Concession order: Large popcorn combo - $12 - Ready in 5 min',
      'Upcoming movie trivia: Win free tickets - Game starts in 2 min',
      'Photo shared: Movie night selfie - #RegalCinemas',
    ],
  },

  k12school: {
    id: 'k12school',
    name: 'K-12 Schools (Cafeteria & Library)',
    icon: '🏫',
    tagline: 'Faster lunch lines, engaged students, better outcomes',

    branding: {
      primaryColor: '#059669',
      secondaryColor: '#f59e0b',
      logoText: 'Lincoln Middle School',
      tagline: 'Learning Today, Leading Tomorrow',
    },

    features: {
      games: true,
      photoBooth: false,
      pinMap: false,
      jukebox: true,
      ordering: true,
      feedback: false,
      thenAndNow: false,
      weather: false,
    },

    games: [
      {
        id: 'trivia',
        name: 'Educational Quiz Challenge',
        enabled: true,
        customization: {
          categories: ['Math Facts', 'Science Fun', 'History Heroes', 'Reading Rewards'],
        }
      },
      {
        id: 'deepdish',
        name: 'Build a Balanced Meal',
        enabled: true,
        customization: {
          items: ['🥗 Vegetables', '🍎 Fruit', '🥛 Milk', '🍞 Grains', '🍗 Protein'],
        }
      },
    ],

    schoolIntegration: {
      enabled: true,
      lunchPreOrder: true,
      libraryBookReservation: true,
      behavioralRewards: 'Good behavior = bonus game time',
      parentalControls: true,
    },

    sampleMetrics: {
      lunchLineSpeed: '-18% wait time',
      dailyPlays: 2341,
      libraryEngagement: '+25%',
      nutritionEducation: '67% improvement',
      teacherSatisfaction: '4.6 / 5.0',
    },

    demoNotifications: [
      'Lunch pre-order: 234 students ordered via kiosk',
      'Library book reserved: "Harry Potter" - Ready for pickup',
      'Weekly trivia winner: 8th Grade Team - Pizza party prize!',
    ],
  },

  // TIER 3 VERTICALS
  casino: {
    id: 'casino',
    name: 'Casinos & Gaming Floors',
    icon: '🎰',
    tagline: 'Extend play time, boost F&B revenue, retain high rollers',

    branding: {
      primaryColor: '#dc2626',
      secondaryColor: '#fbbf24',
      logoText: 'Golden Palace Casino',
      tagline: 'Where Winners Play',
    },

    features: {
      games: true,
      photoBooth: true,
      pinMap: false,
      jukebox: true,
      ordering: true,
      feedback: true,
      thenAndNow: false,
      weather: false,
    },

    games: [
      {
        id: 'trivia',
        name: 'Casino & Sports Trivia',
        enabled: true,
        customization: {
          categories: ['Poker Strategy', 'Sports Betting', 'Casino History', 'Vegas Legends'],
        }
      },
      {
        id: 'wind',
        name: 'Beat the Odds',
        enabled: true,
        customization: {
          title: 'Protect Your Winnings',
          description: 'Dodge the house edge!',
        }
      },
    ],

    casinoIntegration: {
      enabled: true,
      compPointsRewards: 'Earn comp points for gameplay',
      sportsBookIntegration: true,
      fbOrdering: 'Table-side delivery from games',
      vipServices: 'Host requests via kiosk',
    },

    sampleMetrics: {
      avgPlayTime: '+15% on slot machines',
      dailyPlays: 3421,
      fbUpsells: '+$65/player',
      compPointRedemptions: '28% increase',
      playerRetention: '4.8 / 5.0 loyalty score',
    },

    demoNotifications: [
      'Comp points earned: 500 points from kiosk games',
      'F&B order: Steak dinner + wine - $85 - Delivered to table',
      'Sports bet placed: Lakers -5.5 - $100 - Via kiosk',
    ],
  },

  grocery: {
    id: 'grocery',
    name: 'Grocery Stores (Checkout Lines)',
    icon: '🛒',
    tagline: 'Turn checkout frustration into impulse revenue',

    branding: {
      primaryColor: '#059669',
      secondaryColor: '#f59e0b',
      logoText: 'Fresh Market Grocers',
      tagline: 'Fresh Food, Happy Families',
    },

    features: {
      games: true,
      photoBooth: false,
      pinMap: false,
      jukebox: false,
      ordering: false,
      feedback: true,
      thenAndNow: false,
      weather: false,
    },

    games: [
      {
        id: 'trivia',
        name: 'Food & Recipe Quiz',
        enabled: true,
        customization: {
          categories: ['Cooking Tips', 'Nutrition Facts', 'Recipe Ideas', 'Food History'],
        }
      },
      {
        id: 'deepdish',
        name: 'Build Your Dinner',
        enabled: true,
        customization: {
          items: ['🥩 Protein', '🥦 Veggies', '🍚 Grains', '🧂 Seasoning', '🍷 Beverage'],
        }
      },
    ],

    groceryIntegration: {
      enabled: true,
      digitalCoupons: 'Unlock coupons through gameplay',
      loyaltyProgram: 'Earn points while waiting',
      recipeRecommendations: 'Get recipes based on cart items',
    },

    sampleMetrics: {
      avgCheckoutWait: '6 minutes',
      dailyPlays: 1847,
      impulseBuys: '+$8/transaction',
      loyaltySignups: '40% increase',
      customerSatisfaction: '4.5 / 5.0',
    },

    demoNotifications: [
      'Coupon unlocked: $3 off produce - Applied to cart',
      'Recipe suggestion: Pasta primavera - Ingredients in your cart!',
      'Loyalty points earned: 50 points - Total: 1,250',
    ],
  },

  cruise: {
    id: 'cruise',
    name: 'Cruise Ships & All-Inclusive Resorts',
    icon: '🚢',
    tagline: 'Maximize excursion revenue, enhance guest experience',

    branding: {
      primaryColor: '#0284c7',
      secondaryColor: '#fbbf24',
      logoText: 'Royal Caribbean',
      tagline: 'Seas the Day',
    },

    features: {
      games: true,
      photoBooth: true,
      pinMap: true,
      jukebox: true,
      ordering: true,
      feedback: true,
      thenAndNow: false,
      weather: true,
    },

    games: [
      {
        id: 'trivia',
        name: 'Nautical & Destination Trivia',
        enabled: true,
        customization: {
          categories: ['Ship History', 'Port Destinations', 'Ocean Facts', 'Cruise Traditions'],
        }
      },
      {
        id: 'deepdish',
        name: 'Pack for Paradise',
        enabled: true,
        customization: {
          items: ['👙 Swimsuit', '🕶️ Sunglasses', '📸 Camera', '🧴 Sunscreen', '🎒 Day Bag'],
        }
      },
    ],

    cruiseIntegration: {
      enabled: true,
      excursionBooking: true,
      onboardDining: 'Reserve specialty restaurants',
      spaServices: true,
      activitySchedule: 'See daily events and book',
    },

    pinMap: {
      title: 'Where Have You Sailed?',
      type: 'world-map',
      description: 'Mark the ports you\'ve visited',
    },

    sampleMetrics: {
      avgEngagementTime: '25 minutes (embarkation)',
      dailyPlays: 2134,
      excursionUpsells: '+$120/guest',
      diningReservations: '50% increase',
      guestSatisfaction: '4.9 / 5.0',
    },

    demoNotifications: [
      'Excursion booked: Snorkeling tour - $89/person - 4 guests',
      'Spa appointment: Couples massage - $220 - Tomorrow 3pm',
      'Specialty dining: Italian restaurant - Tonight 7pm - Party of 4',
    ],
  },
};

// Helper function to get current mode from localStorage or default
export const getCurrentMode = () => {
  try {
    const stored = localStorage.getItem('chipins_demo_mode');
    return stored && VERTICAL_MODES[stored] ? stored : 'restaurant';
  } catch {
    return 'restaurant';
  }
};

// Helper function to set mode
export const setCurrentMode = (modeId) => {
  try {
    if (VERTICAL_MODES[modeId]) {
      localStorage.setItem('chipins_demo_mode', modeId);
      return true;
    }
  } catch (e) {
    console.error('Failed to set demo mode:', e);
  }
  return false;
};

// Helper function to get mode config
export const getModeConfig = (modeId = null) => {
  const currentMode = modeId || getCurrentMode();
  return VERTICAL_MODES[currentMode] || VERTICAL_MODES.restaurant;
};

// Helper function to apply mode to admin settings
export const applyModeToSettings = (modeId) => {
  const mode = getModeConfig(modeId);

  return {
    // Branding
    restaurantName: mode.branding.logoText,
    restaurantTagline: mode.branding.tagline,
    primaryColor: mode.branding.primaryColor,
    secondaryColor: mode.branding.secondaryColor,

    // Feature toggles
    gamesEnabled: mode.features.games,
    photoBoothEnabled: mode.features.photoBooth,
    pinMapEnabled: mode.features.pinMap,
    jukeboxEnabled: mode.features.jukebox,
    orderingEnabled: mode.features.ordering,
    feedbackEnabled: mode.features.feedback,
    thenAndNowEnabled: mode.features.thenAndNow,
    weatherEnabled: mode.features.weather,

    // Demo mode flag
    demoMode: true,
    demoVertical: modeId,
  };
};

export default VERTICAL_MODES;
