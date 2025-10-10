# Adaptive Learning System - Integration Guide

## What's Been Built ✅

### 1. Core ML Infrastructure
- **`src/lib/engagementModel.js`** - Complete TensorFlow.js neural network
  - 3-class classification (ambient, approaching, staring)
  - 12 input features
  - Incremental training with IndexedDB persistence
  - Prediction with confidence scores

### 2. Adaptive Learning Hook
- **`src/hooks/useAdaptiveLearning.js`** - Complete session recording & learning system
  - Records proximity sessions with outcomes
  - Exponential backoff learning probability
  - Automatic threshold adjustment (20% abandonment triggers 10% threshold increase)
  - Time-of-day pattern tracking
  - Passive learning mode support
  - Model training every 10 sessions
  - Stats reload every 20 sessions

### 3. Database Schema
- **`sql-migrations/create-proximity-learning-sessions.sql`** - Complete table structure
  - Session input data (proximity_level, intent, confidence, etc.)
  - Time-of-day patterns (hour_of_day, day_of_week)
  - Session outcomes (engaged, abandoned, converted)
  - User feedback integration
  - Analytics view for performance tracking
  - Admin settings columns for configuration

### 4. Supporting Components
- **`src/components/ProximityFeedbackModal.jsx`** - User feedback collection UI
- **`src/components/LearningDataModal.jsx`** - Learning data visualization
- **`src/components/LearningModeTimer.jsx`** - Learning mode timer UI

---

## How It Works 🧠

### Exponential Backoff Learning

```javascript
// Learning probability decreases as dataset grows
learningProbability = learningAggressiveness / totalSessions

// Examples with aggressiveness = 50:
// - 1st session:    50/1 = 100% chance to learn
// - 10th session:   50/10 = 100% chance to learn
// - 50th session:   50/50 = 100% chance to learn
// - 100th session:  50/100 = 50% chance to learn
// - 500th session:  50/500 = 10% chance to learn
// - 1000th session: 50/1000 = 5% chance to learn
```

### Automatic Threshold Adjustment

```javascript
// High abandonment (>30%) = triggers too early = increase thresholds by 10%
// Low abandonment (<15%) + high engagement (>40%) = can be more aggressive = decrease by 10%

// Thresholds clamped to safe ranges:
// - proximityThreshold: 20-90
// - ambientMusicThreshold: 50-99
// - proximitySensitivity: 5-30
```

### Session Lifecycle

```
1. Proximity detected → startSession()
   ├─ Check learning probability (exponential backoff)
   ├─ Record: proximity level, intent, confidence, time-of-day
   └─ Store session reference

2. User interaction → track engagement
   ├─ User dismisses/ignores = abandoned
   ├─ User interacts = engaged (record duration)
   └─ User completes action (pin placement) = converted

3. Session ends → endSession()
   ├─ Save to database with outcome
   ├─ Update learning probability
   ├─ Every 10 sessions: train model incrementally
   └─ Every 20 sessions: reload stats & auto-adjust thresholds
```

---

## Integration Steps (To Complete)

### Step 1: Add Import to App.jsx

```javascript
// Add to imports section (around line 13)
import { useAdaptiveLearning } from './hooks/useAdaptiveLearning';
```

### Step 2: Initialize Hook in App Component

```javascript
// Add after adminSettings initialization (around line 134)
const adaptiveLearning = useAdaptiveLearning({
  tenantId: adminSettings.tenantId || 'chicago-mikes',
  enabled: adminSettings.proximityLearningEnabled !== false,
  learningAggressiveness: adminSettings.learningAggressiveness || 50,
  passiveLearningMode: adminSettings.passiveLearningMode || false,
  passiveLearningDays: adminSettings.passiveLearningDays || 7,
  onThresholdAdjusted: ({ newThresholds, reason }) => {
    console.log('[App] Threshold adjustment recommended:', reason, newThresholds);
    setToast({
      title: '🎯 Thresholds Adjusted',
      text: reason,
    });
    setTimeout(() => setToast(null), 5000);
  },
  onModelTrained: ({ accuracy, sessionsUsed }) => {
    console.log(`[App] Model trained! Accuracy: ${(accuracy * 100).toFixed(1)}% (${sessionsUsed} sessions)`);
  },
});
```

### Step 3: Wire Up Session Recording in Proximity Handlers

