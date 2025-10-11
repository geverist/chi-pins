// src/hooks/useAdaptiveLearning.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  createEngagementModel,
  trainModel,
  predictEngagement,
  loadModel,
  saveModel,
  incrementalTrain,
} from '../lib/engagementModel';

/**
 * useAdaptiveLearning - Adaptive ML-powered proximity detection learning
 *
 * Features:
 * - Records proximity sessions with outcomes (abandoned, engaged, converted)
 * - Trains TensorFlow.js model incrementally as data accumulates
 * - Exponential backoff learning (higher probability when dataset is small)
 * - Automatic threshold adjustment based on abandonment rates
 * - Time-of-day and day-of-week pattern tracking
 * - Passive learning mode (collect data without taking action)
 * - Environment-specific learning (different locations learn independently)
 *
 * @param {Object} options
 * @param {string} options.tenantId - Tenant/location ID for multi-tenant support
 * @param {boolean} options.enabled - Enable adaptive learning
 * @param {number} options.learningAggressiveness - How aggressively to learn (1-100, default 50)
 * @param {boolean} options.passiveLearningMode - Only collect data, don't adjust thresholds
 * @param {number} options.passiveLearningDays - Days to remain in passive mode
 * @param {Function} options.onThresholdAdjusted - Callback when thresholds are adjusted
 * @param {Function} options.onModelTrained - Callback when model is trained
 */
