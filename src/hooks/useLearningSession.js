// src/hooks/useLearningSession.js
// Handles recording of proximity detection sessions for adaptive learning
import { useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useLearningSession({ enabled = true, tenantId = 'chicago-mikes' } = {}) {
  const currentSessionRef = useRef(null);

  /**
   * Start a new learning session
   */
  const startSession = useCallback(async ({
    proximityLevel,
    intent, // 'approaching', 'stopped', 'passing', 'ambient'
    confidence = 0,
    baseline = 0,
    threshold = 0,
    triggeredAction = null, // 'walkup', 'ambient', 'stare', null
  }) => {
    if (!enabled) return;

    // End previous session if one exists
    if (currentSessionRef.current) {
      await endSession({ outcome: 'abandoned' });
    }

    const now = new Date();
    const session = {
      id: crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
    };

    currentSessionRef.current = session;
    console.log('[LearningSession] 📊 Session started:', session.id, '- Intent:', intent, '- Action:', triggeredAction);

    return session;
  }, [enabled, tenantId]);

  /**
   * Update session with engagement data
   */
  const updateEngagement = useCallback(({
    interacted = false,
    actionCompleted = false,
  }) => {
    if (!enabled || !currentSessionRef.current) return;

    const session = currentSessionRef.current;

    if (interacted) {
      if (!session.first_interaction_time) {
        session.first_interaction_time = Date.now();
      }
      session.last_interaction_time = Date.now();
    }

    if (actionCompleted) {
      session.converted = true;
    }

    console.log('[LearningSession] 📝 Engagement updated:', session.id, '- Interacted:', interacted, '- Converted:', actionCompleted);
  }, [enabled]);

  /**
   * End the current session and save to database
   */
  const endSession = useCallback(async ({
    outcome = 'abandoned', // 'engaged', 'abandoned', 'converted'
    feedbackWasCorrect = null,
  } = {}) => {
    if (!enabled || !currentSessionRef.current) return;

    const session = currentSessionRef.current;
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
    };

    console.log('[LearningSession] 💾 Saving session:', session.id, '- Outcome:', outcome, '- Duration:', Math.round(totalDuration / 1000), 's');

    try {
      const { error } = await supabase
        .from('proximity_learning_sessions')
        .insert(sessionData);

      if (error) {
        console.error('[LearningSession] ❌ Failed to save session:', error);
      } else {
        console.log('[LearningSession] ✅ Session saved successfully');
      }
    } catch (err) {
      console.error('[LearningSession] ❌ Error saving session:', err);
    }

    currentSessionRef.current = null;
  }, [enabled]);

  /**
   * Mark that user interacted (touched screen, made selection, etc.)
   */
  const recordInteraction = useCallback(() => {
    updateEngagement({ interacted: true });
  }, [updateEngagement]);

  /**
   * Mark that user completed an action (placed pin, made purchase, etc.)
   */
  const recordConversion = useCallback(() => {
    updateEngagement({ interacted: true, actionCompleted: true });
  }, [updateEngagement]);

  /**
   * Get current session status
   */
  const getSessionStatus = useCallback(() => {
    if (!currentSessionRef.current) {
      return { active: false };
    }

    const session = currentSessionRef.current;
    const now = Date.now();
    const duration = now - session.session_start_time;
    const engaged = !!session.first_interaction_time;

    return {
      active: true,
      sessionId: session.id,
      duration,
      engaged,
      converted: session.converted || false,
    };
  }, []);

  return {
    startSession,
    endSession,
    recordInteraction,
    recordConversion,
    getSessionStatus,
  };
}