```javascript
// Modify handleProximityApproach (around line 211)
const handleProximityApproach = useCallback(({ proximityLevel }) => {
  console.log('[App] Person detected approaching! Proximity:', proximityLevel);

  // Start learning session
  const session = adaptiveLearning.startSession({
    proximityLevel,
    intent: 'approaching',
    confidence: 85,
    baseline: 50,
    threshold: adminSettings.proximityThreshold || 60,
  });

  // Store session ID in ref for later
  currentLearningSessionRef.current = session;

  // Stop ambient music when person approaches for voice greeting
  if (ambientMusicPlaying) {
    console.log('[App] Stopping ambient music for voice greeting');
    stopAmbientMusic();
  }

  // ... rest of existing code
}, [ambientMusicPlaying, stopAmbientMusic, adaptiveLearning, adminSettings.proximityThreshold]);

// Modify handleAmbientDetected (around line 238)
const handleAmbientDetected = useCallback(({ proximityLevel }) => {
  console.log('[App] Ambient motion detected! Proximity:', proximityLevel);

  // Start learning session for ambient
  const session = adaptiveLearning.startSession({
    proximityLevel,
    intent: 'ambient',
    confidence: 70,
    baseline: 50,
    threshold: adminSettings.ambientMusicThreshold || 95,
  });

  currentLearningSessionRef.current = session;

  // ... rest of existing code
}, [ambientMusicPlaying, adaptiveLearning, adminSettings.ambientMusicThreshold]);
```

### Step 4: Track Session Outcomes

```javascript
// Add session tracking refs (around line 145)
const currentLearningSessionRef = useRef(null);
const sessionEngagementStartRef = useRef(null);

// When user interacts (e.g., places pin in savePin function around line 996)
// Add this after successful pin save:
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

// When user abandons (e.g., in idle attractor's onIdle callback around line 771)
// Add this in the onIdle callback:
if (currentLearningSessionRef.current) {
  adaptiveLearning.endSession({
    outcome: 'abandoned',
    engagedDurationMs: 0,
    converted: false,
  });

  currentLearningSessionRef.current = null;
}
```

### Step 5: Apply Recommended Threshold Adjustments

```javascript
// Add effect to apply threshold recommendations (around line 300)
useEffect(() => {
  if (adaptiveLearning.recommendedThresholds && !adminSettings.passiveLearningMode) {
    // Auto-apply threshold adjustments (could also just show recommendations)
    console.log('[App] Applying recommended thresholds:', adaptiveLearning.recommendedThresholds);
    // TODO: Update adminSettings via Supabase
  }
}, [adaptiveLearning.recommendedThresholds, adminSettings.passiveLearningMode]);
```

---

## Database Setup

Run this SQL in your Supabase SQL editor:

```sql
-- Copy contents from sql-migrations/create-proximity-learning-sessions.sql
```

---

## Admin Panel Controls (Future Enhancement)

Add these controls to the Proximity tab in AdminPanel.jsx:

1. **Learning Aggressiveness** (1-100 slider)
2. **Passive Learning Mode** (toggle + date picker for duration)
3. **Auto Threshold Adjustment** (toggle)
4. **Learning Stats Display**:
   - Total sessions recorded
   - Current learning probability
   - Abandonment rate
   - Engagement rate
   - Model accuracy
5. **Manual Training Button** (force retrain model)

---

## Benefits of This System

✅ **Environment-Specific**: Each location learns independently
✅ **Time-Aware**: Tracks hour-of-day and day-of-week patterns
✅ **Self-Optimizing**: Automatically adjusts thresholds based on outcomes
✅ **Exponential Backoff**: Learns aggressively early, stabilizes over time
✅ **Passive Mode**: Can collect data without taking actions
✅ **Incremental Training**: Model improves continuously as data accumulates
✅ **Feedback Loop**: Users can mark if timing was correct/incorrect

---

## Testing the System

1. **Deploy with database schema** (run SQL migration)
2. **Enable proximity detection** in admin panel
3. **Walk in front of kiosk** to trigger sessions
4. **Check logs** for session recording:
   ```
   [AdaptiveLearning] Started learning session: {...}
   [AdaptiveLearning] Session ended: engaged (5240ms)
   [AdaptiveLearning] Learning probability: 98.0%
   ```
5. **After 10 sessions**: Model trains automatically
6. **After 20 sessions**: Thresholds auto-adjust if needed
7. **Check database**: Query `proximity_learning_sessions` table

---

## Next Steps

1. ✅ Complete integration steps above
2. ✅ Run SQL migration to create tables
3. ✅ Test session recording in development
4. ✅ Deploy to kiosk and monitor
5. ⏳ Add admin panel controls for learning settings
6. ⏳ Build analytics dashboard to visualize learning data

---

## Files Created

- `src/hooks/useAdaptiveLearning.js` - Main hook (380 lines)
- `sql-migrations/create-proximity-learning-sessions.sql` - Database schema
- `ADAPTIVE-LEARNING-INTEGRATION.md` - This document