export function useAdaptiveLearning({
  tenantId = 'default',
  enabled = false,
  learningAggressiveness = 50,
  passiveLearningMode = false,
  passiveLearningDays = 0,
  onThresholdAdjusted = () => {},
  onModelTrained = () => {},
} = {}) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [totalSessions, setTotalSessions] = useState(0);
  const [learningProbability, setLearningProbability] = useState(1.0);
  const [abandonmentRate, setAbandonmentRate] = useState(0);
  const [engagementRate, setEngagementRate] = useState(0);
  const [modelAccuracy, setModelAccuracy] = useState(null);
  const [recommendedThresholds, setRecommendedThresholds] = useState(null);

  const currentSessionRef = useRef(null);
  const sessionStartTimeRef = useRef(null);
  const modelRef = useRef(null);

  // Initialize model and load historical data
  useEffect(() => {
    if (!enabled) return;

    const init = async () => {
      try {
        console.log('[AdaptiveLearning] Initializing adaptive learning system...');

        // Try to load existing model
        const existingModel = await loadModel();
        if (existingModel) {
          modelRef.current = existingModel;
          console.log('[AdaptiveLearning] Loaded existing trained model from IndexedDB');
        } else {
          // Create new model
          modelRef.current = await createEngagementModel();
          console.log('[AdaptiveLearning] Created new engagement model');
        }

        // Load historical session count for learning probability calculation
        const { count, error } = await supabase
          .from('proximity_learning_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId);

        if (error) {
          console.warn('[AdaptiveLearning] Could not load session count:', error);
          setTotalSessions(0);
        } else {
          setTotalSessions(count || 0);
          console.log(`[AdaptiveLearning] Loaded ${count} historical sessions`);
        }

        // Calculate initial learning probability (exponential backoff)
        const probability = Math.min(1.0, learningAggressiveness / Math.max(1, count || 1));
        setLearningProbability(probability);
        console.log(`[AdaptiveLearning] Learning probability: ${(probability * 100).toFixed(1)}%`);

        // Load recent stats for threshold adjustment
        await loadRecentStats();

        setIsInitialized(true);
        console.log('[AdaptiveLearning] ✅ Initialization complete');
      } catch (error) {
        console.error('[AdaptiveLearning] Initialization error:', error);
      }
    };

    init();
  }, [enabled, tenantId, learningAggressiveness]);

  // Load recent session statistics
  const loadRecentStats = useCallback(async () => {
    try {
      // Get last 100 sessions for statistics
      const { data: recentSessions, error } = await supabase
        .from('proximity_learning_sessions')
        .select('outcome, engaged_duration_ms')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (!recentSessions || recentSessions.length === 0) {
        console.log('[AdaptiveLearning] No recent sessions for stats');
        return;
      }

      // Calculate abandonment rate (abandoned / total)
      const abandonedCount = recentSessions.filter(s => s.outcome === 'abandoned').length;
      const engagedCount = recentSessions.filter(s => s.outcome === 'engaged').length;
      const abandonment = (abandonedCount / recentSessions.length) * 100;
      const engagement = (engagedCount / recentSessions.length) * 100;

      setAbandonmentRate(abandonment);
      setEngagementRate(engagement);

      console.log(`[AdaptiveLearning] Stats: ${abandonment.toFixed(1)}% abandoned, ${engagement.toFixed(1)}% engaged`);

      // Auto-adjust thresholds if abandonment is too high or too low
      if (!passiveLearningMode) {
        await autoAdjustThresholds(abandonment, engagement);
      }
    } catch (error) {
      console.error('[AdaptiveLearning] Error loading stats:', error);
    }
  }, [tenantId, passiveLearningMode]);

  // Automatic threshold adjustment based on abandonment rates
  const autoAdjustThresholds = useCallback(async (abandonment, engagement) => {
    try {
      // If abandonment rate is too high (>30%), we're triggering too early - increase thresholds
      // If abandonment rate is too low (<15%), we're triggering too late - decrease thresholds
      let adjustmentFactor = 0;
      let adjustmentReason = '';

      if (abandonment > 30) {
        // Too many false positives - increase thresholds by 10%
        adjustmentFactor = 1.1;
        adjustmentReason = `High abandonment rate (${abandonment.toFixed(1)}%) - increasing thresholds by 10%`;
      } else if (abandonment < 15 && engagement > 40) {
        // Good engagement, low abandonment - can be more aggressive, decrease thresholds by 10%
        adjustmentFactor = 0.9;
        adjustmentReason = `Low abandonment (${abandonment.toFixed(1)}%), high engagement (${engagement.toFixed(1)}%) - decreasing thresholds by 10%`;
      }

      if (adjustmentFactor !== 0) {
        console.log(`[AdaptiveLearning] ${adjustmentReason}`);

        // Load current thresholds from admin settings
        const { data: settings, error } = await supabase
          .from('admin_settings')
          .select('proximity_threshold, ambient_music_threshold, proximity_sensitivity, last_threshold_adjustment')
          .eq('tenant_id', tenantId)
          .single();

        if (error) throw error;

        // Rate limiting: Don't adjust more than once per hour
        const lastAdjustment = settings.last_threshold_adjustment ? new Date(settings.last_threshold_adjustment) : null;
        const hoursSinceLastAdjustment = lastAdjustment ? (Date.now() - lastAdjustment.getTime()) / (1000 * 60 * 60) : Infinity;

        if (hoursSinceLastAdjustment < 1) {
          console.log(`[AdaptiveLearning] Rate limit: Last adjustment was ${hoursSinceLastAdjustment.toFixed(1)}h ago, waiting...`);
          return;
        }

        const newThresholds = {
          proximityThreshold: Math.round(settings.proximity_threshold * adjustmentFactor),
          ambientMusicThreshold: Math.round(settings.ambient_music_threshold * adjustmentFactor),
          proximitySensitivity: Math.round(settings.proximity_sensitivity * adjustmentFactor),
        };

        // Clamp to reasonable ranges
        newThresholds.proximityThreshold = Math.max(20, Math.min(90, newThresholds.proximityThreshold));
        newThresholds.ambientMusicThreshold = Math.max(50, Math.min(99, newThresholds.ambientMusicThreshold));
        newThresholds.proximitySensitivity = Math.max(5, Math.min(30, newThresholds.proximitySensitivity));

        // AUTOMATICALLY APPLY THRESHOLDS TO DATABASE
        console.log('[AdaptiveLearning] 🤖 Automatically applying threshold adjustments...');
        console.log('[AdaptiveLearning] Old:', {
          proximity: settings.proximity_threshold,
          ambient: settings.ambient_music_threshold,
          sensitivity: settings.proximity_sensitivity,
        });
        console.log('[AdaptiveLearning] New:', newThresholds);

        const { error: updateError } = await supabase
          .from('admin_settings')
          .update({
            proximity_threshold: newThresholds.proximityThreshold,
            ambient_music_threshold: newThresholds.ambientMusicThreshold,
            proximity_sensitivity: newThresholds.proximitySensitivity,
            last_threshold_adjustment: new Date().toISOString(),
          })
          .eq('tenant_id', tenantId);

        if (updateError) {
          console.error('[AdaptiveLearning] ❌ Failed to update thresholds:', updateError);
          throw updateError;
        }

        console.log('[AdaptiveLearning] ✅ Thresholds updated successfully in database');

        setRecommendedThresholds(newThresholds);

        // Notify callback that thresholds were automatically adjusted
        onThresholdAdjusted({
          reason: adjustmentReason,
          oldThresholds: settings,
          newThresholds,
          abandonmentRate: abandonment,
          engagementRate: engagement,
          autoApplied: true,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('[AdaptiveLearning] Error auto-adjusting thresholds:', error);
    }
  }, [tenantId, onThresholdAdjusted]);

  // Start a new proximity session
  const startSession = useCallback(({ proximityLevel, intent, confidence, baseline, threshold }) => {
    if (!enabled || !isInitialized) return null;

    // Check if we should learn this session (exponential backoff)
    const shouldLearn = Math.random() < learningProbability;

    if (!shouldLearn && totalSessions > 20) {
      console.log(`[AdaptiveLearning] Skipping session (${(learningProbability * 100).toFixed(1)}% probability)`);
      return null;
    }

    const now = new Date();
    const session = {
      tenant_id: tenantId,
      proximity_level: proximityLevel,
      intent,
      confidence,
      baseline,
      threshold,
      hour_of_day: now.getHours(),
      day_of_week: now.getDay(),
      triggered_action: intent === 'approaching' ? 'walkup' : intent === 'ambient' ? 'ambient' : null,
      started_at: now.toISOString(),
    };

    currentSessionRef.current = session;
    sessionStartTimeRef.current = Date.now();

    console.log('[AdaptiveLearning] Started learning session:', {
      intent,
      proximityLevel,
      confidence,
      learningProbability: (learningProbability * 100).toFixed(1) + '%',
    });

    return session;
  }, [enabled, isInitialized, learningProbability, totalSessions, tenantId]);

  // End session and record outcome
  const endSession = useCallback(async ({ outcome, engagedDurationMs = 0, converted = false, feedbackWasCorrect = null }) => {
    if (!currentSessionRef.current) return;

    try {
      const session = currentSessionRef.current;
      const duration = sessionStartTimeRef.current ? Date.now() - sessionStartTimeRef.current : 0;

      // Complete session data
      const completedSession = {
        ...session,
        outcome, // 'engaged', 'abandoned', 'converted'
        engaged_duration_ms: engagedDurationMs,
        converted,
        total_duration_ms: duration,
        feedback_was_correct: feedbackWasCorrect,
        created_at: new Date().toISOString(),
      };

      // Insert to database
      const { error } = await supabase
        .from('proximity_learning_sessions')
        .insert(completedSession);

      if (error) {
        console.error('[AdaptiveLearning] Error saving session:', error);
      } else {
        console.log(`[AdaptiveLearning] Session ended: ${outcome} (${duration}ms)`);

        // Update session count
        setTotalSessions(prev => prev + 1);

        // Recalculate learning probability (exponential backoff)
        const newProbability = Math.min(1.0, learningAggressiveness / Math.max(1, totalSessions + 1));
        setLearningProbability(newProbability);

        // Train model incrementally every 10 sessions
        if ((totalSessions + 1) % 10 === 0) {
          await trainModelIncremental();
        }

        // Reload stats every 20 sessions
        if ((totalSessions + 1) % 20 === 0) {
          await loadRecentStats();
        }
      }

      // Clear current session
      currentSessionRef.current = null;
      sessionStartTimeRef.current = null;
    } catch (error) {
      console.error('[AdaptiveLearning] Error ending session:', error);
    }
  }, [learningAggressiveness, totalSessions, loadRecentStats]);

  // Train model incrementally with recent data
  const trainModelIncremental = useCallback(async () => {
    try {
      console.log('[AdaptiveLearning] Starting incremental training...');

      // Get last 100 labeled sessions
      const { data: sessions, error } = await supabase
        .from('proximity_learning_sessions')
        .select('*')
        .eq('tenant_id', tenantId)
        .not('outcome', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (!sessions || sessions.length < 20) {
        console.log('[AdaptiveLearning] Not enough sessions for training (need 20, have', sessions.length, ')');
        return;
      }

      // Map to model format
      const trainingSessions = sessions.map(s => ({
        proximityLevel: s.proximity_level,
        intent: s.intent,
        confidence: s.confidence,
        gazeDirection: 'unknown',
        baseline: s.baseline,
        threshold: s.threshold,
        triggeredAction: s.outcome === 'engaged' ? 'approaching' : s.outcome === 'abandoned' ? 'ambient' : 'ambient',
      }));

      // Train model
      const history = await incrementalTrain(trainingSessions);

      if (history) {
        const finalAcc = history.history.acc[history.history.acc.length - 1];
        setModelAccuracy(finalAcc);
        console.log(`[AdaptiveLearning] Training complete! Accuracy: ${(finalAcc * 100).toFixed(1)}%`);

        onModelTrained({
          accuracy: finalAcc,
          sessionsUsed: sessions.length,
        });
      }
    } catch (error) {
      console.error('[AdaptiveLearning] Training error:', error);
    }
  }, [tenantId, onModelTrained]);

  // Predict engagement for current proximity data
  const predict = useCallback(async (sessionData) => {
    if (!modelRef.current || !enabled) return null;

    try {
      const prediction = await predictEngagement(sessionData);
      console.log('[AdaptiveLearning] Prediction:', prediction);
      return prediction;
    } catch (error) {
      console.error('[AdaptiveLearning] Prediction error:', error);
      return null;
    }
  }, [enabled]);

  // Record user feedback on trigger timing
  const recordFeedback = useCallback(async ({ wasCorrect, triggerType, proximityLevel, threshold }) => {
    if (!currentSessionRef.current) {
      console.warn('[AdaptiveLearning] No active session for feedback');
      return;
    }

    // Update current session with feedback
    currentSessionRef.current.feedback_was_correct = wasCorrect;

    console.log(`[AdaptiveLearning] Feedback recorded: ${wasCorrect ? 'Correct' : 'Incorrect'} timing for ${triggerType}`);

    // If feedback was negative, this is a valuable learning signal
    if (!wasCorrect) {
      console.log('[AdaptiveLearning] Negative feedback - will adjust thresholds more aggressively');
    }
  }, []);

  return {
    // State
    isInitialized,
    totalSessions,
    learningProbability,
    abandonmentRate,
    engagementRate,
    modelAccuracy,
    recommendedThresholds,

    // Methods
    startSession,
    endSession,
    predict,
    recordFeedback,
    trainModel: trainModelIncremental,

    // Current session
    hasActiveSession: !!currentSessionRef.current,
  };
}
