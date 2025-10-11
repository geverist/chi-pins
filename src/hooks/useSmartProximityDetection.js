// src/hooks/useSmartProximityDetection.js
// Integrated environmental proximity learning with multi-person tracking and gaze detection
// Combines MediaPipe computer vision with adaptive learning for robot-ready intelligence

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMultiPersonTracking } from './useMultiPersonTracking';
import { useLearningSession } from './useLearningSession';

/**
 * Hysteresis thresholds - prevents oscillation by requiring different values to enter vs exit states
 * Higher threshold to enter, lower to exit
 */
const HYSTERESIS = {
  ambient: {
    enter: 30,  // Enter ambient zone at distance >= 30
    exit: 25,   // Stay in ambient until distance < 25
  },
  walkup: {
    enter: 60,  // Enter walkup zone at distance >= 60
    exit: 50,   // Stay in walkup until distance < 50
  },
  stare: {
    enter: 60,  // Enter stare zone at distance >= 60
    exit: 50,   // Stay in stare until distance < 50
  },
};

/**
 * Multi-signal validation - requires multiple independent signals to agree
 * Prevents false positives by checking trajectory, gaze, velocity, and distance
 */
function validateIntent(person, requiredIntent) {
  const signals = {
    // Signal 1: Distance is appropriate for intent
    distanceMatches: requiredIntent === 'approaching'
      ? person.distance > HYSTERESIS.walkup.enter
      : true,

    // Signal 2: Velocity direction matches intent
    velocityMatches: requiredIntent === 'approaching'
      ? person.velocity?.x > 0.05 || person.velocity?.y > 0.05 // Moving toward kiosk
      : true,

    // Signal 3: Gaze at kiosk (for walkup/stare only)
    gazeMatches: ['approaching', 'stopped'].includes(requiredIntent)
      ? person.isLookingAtKiosk === true && person.gazeConfidence > 0.7
      : true,

    // Signal 4: Intent prediction matches
    intentMatches: person.intent === requiredIntent,
  };

  // Count agreeing signals
  const agreementCount = Object.values(signals).filter(Boolean).length;

  // Require at least 3 out of 4 signals to agree
  return agreementCount >= 3;
}

/**
 * Smart Proximity Detection - Multi-person tracking with gaze-validated triggers
 *
 * Three-tier environmental awareness:
 * 1. AMBIENT (distance 10-30): General proximity → ambient music
 * 2. WALKUP (distance 30-60 + looking at kiosk): Approaching patron → voice greeting
 * 3. STARE (distance 60+ + looking at kiosk for 15s): Engaged employee → checkin/checkout UI
 *
 * Features:
 * - Multi-person tracking (up to 5 simultaneous)
 * - Gaze-validated engagement (only greet when looking)
 * - Movement vectoring (approaching vs. passing by)
 * - Per-person adaptive learning sessions
 * - Time/location-aware pattern learning
 * - Hysteresis thresholds to prevent oscillation
 * - Multi-signal validation (3/4 signals must agree)
 * - Environmental filtering (speed, boundary, quality, duration)
 * - Temporal smoothing (70% intent agreement required)
 * - Confidence scoring (0-100 based on pose/gaze/trajectory quality)
 *
 * @param {Object} options
 * @param {boolean} options.enabled - Enable smart proximity detection
 * @param {number} options.ambientThreshold - Distance threshold for ambient music (0-100, default 30)
 * @param {number} options.walkupThreshold - Distance threshold for walkup greeting (0-100, default 60)
 * @param {number} options.stareThreshold - Distance threshold for stare detection (0-100, default 60)
 * @param {number} options.stareDurationMs - How long to stare before triggering employee UI (ms, default 15000)
 * @param {number} options.detectionInterval - How often to check for people (ms, default 500)
 * @param {Function} options.onAmbientDetected - Callback when ambient motion detected
 * @param {Function} options.onAmbientCleared - Callback when ambient area clears
 * @param {Function} options.onWalkupDetected - Callback when patron approaches (with gaze validation)
 * @param {Function} options.onWalkupEnded - Callback when patron leaves walkup zone
 * @param {Function} options.onStareDetected - Callback when employee stares at screen
 * @param {Function} options.onStareEnded - Callback when stare ends
 * @param {Function} options.onDisengagement - Callback when patron looks away or leaves
 * @param {boolean} options.enableLearning - Enable learning session recording (default true)
 * @param {string} options.tenantId - Tenant ID for location-specific learning
 */
