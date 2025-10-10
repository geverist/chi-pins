// src/hooks/useProximityDetection.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLearningSession } from './useLearningSession';

/**
 * useProximityDetection - Detects when someone approaches the kiosk using front camera
 *
 * Uses simple motion detection (pixel difference) to avoid heavy TensorFlow.js dependency.
 * Can be upgraded to face detection later if needed.
 *
 * @param {Object} options
 * @param {boolean} options.enabled - Enable proximity detection
 * @param {number} options.sensitivityThreshold - Motion sensitivity (0-100, default 15)
 * @param {number} options.proximityThreshold - How close someone needs to be for walkup (0-100, default 30)
 * @param {number} options.ambientThreshold - Distance threshold for ambient detection (0-100, default 15)
 * @param {number} options.stareThreshold - Proximity level for stare detection (0-100, default 40 - closer than walkup)
 * @param {number} options.stareDurationMs - How long to stare before triggering (ms, default 3000)
 * @param {number} options.detectionInterval - How often to check (ms, default 500)
 * @param {Function} options.onApproach - Callback when someone approaches (walkup range)
 * @param {Function} options.onLeave - Callback when someone leaves (walkup range)
 * @param {Function} options.onAmbientDetected - Callback when motion detected in ambient range
 * @param {Function} options.onAmbientCleared - Callback when ambient area clears
 * @param {Function} options.onStareDetected - Callback when someone stares at screen (prolonged close presence)
 * @param {Function} options.onStareEnded - Callback when stare ends
 * @param {boolean} options.enableLearning - Enable learning session recording (default true)
 * @param {string} options.tenantId - Tenant ID for session recording
 */
