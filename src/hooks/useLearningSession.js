// src/hooks/useLearningSession.js
// Handles recording of proximity detection sessions for adaptive learning
// Supports multiple concurrent sessions for multi-person tracking
import { useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getLocalDatabase } from '../lib/localDatabase';

export function useLearningSession({ enabled = true, tenantId = 'chicago-mikes' } = {}) {
  // Changed to Map to support multiple concurrent sessions (one per person)
  const activeSessionsRef = useRef(new Map()); // personId -> session data

  /**
   * Start a new learning session for a specific person
   */
  const startSession = useCallback(async ({
    personId = 'default', // NEW: Person ID from multi-person tracker
    proximityLevel,
    intent, // 'approaching', 'stopped', 'passing', 'ambient'
    confidence = 0,
    baseline = 0,
    threshold = 0,
    triggeredAction = null, // 'walkup', 'ambient', 'stare', null
    // NEW: Gaze tracking fields
    isLookingAtKiosk = null,
    headPose = null, // {yaw, pitch, roll}
    distanceScore = 0,
    trajectory = [],
    velocity = null, // {x, y}
  }) => {
    if (!enabled) return;

    // End previous session for this person if one exists
    if (activeSessionsRef.current.has(personId)) {
      await endSession({ personId, outcome: 'abandoned' });
    }

    const now = new Date();
    const session = {
      id: crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      person_id: personId,
      tenant_id: tenantId,
      proximity_level: proximityLevel,
      intent,
      confidence,
      baseline,
      threshold,
      hour_of_day: now.getHours(),
      day_of_week: now.getDay(),
      triggered_action: triggeredAction,
      started_at: now.toISOString(),
      session_start_time: Date.now(),
      // Gaze tracking fields
      is_looking_at_kiosk: isLookingAtKiosk,
      head_pose_yaw: headPose?.yaw || null,
      head_pose_pitch: headPose?.pitch || null,
      head_pose_roll: headPose?.roll || null,
      distance_score: distanceScore,
      trajectory_data: trajectory,
      velocity_x: velocity?.x || null,
      velocity_y: velocity?.y || null,
    };

    activeSessionsRef.current.set(personId, session);
    const gazeInfo = isLookingAtKiosk ? ' [LOOKING AT KIOSK]' : isLookingAtKiosk === false ? ' [looking away]' : '';
    console.log(`[LearningSession] 📊 Session started: ${session.id} - Person: ${personId} - Intent: ${intent}${gazeInfo}`);

    return session;
  }, [enabled, tenantId]);

  /**
   * Update session with engagement data
   */
  const updateEngagement = useCallback(({
    personId = 'default',
    interacted = false,
    actionCompleted = false,
    // NEW: Allow updating gaze data during session
    isLookingAtKiosk = undefined,
    headPose = undefined,
    trajectory = undefined,
  }) => {
    if (!enabled) return;

    const session = activeSessionsRef.current.get(personId);
    if (!session) return;

    if (interacted) {
      if (!session.first_interaction_time) {
        session.first_interaction_time = Date.now();
      }
      session.last_interaction_time = Date.now();
    }

    if (actionCompleted) {
      session.converted = true;
    }

    // Update gaze data if provided
    if (isLookingAtKiosk !== undefined) {
      session.is_looking_at_kiosk = isLookingAtKiosk;
    }
    if (headPose !== undefined) {
      session.head_pose_yaw = headPose.yaw;
      session.head_pose_pitch = headPose.pitch;
      session.head_pose_roll = headPose.roll;
    }
    if (trajectory !== undefined) {
      session.trajectory_data = trajectory;
    }

    console.log(`[LearningSession] 📝 Engagement updated: ${session.id} - Person: ${personId} - Interacted: ${interacted} - Converted: ${actionCompleted}`);
  }, [enabled]);

  /**
   * End the current session and save to database
   */
  const endSession = useCallback(async ({
    personId = 'default',
    outcome = 'abandoned', // 'engaged', 'abandoned', 'converted'
    feedbackWasCorrect = null,
  } = {}) => {
    if (!enabled) return;

    const session = activeSessionsRef.current.get(personId);
    if (!session) return;

    const now = Date.now();
    const totalDuration = now - session.session_start_time;

    // Calculate engagement duration
    let engagedDuration = 0;
    if (session.first_interaction_time) {
      engagedDuration = (session.last_interaction_time || now) - session.first_interaction_time;
    }

    // If converted, outcome should be 'converted'
    if (session.converted && outcome !== 'converted') {
      outcome = 'converted';
    }

    // If they engaged for more than 2 seconds, mark as 'engaged'
    if (engagedDuration > 2000 && outcome === 'abandoned') {
      outcome = 'engaged';
    }

    const sessionData = {
      id: session.id,
      person_id: session.person_id,
      tenant_id: session.tenant_id,
      proximity_level: session.proximity_level,
      intent: session.intent,
      confidence: session.confidence,
      baseline: session.baseline,
      threshold: session.threshold,
      hour_of_day: session.hour_of_day,
      day_of_week: session.day_of_week,
      triggered_action: session.triggered_action,
      outcome,
      engaged_duration_ms: engagedDuration,
      converted: session.converted || false,
      total_duration_ms: totalDuration,
      feedback_was_correct: feedbackWasCorrect,
      started_at: session.started_at,
      created_at: new Date().toISOString(),
      // Gaze tracking fields
      is_looking_at_kiosk: session.is_looking_at_kiosk,
      head_pose_yaw: session.head_pose_yaw,
      head_pose_pitch: session.head_pose_pitch,
      head_pose_roll: session.head_pose_roll,
      distance_score: session.distance_score,
      trajectory_data: session.trajectory_data,
      velocity_x: session.velocity_x,
      velocity_y: session.velocity_y,
    };

    console.log(`[LearningSession] 💾 Saving session: ${session.id} - Person: ${personId} - Outcome: ${outcome} - Duration: ${Math.round(totalDuration / 1000)}s`);

    try {
      // LOCAL-FIRST: Write to SQLite immediately (fast, offline-capable)
      const db = await getLocalDatabase();

      if (db.isAvailable()) {
        // Write to local database first (instant, <10ms)
        await db.upsertLearningSession(sessionData);
        console.log('[LearningSession] ✅ Session saved to local database');

        // Background sync will upload to Supabase later (handled by syncService)
      } else {
        // Fallback: If local DB not available (web browser), write directly to Supabase
        console.log('[LearningSession] ⚠️ Local DB not available, writing directly to Supabase');
        const { error } = await supabase
          .from('proximity_learning_sessions')
          .insert(sessionData);

        if (error) {
          console.error('[LearningSession] ❌ Failed to save session to Supabase:', error);
        } else {
          console.log('[LearningSession] ✅ Session saved to Supabase');
        }
      }
    } catch (err) {
      console.error('[LearningSession] ❌ Error saving session:', err);

      // Last resort: try Supabase as fallback
      try {
        const { error } = await supabase
          .from('proximity_learning_sessions')
          .insert(sessionData);

        if (error) {
          console.error('[LearningSession] ❌ Fallback to Supabase also failed:', error);
        } else {
          console.log('[LearningSession] ✅ Session saved to Supabase (fallback)');
        }
      } catch (fallbackErr) {
        console.error('[LearningSession] ❌ All save attempts failed:', fallbackErr);
      }
    }

    // Remove session from active sessions
    activeSessionsRef.current.delete(personId);
  }, [enabled]);

  /**
   * Mark that user interacted (touched screen, made selection, etc.)
   */
  const recordInteraction = useCallback((personId = 'default') => {
    updateEngagement({ personId, interacted: true });
  }, [updateEngagement]);

  /**
   * Mark that user completed an action (placed pin, made purchase, etc.)
   */
  const recordConversion = useCallback((personId = 'default') => {
    updateEngagement({ personId, interacted: true, actionCompleted: true });
  }, [updateEngagement]);

  /**
   * Get current session status
   * @param {string} personId - Optional person ID. If provided, returns status for that person only.
   *                            If omitted, returns array of all active sessions.
   */
  const getSessionStatus = useCallback((personId = null) => {
    // Get status for specific person
    if (personId) {
      const session = activeSessionsRef.current.get(personId);
      if (!session) {
        return { active: false, personId };
      }

      const now = Date.now();
      const duration = now - session.session_start_time;
      const engaged = !!session.first_interaction_time;

      return {
        active: true,
        personId,
        sessionId: session.id,
        duration,
        engaged,
        converted: session.converted || false,
        isLookingAtKiosk: session.is_looking_at_kiosk,
      };
    }

    // Get status for all active sessions
    const allSessions = [];
    for (const [pid, session] of activeSessionsRef.current.entries()) {
      const now = Date.now();
      const duration = now - session.session_start_time;
      const engaged = !!session.first_interaction_time;

      allSessions.push({
        active: true,
        personId: pid,
        sessionId: session.id,
        duration,
        engaged,
        converted: session.converted || false,
        isLookingAtKiosk: session.is_looking_at_kiosk,
      });
    }

    return allSessions.length > 0 ? allSessions : [{ active: false }];
  }, []);

  return {
    startSession,
    endSession,
    recordInteraction,
    recordConversion,
    getSessionStatus,
  };
}
