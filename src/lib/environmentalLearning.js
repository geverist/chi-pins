// src/lib/environmentalLearning.js
// Utilities for environmental context detection and learning reset

/**
 * Calculate distance between two geographic coordinates in meters
 * Uses Haversine formula
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Detect if kiosk has moved to a significantly different location
 * Returns true if distance exceeds threshold (default 100m)
 */
export function hasLocationChanged(
  previousLat,
  previousLng,
  currentLat,
  currentLng,
  thresholdMeters = 100
) {
  if (!previousLat || !previousLng || !currentLat || !currentLng) {
    return false;
  }

  const distance = calculateDistance(previousLat, previousLng, currentLat, currentLng);
  return distance > thresholdMeters;
}

/**
 * Get current weather condition estimate based on lighting
 * This is a simple heuristic - for production, use a weather API
 */
export function estimateWeatherFromLighting(lightingLevel, hourOfDay) {
  // During daytime (6am - 8pm)
  if (hourOfDay >= 6 && hourOfDay <= 20) {
    if (lightingLevel > 200) return 'sunny';
    if (lightingLevel > 140) return 'partly_cloudy';
    if (lightingLevel > 80) return 'cloudy';
    return 'stormy'; // Very dark during daytime suggests storm
  }

  // During nighttime, can't reliably estimate weather
  return null;
}

/**
 * Classify entity type based on detection patterns
 * This is a placeholder - for production, use TensorFlow.js object detection
 */
export function classifyEntityType(proximityPattern, movementPattern) {
  // Simple heuristics for now
  // In production, this would use ML model like COCO-SSD or MobileNet

  // Dogs: Lower proximity (camera mounted high), erratic movement
  if (proximityPattern.height < 0.4 && movementPattern.erratic > 0.7) {
    return 'dog';
  }

  // Cats: Very low proximity, slow movement
  if (proximityPattern.height < 0.3 && movementPattern.speed < 0.3) {
    return 'cat';
  }

  // Humans: Mid-high proximity, relatively smooth movement
  if (proximityPattern.height > 0.4) {
    return 'human';
  }

  return 'unknown';
}

/**
 * Detect if learning should be reset based on environmental changes
 */
export async function shouldResetLearning(previousContext, currentContext) {
  const reasons = [];

  // Check location change
  if (previousContext.latitude && currentContext.latitude) {
    if (
      hasLocationChanged(
        previousContext.latitude,
        previousContext.longitude,
        currentContext.latitude,
        currentContext.longitude,
        100 // 100m threshold
      )
    ) {
      reasons.push('location_changed');
    }
  }

  // Check dramatic lighting change (environment change)
  if (previousContext.lighting_level && currentContext.lighting_level) {
    const lightingDiff = Math.abs(
      previousContext.lighting_level - currentContext.lighting_level
    );
    if (lightingDiff > 100) {
      // Dramatic shift (e.g., moved indoors/outdoors)
      reasons.push('lighting_environment_changed');
    }
  }

  // Check time zone change (unusual but possible if kiosk is relocated)
  if (previousContext.hour_of_day && currentContext.hour_of_day) {
    const hourDiff = Math.abs(previousContext.hour_of_day - currentContext.hour_of_day);
    if (hourDiff > 12) {
      // Crossed significant time zones
      reasons.push('timezone_changed');
    }
  }

  return {
    shouldReset: reasons.length > 0,
    reasons,
  };
}

/**
 * Get time-of-day period for analytics
 */
export function getTimeOfDayPeriod(hourOfDay) {
  if (hourOfDay >= 5 && hourOfDay < 12) return 'morning';
  if (hourOfDay >= 12 && hourOfDay < 17) return 'afternoon';
  if (hourOfDay >= 17 && hourOfDay < 21) return 'evening';
  return 'night';
}

/**
 * Get day type for analytics
 */
export function getDayType(dayOfWeek) {
  if (dayOfWeek === 0 || dayOfWeek === 6) return 'weekend';
  return 'weekday';
}

/**
 * Analyze learning sessions to find optimal thresholds for different conditions
 */
export function analyzeLearningPatterns(sessions) {
  const patterns = {
    byTimeOfDay: {
      morning: { engaged: 0, total: 0 },
      afternoon: { engaged: 0, total: 0 },
      evening: { engaged: 0, total: 0 },
      night: { engaged: 0, total: 0 },
    },
    byLighting: {
      bright: { engaged: 0, total: 0 },
      normal: { engaged: 0, total: 0 },
      dim: { engaged: 0, total: 0 },
      dark: { engaged: 0, total: 0 },
    },
    byDayType: {
      weekday: { engaged: 0, total: 0 },
      weekend: { engaged: 0, total: 0 },
    },
  };

  for (const session of sessions) {
    const period = getTimeOfDayPeriod(session.hour_of_day);
    const dayType = getDayType(session.day_of_week);
    const lighting = session.lighting_condition || 'normal';

    const isEngaged = session.outcome === 'engaged' || session.outcome === 'converted';

    // By time of day
    if (patterns.byTimeOfDay[period]) {
      patterns.byTimeOfDay[period].total++;
      if (isEngaged) patterns.byTimeOfDay[period].engaged++;
    }

    // By lighting
    if (patterns.byLighting[lighting]) {
      patterns.byLighting[lighting].total++;
      if (isEngaged) patterns.byLighting[lighting].engaged++;
    }

    // By day type
    if (patterns.byDayType[dayType]) {
      patterns.byDayType[dayType].total++;
      if (isEngaged) patterns.byDayType[dayType].engaged++;
    }
  }

  // Calculate engagement rates
  const insights = {
    bestTimeOfDay: null,
    worstTimeOfDay: null,
    bestLighting: null,
    worstLighting: null,
    weekdayVsWeekend: null,
  };

  // Find best/worst time of day
  let maxEngagementRate = 0;
  let minEngagementRate = 1;
  for (const [period, stats] of Object.entries(patterns.byTimeOfDay)) {
    if (stats.total > 10) {
      // Minimum sample size
      const rate = stats.engaged / stats.total;
      if (rate > maxEngagementRate) {
        maxEngagementRate = rate;
        insights.bestTimeOfDay = { period, rate, ...stats };
      }
      if (rate < minEngagementRate) {
        minEngagementRate = rate;
        insights.worstTimeOfDay = { period, rate, ...stats };
      }
    }
  }

  // Find best/worst lighting
  maxEngagementRate = 0;
  minEngagementRate = 1;
  for (const [condition, stats] of Object.entries(patterns.byLighting)) {
    if (stats.total > 10) {
      const rate = stats.engaged / stats.total;
      if (rate > maxEngagementRate) {
        maxEngagementRate = rate;
        insights.bestLighting = { condition, rate, ...stats };
      }
      if (rate < minEngagementRate) {
        minEngagementRate = rate;
        insights.worstLighting = { condition, rate, ...stats };
      }
    }
  }

  // Weekday vs weekend comparison
  if (patterns.byDayType.weekday.total > 10 && patterns.byDayType.weekend.total > 10) {
    const weekdayRate = patterns.byDayType.weekday.engaged / patterns.byDayType.weekday.total;
    const weekendRate = patterns.byDayType.weekend.engaged / patterns.byDayType.weekend.total;
    insights.weekdayVsWeekend = {
      weekdayRate,
      weekendRate,
      preference: weekdayRate > weekendRate ? 'weekday' : 'weekend',
    };
  }

  return { patterns, insights };
}