export function useProximityDetection({
  enabled = false,
  sensitivityThreshold = 15,
  proximityThreshold = 30,
  ambientThreshold = 15,
  stareThreshold = 40,
  stareDurationMs = 3000,
  detectionInterval = 500,
  onApproach = () => {},
  onLeave = () => {},
  onAmbientDetected = () => {},
  onAmbientCleared = () => {},
  onStareDetected = () => {},
  onStareEnded = () => {},
  enableLearning = true,
  tenantId = 'chicago-mikes',
} = {}) {
  const [isPersonDetected, setIsPersonDetected] = useState(false); // Walkup range
  const [isAmbientDetected, setIsAmbientDetected] = useState(false); // Ambient range
  const [isStaring, setIsStaring] = useState(false); // Prolonged close presence
  const [stareDuration, setStareDuration] = useState(0); // How long they've been staring (ms)
  const [proximityLevel, setProximityLevel] = useState(0); // 0-100
  const [cameraError, setCameraError] = useState(null);
  const [videoReady, setVideoReady] = useState(false); // Track when video is ready for detection

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const previousFrameRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const streamRef = useRef(null);
  const wasPersonDetectedRef = useRef(false); // Walkup range
  const wasAmbientDetectedRef = useRef(false); // Ambient range
  const wasStaringRef = useRef(false); // Stare detection
  const stareStartTimeRef = useRef(null); // When stare started
  const frameCountRef = useRef(0); // For periodic logging

  // Learning session hook
  const {
    startSession,
    endSession,
    recordInteraction,
    recordConversion,
    getSessionStatus,
  } = useLearningSession({ enabled: enableLearning, tenantId });

  // Initialize camera
  const initCamera = useCallback(async () => {
    console.log('[ProximityDetection] 🔍 initCamera called, enabled:', enabled);

    if (!enabled) {
      console.log('[ProximityDetection] Skipping camera init - proximity detection disabled');
      return;
    }

    console.log('[ProximityDetection] 🚀 Starting camera initialization...');
    console.log('[ProximityDetection] navigator.mediaDevices:', !!navigator.mediaDevices);
    console.log('[ProximityDetection] getUserMedia:', !!navigator.mediaDevices?.getUserMedia);

    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      console.log('[ProximityDetection] ✅ getUserMedia is available');
      console.log('[ProximityDetection] 📸 Requesting camera access...');

      // Request front-facing camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Front camera
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      console.log('[ProximityDetection] ✅ Camera access granted, stream obtained:', !!stream);
      console.log('[ProximityDetection] Stream tracks:', stream?.getTracks?.().length);

      streamRef.current = stream;

      // Create video element if it doesn't exist
      if (!videoRef.current) {
        console.log('[ProximityDetection] 📹 Creating video element...');
        videoRef.current = document.createElement('video');
        videoRef.current.autoplay = true;
        videoRef.current.playsInline = true;
        console.log('[ProximityDetection] Video element created');
      } else {
        console.log('[ProximityDetection] Video element already exists');
      }

      console.log('[ProximityDetection] 🔗 Attaching stream to video element...');
      videoRef.current.srcObject = stream;
      console.log('[ProximityDetection] Stream attached to video element');

      console.log('[ProximityDetection] ▶️  Starting video playback...');
      await videoRef.current.play();
      console.log('[ProximityDetection] ✅ Video playback started, readyState:', videoRef.current.readyState);

      // Create canvas for frame analysis
      if (!canvasRef.current) {
        console.log('[ProximityDetection] 🎨 Creating canvas for frame analysis...');
        canvasRef.current = document.createElement('canvas');
        canvasRef.current.width = 640;
        canvasRef.current.height = 480;
        console.log('[ProximityDetection] Canvas created: 640x480');
      } else {
        console.log('[ProximityDetection] Canvas already exists');
      }

      setCameraError(null);
      setVideoReady(true); // Signal that video is ready for detection loop
      console.log('[ProximityDetection] ✅✅✅ Camera initialized successfully - ready for motion detection');
    } catch (error) {
      console.error('[ProximityDetection] ❌ Camera initialization failed:', error);
      console.error('[ProximityDetection] Error name:', error.name);
      console.error('[ProximityDetection] Error message:', error.message);
      console.error('[ProximityDetection] Error stack:', error.stack);
      setCameraError(error.message);
    }
  }, [enabled]);

  // Analyze frame for motion/presence
  const analyzeFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== 4) {
      return;
    }

    frameCountRef.current++;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    // Draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const currentPixels = currentImageData.data;

    // Compare with previous frame
    if (previousFrameRef.current) {
      const prevPixels = previousFrameRef.current;
      let totalDifference = 0;
      let significantPixels = 0;
      const pixelCount = currentPixels.length / 4;

      // Calculate pixel differences (check every 4th pixel for performance)
      for (let i = 0; i < currentPixels.length; i += 16) {
        const rDiff = Math.abs(currentPixels[i] - prevPixels[i]);
        const gDiff = Math.abs(currentPixels[i + 1] - prevPixels[i + 1]);
        const bDiff = Math.abs(currentPixels[i + 2] - prevPixels[i + 2]);
        const avgDiff = (rDiff + gDiff + bDiff) / 3;

        totalDifference += avgDiff;
        if (avgDiff > sensitivityThreshold) {
          significantPixels++;
        }
      }

      // Calculate motion score (0-100)
      const motionScore = Math.min(100, (significantPixels / (pixelCount / 4)) * 100);

      // Calculate brightness (to detect if someone is close/blocking light)
      let totalBrightness = 0;
      for (let i = 0; i < currentPixels.length; i += 16) {
        const brightness = (currentPixels[i] + currentPixels[i + 1] + currentPixels[i + 2]) / 3;
        totalBrightness += brightness;
      }
      const avgBrightness = totalBrightness / (currentPixels.length / 4);

      // Proximity level based on motion + brightness change
      const brightnessChange = Math.abs(avgBrightness - 128);
      const proximity = Math.min(100, motionScore + (brightnessChange / 2));

      setProximityLevel(Math.round(proximity));

      // Log every 20 frames (every ~10 seconds at 500ms interval) to show it's working
      if (frameCountRef.current % 20 === 0) {
        console.log(`[ProximityDetection] Frame #${frameCountRef.current} - Proximity: ${Math.round(proximity)}, Motion: ${Math.round(motionScore)}, Brightness: ${Math.round(avgBrightness)}`);
      }

      // Three-tier detection:
      // 1. Ambient detection (longer range, lower threshold) - for music
      // 2. Walkup detection (closer range, higher threshold) - for greeting
      // 3. Stare detection (very close, prolonged presence) - for employee clock-in, etc.
      const ambientDetected = proximity > ambientThreshold;
      const personDetected = proximity > proximityThreshold;
      const isStareProximity = proximity > stareThreshold;

      // Handle ambient detection (music trigger)
      if (ambientDetected !== wasAmbientDetectedRef.current) {
        wasAmbientDetectedRef.current = ambientDetected;
        setIsAmbientDetected(ambientDetected);

        if (ambientDetected) {
          console.log('[ProximityDetection] Ambient motion detected! Proximity:', Math.round(proximity));

          // Start learning session for ambient detection
          if (enableLearning) {
            startSession({
              proximityLevel: Math.round(proximity),
              intent: 'ambient',
              confidence: Math.round(motionScore),
              baseline: 0,
              threshold: ambientThreshold,
              triggeredAction: 'ambient',
            });
          }

          onAmbientDetected({ proximityLevel: Math.round(proximity) });
        } else {
          console.log('[ProximityDetection] Ambient area cleared');

          // End session when they leave ambient range
          if (enableLearning && !personDetected) {
            endSession({ outcome: 'abandoned' });
          }

          onAmbientCleared();
        }
      }

      // Handle walkup detection (greeting trigger)
      if (personDetected !== wasPersonDetectedRef.current) {
        wasPersonDetectedRef.current = personDetected;
        setIsPersonDetected(personDetected);

        if (personDetected) {
          console.log('[ProximityDetection] Person approaching! Proximity:', Math.round(proximity));

          // Start learning session for walkup detection
          if (enableLearning) {
            startSession({
              proximityLevel: Math.round(proximity),
              intent: 'approaching',
              confidence: Math.round(motionScore),
              baseline: 0,
              threshold: proximityThreshold,
              triggeredAction: 'walkup',
            });
          }

          onApproach({ proximityLevel: Math.round(proximity) });
        } else {
          console.log('[ProximityDetection] Person left walkup zone');

          // End session when they leave walkup range
          if (enableLearning) {
            endSession({ outcome: 'abandoned' });
          }

          onLeave();
        }
      }

      // Handle stare detection (prolonged close presence)
      if (isStareProximity) {
        // Start tracking stare time if not already tracking
        if (!stareStartTimeRef.current) {
          stareStartTimeRef.current = Date.now();
          console.log('[ProximityDetection] Stare tracking started - person is very close');
        }

        // Calculate how long they've been staring
        const duration = Date.now() - stareStartTimeRef.current;
        setStareDuration(duration);

        // Check if stare threshold reached
        if (duration >= stareDurationMs && !wasStaringRef.current) {
          wasStaringRef.current = true;
          setIsStaring(true);
          console.log('[ProximityDetection] Stare detected! Duration:', duration, 'ms');

          // Start learning session for stare detection (more engaged)
          if (enableLearning) {
            startSession({
              proximityLevel: Math.round(proximity),
              intent: 'stopped',
              confidence: Math.round(motionScore),
              baseline: 0,
              threshold: stareThreshold,
              triggeredAction: 'stare',
            });
          }

          onStareDetected({ proximityLevel: Math.round(proximity), stareDuration: duration });
        }
      } else {
        // Not close enough for stare - reset tracking
        if (stareStartTimeRef.current) {
          const duration = Date.now() - stareStartTimeRef.current;
          console.log('[ProximityDetection] Stare ended. Duration was:', duration, 'ms');
          stareStartTimeRef.current = null;
          setStareDuration(0);

          if (wasStaringRef.current) {
            wasStaringRef.current = false;
            setIsStaring(false);
            onStareEnded({ stareDuration: duration });
          }
        }
      }
    }

    // Store current frame for next comparison
    previousFrameRef.current = new Uint8ClampedArray(currentPixels);
  }, [sensitivityThreshold, proximityThreshold, ambientThreshold, stareThreshold, stareDurationMs, onApproach, onLeave, onAmbientDetected, onAmbientCleared, onStareDetected, onStareEnded]);

  // Start/stop detection loop
  useEffect(() => {
    if (!enabled || !videoReady) {
      if (detectionIntervalRef.current) {
        console.log('[ProximityDetection] Stopping detection loop');
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      return;
    }

    // Start detection loop
    console.log(`[ProximityDetection] Starting detection loop (interval: ${detectionInterval}ms)`);
    detectionIntervalRef.current = setInterval(analyzeFrame, detectionInterval);

    return () => {
      if (detectionIntervalRef.current) {
        console.log('[ProximityDetection] Cleaning up detection loop');
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [enabled, videoReady, analyzeFrame, detectionInterval]);

  // Initialize and cleanup camera
  useEffect(() => {
    if (enabled) {
      console.log('[ProximityDetection] Hook mounted - initializing camera');
      initCamera();
    } else {
      console.log('[ProximityDetection] Hook mounted but proximity detection is disabled');
    }

    return () => {
      // Cleanup
      console.log('[ProximityDetection] Cleaning up proximity detection');
      if (streamRef.current) {
        console.log('[ProximityDetection] Stopping camera stream');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      previousFrameRef.current = null;
      wasPersonDetectedRef.current = false;
      wasAmbientDetectedRef.current = false;
      wasStaringRef.current = false;
      stareStartTimeRef.current = null;
    };
  }, [enabled, initCamera]);

  return {
    isPersonDetected,      // Close range (walkup greeting)
    isAmbientDetected,     // Long range (ambient music)
    isStaring,             // Very close + prolonged (stare detection)
    stareDuration,         // How long they've been staring (ms)
    proximityLevel,
    cameraError,
    hasCamera: !!videoRef.current,
    // Learning session methods (for parent components to record interactions)
    recordInteraction,     // Call when user interacts (touches screen, makes selection)
    recordConversion,      // Call when user completes an action (places pin, etc.)
    getSessionStatus,      // Get current session info
  };
}
