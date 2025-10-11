// src/hooks/useProximityHandlers.js
import { useState, useRef, useCallback } from 'react';
import { useSmartProximityDetection } from './useSmartProximityDetection';

/**
 * Hook for managing proximity detection event handlers and learning sessions
 * Encapsulates all proximity-related callbacks and state management
 *
 * @param {Object} config - Configuration object
 * @param {Object} config.adminSettings - Admin panel settings
 * @param {Object} config.adaptiveLearning - Adaptive learning instance
 * @param {Function} config.stopAmbientMusic - Function to stop ambient music
 * @param {Object} config.ambientMusicPlayerRef - Ref to ambient music player
 * @param {Function} config.setShowAttractor - Function to show/hide attractor
 * @returns {Object} Proximity detection state and controls
 */
export function useProximityHandlers({
  adminSettings,
  adaptiveLearning,
  stopAmbientMusic,
  ambientMusicPlayerRef,
  setShowAttractor,
} = {}) {
  // Adaptive learning session tracking refs
  const currentLearningSessionRef = useRef(null);
  const sessionEngagementStartRef = useRef(null);

  // Employee checkin modal state
  const [employeeCheckinOpen, setEmployeeCheckinOpen] = useState(false);
  const [staringPerson, setStaringPerson] = useState(null);
  const [stareDuration, setStareDuration] = useState(0);

  // Proximity detection callbacks (wrapped in useCallback to prevent infinite re-renders)
  const handleProximityApproach = useCallback(({ proximityLevel }) => {
    console.log('[useProximityHandlers] Person detected approaching! Proximity:', proximityLevel);

    // Passive learning mode: log events without triggering actions
    if (adminSettings.proximityLearningModeEnabled) {
      console.log('[useProximityHandlers] 🎓 Learning mode: Walkup detected but not triggering actions. Proximity:', proximityLevel);
      return;
    }

    // Start learning session
    const session = adaptiveLearning.startSession({
      proximityLevel,
      intent: 'approaching',
      confidence: 85,
      baseline: 50,
      threshold: adminSettings.proximityThreshold || 60,
    });

    if (session) {
      currentLearningSessionRef.current = session;
      sessionEngagementStartRef.current = Date.now();
    }

    // Stop ambient music when person approaches for voice greeting (check ref instead of state)
    if (ambientMusicPlayerRef.current) {
      console.log('[useProximityHandlers] Stopping ambient music for voice greeting');
      stopAmbientMusic();
    }

    // Pause any jukebox music playing via GlobalAudioPlayer
    const globalAudio = document.querySelector('audio[data-global-audio]');
    if (globalAudio && !globalAudio.paused) {
      console.log('[useProximityHandlers] Pausing jukebox audio for voice greeting');
      globalAudio.pause();
      // Store reference so we can resume later if needed
      globalAudio.dataset.pausedForVoice = 'true';
    }

    setShowAttractor(true);
    // Voice greeting will be triggered by WalkupAttractor component
    // if adminSettings.proximityTriggerVoice && adminSettings.walkupAttractorVoiceEnabled
  }, [stopAmbientMusic, adaptiveLearning, adminSettings.proximityThreshold, adminSettings.proximityLearningModeEnabled, ambientMusicPlayerRef, setShowAttractor]);

  const handleProximityLeave = useCallback(() => {
    console.log('[useProximityHandlers] Person left walkup zone');
  }, []);

  const handleAmbientDetected = useCallback(({ proximityLevel }) => {
    console.log('[useProximityHandlers] Ambient motion detected! Proximity:', proximityLevel);

    // Passive learning mode: log events without triggering actions
    if (adminSettings.proximityLearningModeEnabled) {
      console.log('[useProximityHandlers] 🎓 Learning mode: Ambient detected but not triggering actions. Proximity:', proximityLevel);
      return;
    }

    // Start learning session for ambient
    const session = adaptiveLearning.startSession({
      proximityLevel,
      intent: 'ambient',
      confidence: 70,
      baseline: 50,
      threshold: adminSettings.ambientMusicThreshold || 95,
    });

    if (session) {
      currentLearningSessionRef.current = session;
      sessionEngagementStartRef.current = Date.now();
    }

    // DEMO: Force play ambient music (hardcoded for demo) - plays only once (check ref instead of state)
    if (!ambientMusicPlayerRef.current) {
      const audio = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
      audio.volume = 0.5;
      audio.loop = false; // Play only once, not continuously
      audio.play();
      // Auto-cleanup when song ends
      audio.addEventListener('ended', () => {
        ambientMusicPlayerRef.current = null;
        console.log('[useProximityHandlers] Ambient music ended');
      });
      ambientMusicPlayerRef.current = audio;
      console.log('[useProximityHandlers] DEMO - Ambient music started (will play once)');
    }
  }, [adaptiveLearning, adminSettings.ambientMusicThreshold, adminSettings.proximityLearningModeEnabled, ambientMusicPlayerRef]);

  const handleAmbientCleared = useCallback(() => {
    console.log('[useProximityHandlers] Ambient area cleared');
    // Fade out or stop ambient music after idle timeout (check ref instead of state)
    if (adminSettings.ambientMusicEnabled && ambientMusicPlayerRef.current) {
      stopAmbientMusic();
    }
  }, [adminSettings.ambientMusicEnabled, stopAmbientMusic, ambientMusicPlayerRef]);

  const handleStareDetected = useCallback(({ personId, proximityLevel, stareDuration, isLookingAtKiosk, headPose }) => {
    console.log('[useProximityHandlers] 🔍 Stare detected! Person:', personId, 'Proximity:', proximityLevel, 'Duration:', Math.round(stareDuration / 1000), 's', 'Looking:', isLookingAtKiosk);

    // Update stare duration state
    setStareDuration(stareDuration);

    // Passive learning mode: log events without triggering actions
    if (adminSettings.proximityLearningModeEnabled) {
      console.log('[useProximityHandlers] 🎓 Learning mode: Stare detected but not triggering actions. Duration:', Math.round(stareDuration / 1000), 's');
      return;
    }

    // Only open employee checkin modal if enabled in admin settings
    if (adminSettings.employeeCheckinEnabled) {
      setStaringPerson({ personId, proximityLevel, stareDuration, isLookingAtKiosk, headPose });
      setEmployeeCheckinOpen(true);
    } else {
      console.log('[useProximityHandlers] Employee checkin disabled in admin settings - ignoring stare detection');
    }
  }, [adminSettings.employeeCheckinEnabled, adminSettings.proximityLearningModeEnabled]);

  const handleStareEnded = useCallback(({ personId, stareDuration }) => {
    console.log('[useProximityHandlers] Stare ended. Person:', personId, 'Duration:', Math.round(stareDuration / 1000), 's');
    // Clear stare duration
    setStareDuration(0);
    // Keep modal open even if they look away briefly
  }, []);

  const handleDisengagement = useCallback(({ personId, reason }) => {
    console.log('[useProximityHandlers] Patron disengaged. Person:', personId, 'Reason:', reason);
    // Return to main attractor screen if no one else is engaged
  }, []);

  // Smart Proximity Detection - Multi-person tracking with gaze validation
  const {
    isAmbientDetected,
    isWalkupDetected,
    isStaring,
    trackedPeople,
    activePeopleCount,
    maxProximityLevel,
    isInitialized,
    trackingError,
    recordInteraction,
    recordConversion,
  } = useSmartProximityDetection({
    enabled: adminSettings.proximityDetectionEnabled,
    ambientThreshold: adminSettings.ambientMusicThreshold || 30,
    walkupThreshold: adminSettings.proximityThreshold || 60,
    stareThreshold: adminSettings.stareThreshold || 90,
    stareDurationMs: adminSettings.stareDurationMs || 30000,
    detectionInterval: adminSettings.proximityDetectionInterval || 500,
    onAmbientDetected: handleAmbientDetected,
    onAmbientCleared: handleAmbientCleared,
    onWalkupDetected: handleProximityApproach,
    onWalkupEnded: handleProximityLeave,
    onStareDetected: handleStareDetected,
    onStareEnded: handleStareEnded,
    onDisengagement: handleDisengagement,
    enableLearning: adminSettings.proximityLearningEnabled !== false,
    tenantId: adminSettings.tenantId || 'chicago-mikes',
  });

  // Compatibility: map new variables to old names for components that haven't been updated yet
  const isPersonDetected = isWalkupDetected;
  const proximityLevel = maxProximityLevel;
  const cameraError = trackingError;

  // Record conversion in learning session
  const recordLearningConversion = useCallback(() => {
    if (currentLearningSessionRef.current) {
      const engagementDuration = sessionEngagementStartRef.current
        ? Date.now() - sessionEngagementStartRef.current
        : 0;

      adaptiveLearning.endSession({
        outcome: 'converted',
        engagedDurationMs: engagementDuration,
        converted: true,
      });

      currentLearningSessionRef.current = null;
      sessionEngagementStartRef.current = null;
    }
  }, [adaptiveLearning]);

  // Record abandonment in learning session
  const recordLearningAbandonment = useCallback(() => {
    if (currentLearningSessionRef.current) {
      adaptiveLearning.endSession({
        outcome: 'abandoned',
        engagedDurationMs: 0,
        converted: false,
      });

      currentLearningSessionRef.current = null;
      sessionEngagementStartRef.current = null;
    }
  }, [adaptiveLearning]);

  return {
    // Detection state
    isAmbientDetected,
    isWalkupDetected,
    isStaring,
    trackedPeople,
    activePeopleCount,
    maxProximityLevel,
    isInitialized,
    trackingError,

    // Compatibility (legacy names)
    isPersonDetected,
    proximityLevel,
    cameraError,

    // Employee checkin
    employeeCheckinOpen,
    setEmployeeCheckinOpen,
    staringPerson,
    setStaringPerson,
    stareDuration,

    // Learning session
    recordLearningConversion,
    recordLearningAbandonment,

    // Interaction tracking
    recordInteraction,
    recordConversion,
  };
}
