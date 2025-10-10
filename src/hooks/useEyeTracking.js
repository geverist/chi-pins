// src/hooks/useEyeTracking.js
import { useEffect, useRef, useState } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

/**
 * useEyeTracking - Lightweight eye tracking using MediaPipe Face Mesh
 *
 * Returns gaze direction to boost engagement scoring in proximity detection
 *
 * Gaze states:
 * - 'looking-at-screen': Eyes directed at screen (engagement boost: +20%)
 * - 'looking-away': Eyes directed away (engagement penalty: -30%)
 * - 'unknown': Face detected but gaze unclear (neutral: 0%)
 * - null: No face detected
 */
export function useEyeTracking({ enabled = false, fps = 10 } = {}) {
  const [gazeDirection, setGazeDirection] = useState(null);
  const [gazeConfidence, setGazeConfidence] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const faceMeshRef = useRef(null);
  const cameraRef = useRef(null);
  const lastProcessTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      // Clean up if disabled
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
        faceMeshRef.current = null;
      }
      return;
    }

    let mounted = true;

    const initEyeTracking = async () => {
      try {
        // Create hidden video element for camera feed
        if (!videoRef.current) {
          videoRef.current = document.createElement('video');
          videoRef.current.style.display = 'none';
          videoRef.current.width = 320; // Low res for performance
          videoRef.current.height = 240;
          document.body.appendChild(videoRef.current);
        }

        // Initialize MediaPipe Face Mesh
        faceMeshRef.current = new FaceMesh({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
          }
        });

        faceMeshRef.current.setOptions({
          maxNumFaces: 1, // Only track one face for performance
          refineLandmarks: true, // Enable iris tracking
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMeshRef.current.onResults((results) => {
          if (!mounted) return;

          // Throttle to target FPS
          const now = Date.now();
          const targetInterval = 1000 / fps;
          if (now - lastProcessTimeRef.current < targetInterval) {
            return;
          }
          lastProcessTimeRef.current = now;

          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            setFaceDetected(true);

            // Calculate gaze direction using iris landmarks
            const gaze = calculateGazeDirection(landmarks);
            setGazeDirection(gaze.direction);
            setGazeConfidence(gaze.confidence);

            console.log(`[EyeTracking] Gaze: ${gaze.direction} (${Math.round(gaze.confidence)}% confidence)`);
          } else {
            setFaceDetected(false);
            setGazeDirection(null);
            setGazeConfidence(0);
          }
        });

        // Start camera
        cameraRef.current = new Camera(videoRef.current, {
          onFrame: async () => {
            if (faceMeshRef.current && mounted) {
              await faceMeshRef.current.send({ image: videoRef.current });
            }
          },
          width: 320,
          height: 240,
          facingMode: 'user', // Front-facing camera
        });

        await cameraRef.current.start();
        console.log('[EyeTracking] Eye tracking initialized successfully');

      } catch (err) {
        console.error('[EyeTracking] Failed to initialize:', err);
        setGazeDirection(null);
        setGazeConfidence(0);
        setFaceDetected(false);
      }
    };

    initEyeTracking();

    // Cleanup
    return () => {
      mounted = false;
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
      }
      if (videoRef.current && videoRef.current.parentNode) {
        videoRef.current.parentNode.removeChild(videoRef.current);
      }
    };
  }, [enabled, fps]);

  return {
    gazeDirection, // 'looking-at-screen' | 'looking-away' | 'unknown' | null
    gazeConfidence, // 0-100
    faceDetected,
  };
}

/**
 * Calculate gaze direction from face landmarks
 * Uses iris position relative to eye corners to determine where user is looking
 */
function calculateGazeDirection(landmarks) {
  // MediaPipe Face Mesh landmark indices
  // Left eye: outer corner (33), inner corner (133), iris center (468)
  // Right eye: outer corner (263), inner corner (362), iris center (473)

  const leftEyeOuter = landmarks[33];
  const leftEyeInner = landmarks[133];
  const leftIris = landmarks[468];

  const rightEyeOuter = landmarks[263];
  const rightEyeInner = landmarks[362];
  const rightIris = landmarks[473];

  // Calculate horizontal position of iris relative to eye width
  // 0.0 = far left, 0.5 = center, 1.0 = far right
  const leftEyeWidth = Math.abs(leftEyeOuter.x - leftEyeInner.x);
  const leftIrisPos = (leftIris.x - leftEyeInner.x) / leftEyeWidth;

  const rightEyeWidth = Math.abs(rightEyeOuter.x - rightEyeInner.x);
  const rightIrisPos = (rightIris.x - rightEyeInner.x) / rightEyeWidth;

  // Average both eyes
  const avgIrisPos = (leftIrisPos + rightIrisPos) / 2;

  // Determine gaze direction
  // Looking at screen: iris centered (0.35 - 0.65)
  // Looking away: iris to sides (<0.25 or >0.75)

  let direction;
  let confidence;

  if (avgIrisPos >= 0.35 && avgIrisPos <= 0.65) {
    direction = 'looking-at-screen';
    // Higher confidence when iris is more centered
    const centeredness = 1 - Math.abs(avgIrisPos - 0.5) * 2;
    confidence = centeredness * 100;
  } else if (avgIrisPos < 0.25 || avgIrisPos > 0.75) {
    direction = 'looking-away';
    // Higher confidence when iris is further from center
    const awayness = Math.abs(avgIrisPos - 0.5) * 2 - 0.5;
    confidence = Math.max(0, Math.min(100, awayness * 100));
  } else {
    direction = 'unknown';
    confidence = 50; // Moderate confidence for ambiguous cases
  }

  return { direction, confidence };
}

/**
 * Calculate engagement boost based on gaze direction
 * Used by proximity detection to adjust confidence scores
 */
export function getGazeEngagementBoost(gazeDirection, gazeConfidence) {
  if (!gazeDirection || gazeConfidence < 30) {
    return 0; // No boost if no gaze data or low confidence
  }

  const confidenceMultiplier = gazeConfidence / 100;

  switch (gazeDirection) {
    case 'looking-at-screen':
      return 20 * confidenceMultiplier; // +20% engagement boost
    case 'looking-away':
      return -30 * confidenceMultiplier; // -30% engagement penalty
    case 'unknown':
    default:
      return 0; // Neutral
  }
}
