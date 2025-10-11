// src/hooks/useMultiPersonTracking.js
// Multi-person detection and tracking using MediaPipe Pose Detection
// Tracks multiple individuals simultaneously with trajectory analysis
// Includes gaze detection to determine who is looking at the kiosk

import { useState, useEffect, useRef, useCallback } from 'react';
import { PoseLandmarker, FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

/**
 * Calculate Euclidean distance between two points
 */
function calculateDistance(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Estimate distance from camera based on pose landmarks
 * Uses shoulder width as reference (average ~46cm in real world)
 */
function estimateDistanceFromPose(landmarks) {
  if (!landmarks || landmarks.length < 12) return null;

  // Get shoulder landmarks (11 = left shoulder, 12 = right shoulder)
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  if (!leftShoulder || !rightShoulder) return null;

  // Calculate shoulder width in normalized coordinates (0-1)
  const shoulderWidth = calculateDistance(leftShoulder, rightShoulder);

  // Estimate distance (inverse relationship - closer = larger shoulder width)
  // Scale to 0-100 where 100 = very close, 0 = far away
  const distanceScore = Math.min(100, (shoulderWidth * 200)); // Empirical scaling

  return {
    score: Math.round(distanceScore),
    shoulderWidth,
    confidence: Math.min(leftShoulder.visibility || 0, rightShoulder.visibility || 0),
  };
}

/**
 * Calculate center point of person from pose landmarks
 */
function calculatePersonCenter(landmarks) {
  if (!landmarks || landmarks.length === 0) return { x: 0.5, y: 0.5 };

  // Use torso center (average of shoulders and hips)
  const leftShoulder = landmarks[11] || landmarks[0];
  const rightShoulder = landmarks[12] || landmarks[0];

  return {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
  };
}

/**
 * Calculate head pose from face landmarks
 * Returns yaw (left/right), pitch (up/down), roll (tilt)
 */
function calculateHeadPose(faceLandmarks) {
  if (!faceLandmarks || faceLandmarks.length === 0) return null;

  // Key face landmarks for head pose estimation
  // 1 = nose tip, 33 = left eye outer, 263 = right eye outer
  // 61 = left mouth corner, 291 = right mouth corner
  const noseTip = faceLandmarks[1];
  const leftEye = faceLandmarks[33];
  const rightEye = faceLandmarks[263];
  const leftMouth = faceLandmarks[61];
  const rightMouth = faceLandmarks[291];

  if (!noseTip || !leftEye || !rightEye) return null;

  // Calculate yaw (left/right rotation) from nose position relative to eye center
  const eyeCenterX = (leftEye.x + rightEye.x) / 2;
  const noseOffset = noseTip.x - eyeCenterX;
  const eyeDistance = Math.abs(leftEye.x - rightEye.x);
  const yaw = eyeDistance > 0 ? (noseOffset / eyeDistance) * 90 : 0; // -90 to +90 degrees

  // Calculate pitch (up/down rotation) from nose Y relative to eye center
  const eyeCenterY = (leftEye.y + rightEye.y) / 2;
  const nosePitchOffset = noseTip.y - eyeCenterY;
  const pitch = nosePitchOffset * 100; // Approximate pitch angle

  // Calculate roll (tilt) from eye alignment
  const eyeDeltaY = rightEye.y - leftEye.y;
  const eyeDeltaX = rightEye.x - leftEye.x;
  const roll = eyeDeltaX !== 0 ? Math.atan2(eyeDeltaY, eyeDeltaX) * (180 / Math.PI) : 0;

  return {
    yaw: Math.round(yaw),
    pitch: Math.round(pitch),
    roll: Math.round(roll),
  };
}

/**
 * Determine if person is looking at the kiosk based on head pose
 * Returns true if face is oriented toward camera
 */
function isLookingAtCamera(headPose) {
  if (!headPose) return false;

  // Looking at camera if:
  // - Yaw (left/right) is within ±35 degrees of center
  // - Pitch (up/down) is within ±25 degrees of center
  const yawThreshold = 35;
  const pitchThreshold = 25;

  return (
    Math.abs(headPose.yaw) <= yawThreshold &&
    Math.abs(headPose.pitch) <= pitchThreshold
  );
}

/**
 * Calculate confidence score (0-100) for person detection
 * Based on pose quality, gaze detection, trajectory consistency, and distance reliability
 */
function calculateConfidence(person) {
  let confidence = 0;

  // Pose detection quality (0-30 points)
  const avgVisibility = person.landmarks
    ? person.landmarks.reduce((sum, lm) => sum + (lm.visibility || 0), 0) / person.landmarks.length
    : 0;
  confidence += avgVisibility * 30;

  // Gaze detection quality (0-30 points)
  if (person.headPose && person.isLookingAtKiosk) {
    confidence += person.gazeConfidence * 30;
  }

  // Trajectory consistency (0-20 points)
  if (person.trajectory && person.trajectory.length > 5) {
    // Calculate straightness of trajectory
    const traj = person.trajectory.slice(-10); // Last 10 points
    const startPoint = traj[0];
    const endPoint = traj[traj.length - 1];
    const directDistance = Math.sqrt(
      Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2)
    );

    let pathLength = 0;
    for (let i = 1; i < traj.length; i++) {
      pathLength += Math.sqrt(
        Math.pow(traj[i].x - traj[i - 1].x, 2) + Math.pow(traj[i].y - traj[i - 1].y, 2)
      );
    }

    const consistency = pathLength > 0 ? directDistance / pathLength : 0;
    confidence += consistency * 20;
  }

  // Distance reliability (0-20 points)
  // Most reliable between 20-200 distance
  if (person.distance > 20 && person.distance < 200) {
    confidence += 20;
  } else if (person.distance >= 10 && person.distance <= 300) {
    confidence += 10;
  }

  return Math.min(100, Math.round(confidence));
}

/**
 * Environmental context filters to prevent false positives
 */
const environmentalFilters = {
  // Ignore very fast movement (likely passing by)
  speedFilter: (velocity) => {
    const speed = Math.sqrt(Math.pow(velocity.x || 0, 2) + Math.pow(velocity.y || 0, 2));
    return speed < 0.8; // Ignore if moving > 0.8 units/sec
  },

  // Ignore edge cases (people at screen edges)
  boundaryFilter: (position) => {
    return position.x > 0.1 && position.x < 0.9 && position.y > 0.1 && position.y < 0.9;
  },

  // Ignore low-quality detections
  qualityFilter: (person) => {
    const avgVisibility = person.landmarks
      ? person.landmarks.reduce((sum, lm) => sum + (lm.visibility || 0), 0) / person.landmarks.length
      : 0;
    return avgVisibility > 0.6;
  },

  // Ignore very brief appearances (< 1 second)
  durationFilter: (person) => {
    const duration = Date.now() - (person.firstSeen || Date.now());
    return duration >= 1000;
  },
};

/**
 * Dead zone detection - identify common false positive patterns
 */
function isDeadZone(person) {
  // Ignore people in "passing lane" (e.g., left 20% of screen)
  if (person.lastPosition && person.lastPosition.x < 0.2) {
    return true;
  }

  // Ignore very brief appearances (<1 second)
  const trackingDuration = Date.now() - (person.firstSeen || Date.now());
  if (trackingDuration < 1000) {
    return true;
  }

  // Ignore people who never slow down (still accelerating)
  if (person.trajectory && person.trajectory.length > 5) {
    const avgSpeed = person.trajectory.reduce((sum, t) => {
      const vel = t.velocity || person.velocity;
      return sum + Math.sqrt(Math.pow(vel?.x || 0, 2) + Math.pow(vel?.y || 0, 2));
    }, 0) / person.trajectory.length;

    const currentSpeed = Math.sqrt(Math.pow(person.velocity?.x || 0, 2) + Math.pow(person.velocity?.y || 0, 2));

    if (currentSpeed > avgSpeed * 1.2) {
      return true; // Still accelerating
    }
  }

  return false;
}

/**
 * Track person across frames using position and appearance matching
 */
class PersonTracker {
  constructor() {
    this.trackedPeople = new Map(); // personId -> person data
    this.nextId = 1;
    this.maxFramesLost = 15; // Remove person after 15 frames without detection
    this.intentHistorySize = 10; // Number of intent predictions to keep for smoothing
  }

  /**
   * Update tracking with new detections
   */
  update(detections, faceDetections = []) {
    const currentTime = Date.now();
    const matched = new Set();

    // Age existing tracks
    for (const [id, person] of this.trackedPeople.entries()) {
      person.framesLost++;

      // Remove stale tracks
      if (person.framesLost > this.maxFramesLost) {
        this.trackedPeople.delete(id);
      }
    }

    // Match detections to existing tracks
    detections.forEach(detection => {
      const center = calculatePersonCenter(detection.landmarks);
      let bestMatch = null;
      let bestDistance = Infinity;

      // Find closest existing person
      for (const [id, person] of this.trackedPeople.entries()) {
        if (matched.has(id)) continue;

        const distance = calculateDistance(center, person.lastPosition);

        // Match if within reasonable distance (0.2 = 20% of frame)
        if (distance < 0.2 && distance < bestDistance) {
          bestMatch = id;
          bestDistance = distance;
        }
      }

      // Try to match face detection to this pose
      const matchedFace = this.matchFaceToPose(center, faceDetections);

      if (bestMatch) {
        // Update existing person
        this.updatePerson(bestMatch, detection, center, currentTime, matchedFace);
        matched.add(bestMatch);
      } else {
        // New person detected
        this.addPerson(detection, center, currentTime, matchedFace);
      }
    });

    return Array.from(this.trackedPeople.values());
  }

  /**
   * Match face detection to pose based on proximity
   */
  matchFaceToPose(poseCenter, faceDetections) {
    if (!faceDetections || faceDetections.length === 0) return null;

    let bestMatch = null;
    let bestDistance = Infinity;

    faceDetections.forEach(face => {
      // Calculate face center from landmarks
      if (!face.landmarks || face.landmarks.length === 0) return;

      const noseTip = face.landmarks[1];
      if (!noseTip) return;

      const distance = calculateDistance(poseCenter, { x: noseTip.x, y: noseTip.y });

      // Match if face is close to pose (within 0.15 = 15% of frame)
      if (distance < 0.15 && distance < bestDistance) {
        bestMatch = face;
        bestDistance = distance;
      }
    });

    return bestMatch;
  }

  /**
   * Add new person to tracking
   */
  addPerson(detection, center, timestamp, faceData = null) {
    const personId = `person-${this.nextId++}`;
    const distance = estimateDistanceFromPose(detection.landmarks);

    const newPerson = {
      id: personId,
      firstSeen: timestamp,
      lastSeen: timestamp,
      lastPosition: center,
      trajectory: [{ x: center.x, y: center.y, timestamp, distance: distance?.score || 0, velocity: { x: 0, y: 0 } }],
      distance: distance?.score || 0,
      velocity: { x: 0, y: 0 },
      intent: 'unknown',
      intentHistory: [], // For temporal smoothing
      confidence: 0,
      framesLost: 0,
      landmarks: detection.landmarks,
      // Gaze tracking data
      headPose: faceData?.headPose || null,
      isLookingAtKiosk: faceData?.isLookingAtKiosk || false,
      gazeConfidence: faceData?.confidence || 0,
    };

    // Calculate initial confidence
    newPerson.confidence = calculateConfidence(newPerson);

    this.trackedPeople.set(personId, newPerson);
  }

  /**
   * Update existing person
   */
  updatePerson(personId, detection, center, timestamp, faceData = null) {
    const person = this.trackedPeople.get(personId);
    const distance = estimateDistanceFromPose(detection.landmarks);

    // Calculate velocity (normalized per second)
    const timeDelta = (timestamp - person.lastSeen) / 1000; // seconds
    if (timeDelta > 0) {
      person.velocity = {
        x: (center.x - person.lastPosition.x) / timeDelta,
        y: (center.y - person.lastPosition.y) / timeDelta,
      };
    }

    // Update trajectory (keep last 30 points)
    person.trajectory.push({
      x: center.x,
      y: center.y,
      timestamp,
      distance: distance?.score || 0,
      velocity: { ...person.velocity },
    });
    if (person.trajectory.length > 30) {
      person.trajectory.shift();
    }

    // Predict intent from trajectory (raw prediction)
    const rawIntent = this.predictIntent(person);

    // Add to intent history for temporal smoothing
    if (!person.intentHistory) {
      person.intentHistory = [];
    }
    person.intentHistory.push(rawIntent);
    if (person.intentHistory.length > this.intentHistorySize) {
      person.intentHistory.shift();
    }

    // Smooth intent using majority vote from history
    person.intent = this.smoothIntent(person.intentHistory);

    // Update gaze/face data if available
    if (faceData) {
      person.headPose = faceData.headPose;
      person.isLookingAtKiosk = faceData.isLookingAtKiosk;
      person.gazeConfidence = faceData.confidence || 0;
    }

    // Update person data
    person.lastSeen = timestamp;
    person.lastPosition = center;
    person.distance = distance?.score || 0;
    person.framesLost = 0;
    person.landmarks = detection.landmarks;

    // Recalculate confidence
    person.confidence = calculateConfidence(person);
  }

  /**
   * Predict intent from person's trajectory
   */
  predictIntent(person) {
    if (person.trajectory.length < 3) return 'unknown';

    const recent = person.trajectory.slice(-5);
    const avgVelocity = Math.sqrt(
      Math.pow(person.velocity.x, 2) + Math.pow(person.velocity.y, 2)
    );

    // Check if distance is increasing or decreasing
    const distanceChange = recent[recent.length - 1].distance - recent[0].distance;

    // Stopped: low velocity
    if (avgVelocity < 0.05) {
      return 'stopped';
    }

    // Approaching: distance increasing
    if (distanceChange > 5) {
      return 'approaching';
    }

    // Leaving: distance decreasing
    if (distanceChange < -5) {
      return 'leaving';
    }

    // Passing: moving but distance stable
    return 'passing';
  }

  /**
   * Smooth intent using temporal majority vote
   * Requires 70% agreement from intent history before changing state
   */
  smoothIntent(intentHistory) {
    if (!intentHistory || intentHistory.length === 0) return 'unknown';

    // Count occurrences of each intent
    const intentCounts = {};
    intentHistory.forEach(intent => {
      intentCounts[intent] = (intentCounts[intent] || 0) + 1;
    });

    // Find dominant intent (requires > 70% agreement)
    let dominantIntent = 'unknown';
    let maxCount = 0;
    const threshold = intentHistory.length * 0.7;

    for (const [intent, count] of Object.entries(intentCounts)) {
      if (count > maxCount && count >= threshold) {
        dominantIntent = intent;
        maxCount = count;
      }
    }

    // If no intent has 70% agreement, keep the most recent
    if (dominantIntent === 'unknown' && intentHistory.length > 0) {
      dominantIntent = intentHistory[intentHistory.length - 1];
    }

    return dominantIntent;
  }

  /**
   * Get all currently tracked people (with environmental filtering applied)
   */
  getTrackedPeople() {
    return Array.from(this.trackedPeople.values())
      .filter(p => p.framesLost === 0)
      .filter(p => {
        // Apply environmental filters
        const passesSpeedFilter = environmentalFilters.speedFilter(p.velocity);
        const passesBoundaryFilter = environmentalFilters.boundaryFilter(p.lastPosition);
        const passesQualityFilter = environmentalFilters.qualityFilter(p);
        const passesDurationFilter = environmentalFilters.durationFilter(p);

        // Check if in dead zone
        const inDeadZone = isDeadZone(p);

        // Only include if confidence > 70 and passes all filters and not in dead zone
        return (
          p.confidence > 70 &&
          passesSpeedFilter &&
          passesBoundaryFilter &&
          passesQualityFilter &&
          passesDurationFilter &&
          !inDeadZone
        );
      });
  }

  /**
   * Clear all tracking
   */
  clear() {
    this.trackedPeople.clear();
    this.nextId = 1;
  }
}

/**
 * Hook for multi-person tracking with MediaPipe
 */
export function useMultiPersonTracking({
  enabled = false,
  detectionInterval = 500, // ms between detections
  proximityThreshold = 30, // 0-100
  onPersonEntered = () => {},
  onPersonExited = () => {},
  onPersonApproaching = () => {},
  onPersonStopped = () => {},
} = {}) {
  const [trackedPeople, setTrackedPeople] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const trackerRef = useRef(new PersonTracker());
  const previousPeopleRef = useRef(new Set());

  /**
   * Initialize MediaPipe Pose and Face Landmarkers
   */
  const initializePoseLandmarker = useCallback(async () => {
    try {
      console.log('[MultiPersonTracking] Initializing MediaPipe...');

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      // Initialize Pose Landmarker for body tracking
      console.log('[MultiPersonTracking] Initializing Pose Landmarker...');
      const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 5, // Track up to 5 people simultaneously
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      // Initialize Face Landmarker for gaze detection
      console.log('[MultiPersonTracking] Initializing Face Landmarker...');
      const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 5, // Match up to 5 faces to poses
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      poseLandmarkerRef.current = poseLandmarker;
      faceLandmarkerRef.current = faceLandmarker;
      setIsInitialized(true);
      console.log('[MultiPersonTracking] ✅ MediaPipe initialized (Pose + Face)');
    } catch (err) {
      console.error('[MultiPersonTracking] ❌ Failed to initialize:', err);
      setError(err.message);
    }
  }, []);

  /**
   * Initialize camera
   */
  const initializeCamera = useCallback(async () => {
    try {
      console.log('[MultiPersonTracking] 📸 Initializing camera...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      // Create video element
      if (!videoRef.current) {
        videoRef.current = document.createElement('video');
        videoRef.current.autoplay = true;
        videoRef.current.playsInline = true;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      // Create canvas
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
        canvasRef.current.width = 640;
        canvasRef.current.height = 480;
      }

      console.log('[MultiPersonTracking] ✅ Camera initialized');
    } catch (err) {
      console.error('[MultiPersonTracking] ❌ Camera failed:', err);
      setError(err.message);
    }
  }, []);

  /**
   * Detect and track people in current frame
   */
  const detectPeople = useCallback(() => {
    if (!poseLandmarkerRef.current || !faceLandmarkerRef.current || !videoRef.current || videoRef.current.readyState !== 4) {
      return;
    }

    try {
      const timestamp = performance.now();

      // Detect poses
      const poseResult = poseLandmarkerRef.current.detectForVideo(videoRef.current, timestamp);

      if (!poseResult || !poseResult.landmarks) {
        return;
      }

      // Detect faces for gaze tracking
      const faceResult = faceLandmarkerRef.current.detectForVideo(videoRef.current, timestamp);

      // Process face detections to extract gaze data
      const faceDetections = [];
      if (faceResult && faceResult.faceLandmarks) {
        faceResult.faceLandmarks.forEach((landmarks) => {
          const headPose = calculateHeadPose(landmarks);
          const lookingAtKiosk = isLookingAtCamera(headPose);

          faceDetections.push({
            landmarks,
            headPose,
            isLookingAtKiosk: lookingAtKiosk,
            confidence: 0.8, // Could extract from face detection if available
          });
        });
      }

      // Update person tracking with pose and face data
      const detections = poseResult.landmarks.map((landmarks, index) => ({
        landmarks,
        worldLandmarks: poseResult.worldLandmarks?.[index],
      }));

      const tracked = trackerRef.current.update(detections, faceDetections);
      setTrackedPeople(tracked);

      // Trigger callbacks for state changes
      const currentPeople = new Set(tracked.map(p => p.id));

      // Check for new people (entered)
      for (const person of tracked) {
        if (!previousPeopleRef.current.has(person.id)) {
          const gazeInfo = person.isLookingAtKiosk ? ' 👁️ LOOKING AT KIOSK' : ' (looking away)';
          console.log('[MultiPersonTracking] 👋 Person entered:', person.id, gazeInfo);
          onPersonEntered(person);
        }

        // Check proximity and intent
        if (person.distance > proximityThreshold) {
          if (person.intent === 'approaching') {
            const gazeInfo = person.isLookingAtKiosk ? ' [Looking at kiosk]' : ' [Looking away]';
            console.log('[MultiPersonTracking] 🚶 Person approaching:', person.id, gazeInfo);
            onPersonApproaching(person);
          } else if (person.intent === 'stopped') {
            const gazeInfo = person.isLookingAtKiosk ? ' [ENGAGED - Looking at kiosk]' : ' [Stopped but looking away]';
            console.log('[MultiPersonTracking] 🛑 Person stopped:', person.id, gazeInfo);
            onPersonStopped(person);
          }
        }
      }

      // Check for people who left
      for (const personId of previousPeopleRef.current) {
        if (!currentPeople.has(personId)) {
          console.log('[MultiPersonTracking] 👋 Person exited:', personId);
          onPersonExited({ id: personId });
        }
      }

      previousPeopleRef.current = currentPeople;

    } catch (err) {
      console.error('[MultiPersonTracking] Detection error:', err);
    }
  }, [proximityThreshold, onPersonEntered, onPersonExited, onPersonApproaching, onPersonStopped]);

  /**
   * Start detection loop
   */
  useEffect(() => {
    if (!enabled || !isInitialized) return;

    console.log('[MultiPersonTracking] Starting detection loop');
    detectionIntervalRef.current = setInterval(detectPeople, detectionInterval);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [enabled, isInitialized, detectPeople, detectionInterval]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    if (!enabled) return;

    const init = async () => {
      await initializePoseLandmarker();
      await initializeCamera();
    };

    init();

    return () => {
      console.log('[MultiPersonTracking] Cleanup: disposing all resources');

      // Stop detection interval first
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }

      // Stop and dispose camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        streamRef.current = null;
      }

      // Dispose MediaPipe detectors (important for GPU resource cleanup)
      if (poseLandmarkerRef.current) {
        try {
          poseLandmarkerRef.current.close();
        } catch (e) {
          console.warn('[MultiPersonTracking] Pose landmarker close error:', e);
        }
        poseLandmarkerRef.current = null;
      }

      if (faceLandmarkerRef.current) {
        try {
          faceLandmarkerRef.current.close();
        } catch (e) {
          console.warn('[MultiPersonTracking] Face landmarker close error:', e);
        }
        faceLandmarkerRef.current = null;
      }

      // Clean up video element
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }

      // Clean up canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        canvasRef.current = null;
      }

      // Clear tracker
      trackerRef.current.clear();

      // Reset state
      setIsInitialized(false);
      setTrackedPeople([]);
      previousPeopleRef.current.clear();
    };
  }, [enabled, initializePoseLandmarker, initializeCamera]);

  return {
    trackedPeople,      // Array of tracked people with:
                        // - id: unique person ID
                        // - distance: 0-100 proximity score
                        // - intent: 'approaching', 'leaving', 'stopped', 'passing'
                        // - trajectory: array of position history
                        // - velocity: {x, y} movement speed
                        // - isLookingAtKiosk: boolean, true if facing camera
                        // - headPose: {yaw, pitch, roll} head orientation angles
                        // - gazeConfidence: 0-1 confidence of gaze detection
    isInitialized,
    error,
    peopleCount: trackedPeople.length,
  };
}
