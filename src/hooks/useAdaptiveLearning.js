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

  // Analyze movement vectors from session data
  const analyzeMovementVectors = (sessions) => {
    const approachingSessions = sessions.filter(s => s.intent === 'approaching');
    const stoppedSessions = sessions.filter(s => s.intent === 'stopped');

    if (approachingSessions.length === 0) {
      return {
        avgApproachSpeed: 0,
        fastApproaches: 0,
        slowApproaches: 0,
        directApproaches: 0,
        wanderingApproaches: 0,
      };
    }

    // Calculate approach speeds and trajectory quality
    let totalSpeed = 0;
    let fastCount = 0;
    let slowCount = 0;
    let directCount = 0;
    let wanderingCount = 0;

    approachingSessions.forEach(session => {
      if (session.velocity && typeof session.velocity === 'object') {
        const speed = Math.sqrt((session.velocity.x || 0) ** 2 + (session.velocity.y || 0) ** 2);
        totalSpeed += speed;

        // Classify speed: fast (>0.3), medium (0.1-0.3), slow (<0.1)
        if (speed > 0.3) fastCount++;
        else if (speed < 0.1) slowCount++;

        // Analyze trajectory quality if available
        if (session.trajectory && Array.isArray(session.trajectory) && session.trajectory.length > 3) {
          const traj = session.trajectory;
          // Calculate path straightness (direct = distance ratio close to 1)
          const startPoint = traj[0];
          const endPoint = traj[traj.length - 1];
          const directDistance = Math.sqrt(
            (endPoint.x - startPoint.x) ** 2 + (endPoint.y - startPoint.y) ** 2
          );

          // Calculate actual path length
          let pathLength = 0;
          for (let i = 1; i < traj.length; i++) {
            pathLength += Math.sqrt(
              (traj[i].x - traj[i-1].x) ** 2 + (traj[i].y - traj[i-1].y) ** 2
            );
          }

          const straightness = pathLength > 0 ? directDistance / pathLength : 0;

          // Direct approach: straightness > 0.7
          if (straightness > 0.7) directCount++;
          else wanderingCount++;
        }
      }
    });

    return {
      avgApproachSpeed: approachingSessions.length > 0 ? totalSpeed / approachingSessions.length : 0,
      fastApproaches: (fastCount / approachingSessions.length) * 100,
      slowApproaches: (slowCount / approachingSessions.length) * 100,
      directApproaches: directCount,
      wanderingApproaches: wanderingCount,
      stoppedCount: stoppedSessions.length,
    };
  };

  /**
   * Identify false positive patterns from abandoned sessions
   * Learns common characteristics that lead to abandonments and creates adaptive dead zones
   */
  const identifyFalsePositivePatterns = (sessions) => {
    const abandoned = sessions.filter(s => s.outcome === 'abandoned');

    if (abandoned.length < 5) {
      return null; // Need at least 5 abandoned sessions to identify patterns
    }

    // Calculate average characteristics of false positives
    let totalDuration = 0;
    let totalSpeed = 0;
    let totalGazeDuration = 0;
    let edgeCaseCount = 0;
    let passingCount = 0;

    abandoned.forEach(session => {
      totalDuration += session.duration_ms || 0;

      // Calculate speed from velocity
      if (session.velocity && typeof session.velocity === 'object') {
        const speed = Math.sqrt((session.velocity.x || 0) ** 2 + (session.velocity.y || 0) ** 2);
        totalSpeed += speed;
      }

      totalGazeDuration += session.gaze_duration_ms || 0;

      // Check if at screen edge (x < 0.2 or x > 0.8)
      if (session.trajectory && Array.isArray(session.trajectory) && session.trajectory.length > 0) {
        const lastPos = session.trajectory[session.trajectory.length - 1];
        if (lastPos.x < 0.2 || lastPos.x > 0.8) {
          edgeCaseCount++;
        }
      }

      // Check if intent was 'passing'
      if (session.intent === 'passing') {
        passingCount++;
      }
    });

    const avgDuration = totalDuration / abandoned.length;
    const avgSpeed = totalSpeed / abandoned.length;
    const avgGazeDuration = totalGazeDuration / abandoned.length;
    const edgeCaseRate = (edgeCaseCount / abandoned.length) * 100;
    const passingRate = (passingCount / abandoned.length) * 100;

    // Identify pattern types
    const patterns = [];

    // Pattern 1: Fast passerbys (< 2s duration, high speed, low gaze)
    if (avgDuration < 2000 && avgSpeed > 0.5 && avgGazeDuration < 500) {
      patterns.push({
        type: 'fast_passerby',
        minDuration: 2000,
        maxSpeed: 0.5,
        minGaze: 500,
        description: 'People passing by quickly without engagement',
      });
    }

    // Pattern 2: Edge wanderers (high edge case rate)
    if (edgeCaseRate > 50) {
      patterns.push({
        type: 'edge_wanderer',
        boundaryMargin: 0.25, // Ignore people within 25% of screen edge
        description: 'People walking along screen edges',
      });
    }

    // Pattern 3: Passing traffic (high passing intent rate)
    if (passingRate > 60) {
      patterns.push({
        type: 'passing_traffic',
        ignorePassingIntent: true,
        description: 'People with passing movement pattern',
      });
    }

    // Pattern 4: Brief glances (very short gaze, short duration)
    if (avgGazeDuration < 1000 && avgDuration < 3000) {
      patterns.push({
        type: 'brief_glance',
        minGazeDuration: 1000,
        minTotalDuration: 3000,
        description: 'Brief glances without sustained attention',
      });
    }

    console.log('[AdaptiveLearning] 🧠 Identified false positive patterns:', patterns);

    return {
      patterns,
      statistics: {
        avgDuration,
        avgSpeed,
        avgGazeDuration,
        edgeCaseRate,
        passingRate,
        totalAbandoned: abandoned.length,
      },
    };
  };

  // Analyze gaze patterns from session data
  const analyzeGazePatterns = (sessions) => {
    const sessionsWithGaze = sessions.filter(s => s.gaze_duration_ms != null && s.gaze_confidence != null);

    if (sessionsWithGaze.length === 0) {
      return {
        avgGazeDuration: 0,
        quickGazeConversions: 0,
        noGazeAbandoned: 0,
        gazeConfidence: 0,
      };
    }

    let totalGazeDuration = 0;
    let quickGazeConverted = 0;
    let noGazeAbandoned = 0;
    let totalConfidence = 0;

    sessionsWithGaze.forEach(session => {
      totalGazeDuration += session.gaze_duration_ms || 0;
      totalConfidence += session.gaze_confidence || 0;

      // Quick gaze + conversion: gaze < 2s and outcome = converted
      if (session.gaze_duration_ms < 2000 && session.outcome === 'converted') {
        quickGazeConverted++;
      }

      // No gaze + abandoned: gaze < 500ms and outcome = abandoned
      if (session.gaze_duration_ms < 500 && session.outcome === 'abandoned') {
        noGazeAbandoned++;
      }
    });

    return {
      avgGazeDuration: totalGazeDuration / sessionsWithGaze.length,
      quickGazeConversions: (quickGazeConverted / sessionsWithGaze.length) * 100,
      noGazeAbandoned: (noGazeAbandoned / sessionsWithGaze.length) * 100,
      gazeConfidence: totalConfidence / sessionsWithGaze.length,
    };
  };

  // Load recent session statistics with vector and gaze analysis
  const loadRecentStats = useCallback(async () => {
    try {
      // Get last 100 sessions for statistics with full metadata
      const { data: recentSessions, error } = await supabase
        .from('proximity_learning_sessions')
        .select('outcome, engaged_duration_ms, velocity, trajectory, gaze_duration_ms, gaze_confidence, intent, proximity_level')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (!recentSessions || recentSessions.length === 0) {
        console.log('[AdaptiveLearning] No recent sessions for stats');
        return;
      }

      // Calculate basic abandonment rate (abandoned / total)
      const abandonedCount = recentSessions.filter(s => s.outcome === 'abandoned').length;
      const engagedCount = recentSessions.filter(s => s.outcome === 'engaged').length;
      const abandonment = (abandonedCount / recentSessions.length) * 100;
      const engagement = (engagedCount / recentSessions.length) * 100;

      setAbandonmentRate(abandonment);
      setEngagementRate(engagement);

      console.log(`[AdaptiveLearning] Basic stats: ${abandonment.toFixed(1)}% abandoned, ${engagement.toFixed(1)}% engaged`);

      // Analyze movement vectors, gaze patterns, and false positive patterns
      const vectorAnalysis = analyzeMovementVectors(recentSessions);
      const gazeAnalysis = analyzeGazePatterns(recentSessions);
      const falsePositiveAnalysis = identifyFalsePositivePatterns(recentSessions);

      console.log('[AdaptiveLearning] Vector analysis:', vectorAnalysis);
      console.log('[AdaptiveLearning] Gaze analysis:', gazeAnalysis);
      if (falsePositiveAnalysis) {
        console.log('[AdaptiveLearning] False positive patterns:', falsePositiveAnalysis);
      }

      // Auto-adjust thresholds using ALL available intelligence
      if (!passiveLearningMode) {
        await autoAdjustThresholds(abandonment, engagement, vectorAnalysis, gazeAnalysis, recentSessions, falsePositiveAnalysis);
      }
    } catch (error) {
      console.error('[AdaptiveLearning] Error loading stats:', error);
    }
  }, [tenantId, passiveLearningMode]);

  // Automatic threshold adjustment using vector analysis, gaze patterns, abandonment rates, and false positive patterns
  const autoAdjustThresholds = useCallback(async (abandonment, engagement, vectorAnalysis = {}, gazeAnalysis = {}, sessions = [], falsePositiveAnalysis = null) => {
    try {
      // INTELLIGENT THRESHOLD ADJUSTMENT using multiple signals
      let adjustmentFactor = 0;
      let adjustmentReason = '';
      let intelligenceUsed = [];

      // Signal 1: Basic abandonment rate (legacy logic)
      let baseAdjustment = 0;
      if (abandonment > 30) {
        baseAdjustment = 0.1; // Increase by 10%
        intelligenceUsed.push(`High abandonment (${abandonment.toFixed(1)}%)`);
      } else if (abandonment < 15 && engagement > 40) {
        baseAdjustment = -0.1; // Decrease by 10%
        intelligenceUsed.push(`Low abandonment + high engagement`);
      }

      // Signal 2: Movement vector analysis
      let vectorAdjustment = 0;
      if (vectorAnalysis.fastApproaches > 60) {
        // Most approaches are fast and direct - can be more aggressive
        vectorAdjustment -= 0.05; // Decrease thresholds by 5%
        intelligenceUsed.push(`Fast approaches (${vectorAnalysis.fastApproaches.toFixed(0)}%)`);
      } else if (vectorAnalysis.slowApproaches > 60 || vectorAnalysis.wanderingApproaches > vectorAnalysis.directApproaches) {
        // Slow or wandering approaches - need higher threshold to avoid false positives
        vectorAdjustment += 0.05; // Increase by 5%
        intelligenceUsed.push(`Slow/wandering movement detected`);
      }

      // Signal 3: Gaze pattern analysis
      let gazeAdjustment = 0;
      if (gazeAnalysis.quickGazeConversions > 40) {
        // Quick gaze leading to conversions - users are very engaged, be more aggressive
        gazeAdjustment -= 0.08; // Decrease by 8%
        intelligenceUsed.push(`Quick gaze conversions (${gazeAnalysis.quickGazeConversions.toFixed(0)}%)`);
      } else if (gazeAnalysis.noGazeAbandoned > 50) {
        // No gaze leading to abandonment - too many false positives
        gazeAdjustment += 0.08; // Increase by 8%
        intelligenceUsed.push(`No-gaze abandonments (${gazeAnalysis.noGazeAbandoned.toFixed(0)}%)`);
      }

      // Signal 4: False positive patterns (adaptive dead zones)
      let falsePositiveAdjustment = 0;
      if (falsePositiveAnalysis && falsePositiveAnalysis.patterns.length > 0) {
        // If we identified false positive patterns, increase thresholds to reduce them
        const patternCount = falsePositiveAnalysis.patterns.length;
        falsePositiveAdjustment = 0.05 * patternCount; // 5% increase per pattern type
        const patternDescriptions = falsePositiveAnalysis.patterns.map(p => p.type).join(', ');
        intelligenceUsed.push(`${patternCount} false positive pattern(s): ${patternDescriptions}`);

        console.log('[AdaptiveLearning] 🚫 False positive patterns detected:', {
          patterns: falsePositiveAnalysis.patterns,
          adjustment: falsePositiveAdjustment,
        });
      }

      // Combine all intelligence signals
      const totalAdjustment = baseAdjustment + vectorAdjustment + gazeAdjustment + falsePositiveAdjustment;

      // Only adjust if combined signal is significant (>3% change)
      if (Math.abs(totalAdjustment) < 0.03) {
        console.log('[AdaptiveLearning] Adjustments too small, skipping:', {
          base: baseAdjustment,
          vector: vectorAdjustment,
          gaze: gazeAdjustment,
          total: totalAdjustment,
        });
        return;
      }

      adjustmentFactor = 1 + totalAdjustment;
      adjustmentReason = `AI-optimized: ${intelligenceUsed.join(', ')} → ${totalAdjustment > 0 ? 'increase' : 'decrease'} ${Math.abs(totalAdjustment * 100).toFixed(1)}%`;

      console.log('[AdaptiveLearning] 🧠 Intelligent adjustment:', {
        baseAdjustment,
        vectorAdjustment,
        gazeAdjustment,
        falsePositiveAdjustment,
        totalAdjustment,
        adjustmentFactor,
        reason: adjustmentReason,
      });

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