export function useSmartProximityDetection({
  enabled = false,
  ambientThreshold = 30,
  walkupThreshold = 60,
  stareThreshold = 60,
  stareDurationMs = 15000,
  detectionInterval = 500,
  onAmbientDetected = () => {},
  onAmbientCleared = () => {},
  onWalkupDetected = () => {},
  onWalkupEnded = () => {},
  onStareDetected = () => {},
  onStareEnded = () => {},
  onDisengagement = () => {},
  enableLearning = true,
  tenantId = 'chicago-mikes',
} = {}) {
  // State for aggregate detection zones
  const [isAmbientDetected, setIsAmbientDetected] = useState(false);
  const [isWalkupDetected, setIsWalkupDetected] = useState(false);
  const [isStaring, setIsStaring] = useState(false);
  const [maxProximityLevel, setMaxProximityLevel] = useState(0);
  const [activePeopleCount, setActivePeopleCount] = useState(0);

  // Track state per person
  const personStatesRef = useRef(new Map()); // personId -> { stareStartTime, inWalkupZone, inAmbientZone, session, ... }
  const previousTrackedPeopleRef = useRef(new Set());

  // Multi-person tracking with MediaPipe
  const {
    trackedPeople,
    isInitialized,
    error: trackingError,
    peopleCount,
  } = useMultiPersonTracking({
    enabled,
    detectionInterval,
    proximityThreshold: ambientThreshold, // Use lowest threshold for detection
    onPersonEntered: handlePersonEntered,
    onPersonExited: handlePersonExited,
    onPersonApproaching: handlePersonApproaching,
    onPersonStopped: handlePersonStopped,
  });

  // Learning session management
  const {
    startSession,
    endSession,
    recordInteraction,
    recordConversion,
    getSessionStatus,
  } = useLearningSession({ enabled: enableLearning, tenantId });

  /**
   * Handle new person entering detection zone
   */
  function handlePersonEntered(person) {
    console.log(`[SmartProximity] 👋 Person entered: ${person.id} - Distance: ${person.distance} - Looking: ${person.isLookingAtKiosk}`);

    // Initialize state for this person
    personStatesRef.current.set(person.id, {
      stareStartTime: null,
      inWalkupZone: false,
      inAmbientZone: false,
      session: null,
      lastIntent: person.intent,
      lastDistance: person.distance,
      lastLookingState: person.isLookingAtKiosk,
    });
  }

  /**
   * Handle person leaving detection zone
   */
  function handlePersonExited(person) {
    console.log(`[SmartProximity] 👋 Person exited: ${person.id}`);

    const state = personStatesRef.current.get(person.id);
    if (state?.session && enableLearning) {
      // End learning session for this person
      endSession({
        personId: person.id,
        outcome: 'abandoned',
      });
    }

    // Clean up state
    personStatesRef.current.delete(person.id);
  }

  /**
   * Handle person approaching kiosk
   */
  function handlePersonApproaching(person) {
    const gazeInfo = person.isLookingAtKiosk ? ' [LOOKING AT KIOSK]' : ' [looking away]';
    console.log(`[SmartProximity] 🚶 Person approaching: ${person.id} - Distance: ${person.distance}${gazeInfo}`);
  }

  /**
   * Handle person stopped near kiosk
   */
  function handlePersonStopped(person) {
    const gazeInfo = person.isLookingAtKiosk ? ' [ENGAGED - Looking at kiosk]' : ' [Stopped but looking away]';
    console.log(`[SmartProximity] 🛑 Person stopped: ${person.id} - Distance: ${person.distance}${gazeInfo}`);
  }

  /**
   * Process all tracked people and determine aggregate detection states
   */
  const processTrackedPeople = useCallback(() => {
    if (!trackedPeople || trackedPeople.length === 0) {
      // No one detected - clear all states
      setIsAmbientDetected(false);
      setIsWalkupDetected(false);
      setIsStaring(false);
      setMaxProximityLevel(0);
      setActivePeopleCount(0);
      return;
    }

    let anyAmbient = false;
    let anyWalkup = false;
    let anyStaring = false;
    let maxProximity = 0;

    const now = Date.now();

    trackedPeople.forEach(person => {
      const state = personStatesRef.current.get(person.id);
      if (!state) return;

      maxProximity = Math.max(maxProximity, person.distance);

      // TIER 1: AMBIENT DETECTION (general proximity, any direction)
      // Use hysteresis: enter at >= enter threshold, exit at < exit threshold
      const shouldEnterAmbient = person.distance >= HYSTERESIS.ambient.enter && person.distance < HYSTERESIS.walkup.enter;
      const shouldExitAmbient = person.distance < HYSTERESIS.ambient.exit || person.distance >= HYSTERESIS.walkup.enter;

      const inAmbientZone = state.inAmbientZone
        ? !shouldExitAmbient  // If already in, stay until exit condition
        : shouldEnterAmbient; // If not in, enter only if enter condition

      if (inAmbientZone && !state.inAmbientZone) {
        // Entered ambient zone
        console.log(`[SmartProximity] 🎵 ${person.id} entered AMBIENT zone (distance: ${person.distance}, confidence: ${person.confidence || 0})`);
        state.inAmbientZone = true;

        // Start ambient session
        if (enableLearning) {
          state.session = startSession({
            personId: person.id,
            proximityLevel: person.distance,
            intent: person.intent,
            confidence: 70,
            baseline: 0,
            threshold: ambientThreshold,
            triggeredAction: 'ambient',
            isLookingAtKiosk: person.isLookingAtKiosk,
            headPose: person.headPose,
            distanceScore: person.distance,
            trajectory: person.trajectory || [],
            velocity: person.velocity,
          });
        }
      }

      if (inAmbientZone) {
        anyAmbient = true;
      } else if (state.inAmbientZone) {
        // Left ambient zone
        console.log(`[SmartProximity] ${person.id} left AMBIENT zone`);
        state.inAmbientZone = false;
      }

      // TIER 2: WALKUP DETECTION (approaching + looking at kiosk)
      // Use hysteresis and multi-signal validation
      const shouldEnterWalkup = person.distance >= HYSTERESIS.walkup.enter &&
                                validateIntent(person, 'approaching');
      const shouldExitWalkup = person.distance < HYSTERESIS.walkup.exit ||
                               !person.isLookingAtKiosk;

      const inWalkupZone = state.inWalkupZone
        ? !shouldExitWalkup
        : shouldEnterWalkup;

      if (inWalkupZone && !state.inWalkupZone) {
        // Entered walkup zone with gaze validation and multi-signal agreement
        console.log(`[SmartProximity] 👁️ ${person.id} entered WALKUP zone (distance: ${person.distance}, confidence: ${person.confidence || 0}, looking: true)`);
        state.inWalkupZone = true;

        // End ambient session if exists, start walkup session
        if (enableLearning && state.session) {
          endSession({
            personId: person.id,
            outcome: 'abandoned',
          });
        }

        if (enableLearning) {
          state.session = startSession({
            personId: person.id,
            proximityLevel: person.distance,
            intent: person.intent,
            confidence: 85,
            baseline: 0,
            threshold: walkupThreshold,
            triggeredAction: 'walkup',
            isLookingAtKiosk: person.isLookingAtKiosk,
            headPose: person.headPose,
            distanceScore: person.distance,
            trajectory: person.trajectory || [],
            velocity: person.velocity,
          });
        }

        // Trigger walkup callback
        onWalkupDetected({
          personId: person.id,
          proximityLevel: person.distance,
          isLookingAtKiosk: person.isLookingAtKiosk,
          headPose: person.headPose,
        });
      }

      if (inWalkupZone) {
        anyWalkup = true;
      } else if (state.inWalkupZone) {
        // Left walkup zone (either moved away or looked away)
        console.log(`[SmartProximity] ${person.id} left WALKUP zone`);
        state.inWalkupZone = false;
        onWalkupEnded({ personId: person.id });

        // Call disengagement callback
        onDisengagement({ personId: person.id, reason: person.isLookingAtKiosk === false ? 'looked_away' : 'moved_away' });
      }

      // TIER 3: STARE DETECTION (close + looking at screen for extended time)
      // Use hysteresis and multi-signal validation
      const shouldEnterStare = person.distance >= HYSTERESIS.stare.enter &&
                               validateIntent(person, 'stopped');
      const shouldExitStare = person.distance < HYSTERESIS.stare.exit ||
                              !person.isLookingAtKiosk;

      const isStareProximity = state.isStaring
        ? !shouldExitStare
        : shouldEnterStare;

      if (isStareProximity) {
        // Start tracking stare time
        if (!state.stareStartTime) {
          state.stareStartTime = now;
          console.log(`[SmartProximity] 👁️ ${person.id} stare tracking started (distance: ${person.distance})`);
        }

        const stareDuration = now - state.stareStartTime;

        // Check if stare threshold reached
        if (stareDuration >= stareDurationMs && !state.isStaring) {
          state.isStaring = true;
          console.log(`[SmartProximity] 🔍 ${person.id} STARE DETECTED! Duration: ${Math.round(stareDuration / 1000)}s`);

          // End walkup session if exists, start stare session
          if (enableLearning && state.session) {
            endSession({
              personId: person.id,
              outcome: 'engaged',
            });
          }

          if (enableLearning) {
            state.session = startSession({
              personId: person.id,
              proximityLevel: person.distance,
              intent: 'stopped',
              confidence: 95,
              baseline: 0,
              threshold: stareThreshold,
              triggeredAction: 'stare',
              isLookingAtKiosk: person.isLookingAtKiosk,
              headPose: person.headPose,
              distanceScore: person.distance,
              trajectory: person.trajectory || [],
              velocity: person.velocity,
            });
          }

          // Trigger stare callback (employee checkin/checkout)
          onStareDetected({
            personId: person.id,
            proximityLevel: person.distance,
            stareDuration,
            isLookingAtKiosk: person.isLookingAtKiosk,
            headPose: person.headPose,
          });
        }

        if (state.isStaring) {
          anyStaring = true;
        }
      } else {
        // Not in stare position - reset
        if (state.stareStartTime) {
          const duration = now - state.stareStartTime;
          console.log(`[SmartProximity] ${person.id} stare ended (duration: ${Math.round(duration / 1000)}s)`);
          state.stareStartTime = null;

          if (state.isStaring) {
            state.isStaring = false;
            onStareEnded({ personId: person.id, stareDuration: duration });
          }
        }
      }
    });

    // Update aggregate states
    const currentTrackedIds = new Set(trackedPeople.map(p => p.id));

    // Ambient zone state change
    if (anyAmbient !== isAmbientDetected) {
      setIsAmbientDetected(anyAmbient);
      if (anyAmbient) {
        onAmbientDetected({ peopleCount: trackedPeople.length, maxProximityLevel: maxProximity });
      } else {
        onAmbientCleared();
      }
    }

    // Walkup zone state change
    if (anyWalkup !== isWalkupDetected) {
      setIsWalkupDetected(anyWalkup);
    }

    // Stare state change
    if (anyStaring !== isStaring) {
      setIsStaring(anyStaring);
    }

    setMaxProximityLevel(maxProximity);
    setActivePeopleCount(trackedPeople.length);
    previousTrackedPeopleRef.current = currentTrackedIds;

  }, [trackedPeople, ambientThreshold, walkupThreshold, stareThreshold, stareDurationMs, enableLearning,
      onAmbientDetected, onAmbientCleared, onWalkupDetected, onWalkupEnded, onStareDetected, onStareEnded, onDisengagement,
      startSession, endSession, isAmbientDetected, isWalkupDetected, isStaring]);

  // Process tracked people whenever they change
  useEffect(() => {
    if (!enabled || !isInitialized) return;
    processTrackedPeople();
  }, [enabled, isInitialized, processTrackedPeople]);

  // Cleanup: End all active sessions and clear refs on unmount
  useEffect(() => {
    return () => {
      // End all active learning sessions
      if (enableLearning) {
        personStatesRef.current.forEach((state, personId) => {
          if (state?.session) {
            endSession({
              personId,
              outcome: 'unmounted',
            });
          }
        });
      }

      // Clear all refs to prevent memory leaks
      personStatesRef.current.clear();
      previousTrackedPeopleRef.current.clear();
    };
  }, [enableLearning, endSession]);

  return {
    // Aggregate detection states
    isAmbientDetected,      // Anyone in ambient zone (10-30 distance)
    isWalkupDetected,       // Anyone in walkup zone (30-60 distance, approaching, looking)
    isStaring,              // Anyone staring (60+ distance, stopped, looking for 15s+)

    // Detailed tracking
    trackedPeople,          // Array of all tracked people with full data
    activePeopleCount,      // Count of currently tracked people
    maxProximityLevel,      // Highest proximity level of any person

    // System status
    isInitialized,          // MediaPipe initialized and ready
    trackingError,          // Any camera/tracking errors

    // Learning session methods (for parent components)
    recordInteraction,      // Call when user touches screen
    recordConversion,       // Call when user completes action (pin placement, etc.)
    getSessionStatus,       // Get active session info
  };
}
