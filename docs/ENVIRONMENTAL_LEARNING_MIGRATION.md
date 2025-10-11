# Environmental Learning - Database Migration

## Overview
This migration adds environmental context tracking to the learning system, enabling the kiosk to adapt based on:
- **Geolocation changes** - Detect when kiosk is moved to a new location
- **Lighting conditions** - Track brightness and adjust behavior accordingly
- **Time-based patterns** - Analyze engagement by time of day and day of week
- **Entity detection** - Differentiate between humans and non-human figures (dogs, etc.)

## Database Changes

### Table: `proximity_learning_sessions`

Add the following columns to the existing `proximity_learning_sessions` table:

```sql
-- Environmental context fields
ALTER TABLE proximity_learning_sessions
ADD COLUMN lighting_level INTEGER,                    -- Raw brightness value (0-255) from camera
ADD COLUMN lighting_condition TEXT,                   -- Classified: 'bright', 'normal', 'dim', 'dark'
ADD COLUMN weather_condition TEXT,                    -- Estimated or from API: 'sunny', 'cloudy', 'stormy', null
ADD COLUMN latitude DECIMAL(10, 8),                   -- GPS latitude
ADD COLUMN longitude DECIMAL(11, 8),                  -- GPS longitude
ADD COLUMN entity_type TEXT DEFAULT 'human';          -- 'human', 'dog', 'cat', 'unknown'
```

### Column Descriptions

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `lighting_level` | INTEGER | Raw average brightness from camera (0-255) | 180 |
| `lighting_condition` | TEXT | Classified lighting: bright/normal/dim/dark | 'normal' |
| `weather_condition` | TEXT | Weather estimate or from API | 'sunny' |
| `latitude` | DECIMAL(10,8) | GPS latitude coordinate | 41.87811100 |
| `longitude` | DECIMAL(11,8) | GPS longitude coordinate | -87.62979900 |
| `entity_type` | TEXT | Type of detected entity | 'human' |

### Existing Time-Based Fields
These fields already exist and are used for time-based learning:
- `hour_of_day` (INTEGER) - Hour when session started (0-23)
- `day_of_week` (INTEGER) - Day of week (0=Sunday, 6=Saturday)

## Analytics Queries

### 1. Find Best Performing Time Periods
```sql
SELECT
  CASE
    WHEN hour_of_day >= 5 AND hour_of_day < 12 THEN 'morning'
    WHEN hour_of_day >= 12 AND hour_of_day < 17 THEN 'afternoon'
    WHEN hour_of_day >= 17 AND hour_of_day < 21 THEN 'evening'
    ELSE 'night'
  END as time_period,
  COUNT(*) as total_sessions,
  SUM(CASE WHEN outcome IN ('engaged', 'converted') THEN 1 ELSE 0 END) as engaged_sessions,
  ROUND(AVG(CASE WHEN outcome IN ('engaged', 'converted') THEN 1.0 ELSE 0.0 END) * 100, 2) as engagement_rate
FROM proximity_learning_sessions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY time_period
ORDER BY engagement_rate DESC;
```

### 2. Analyze Lighting Impact on Engagement
```sql
SELECT
  lighting_condition,
  COUNT(*) as total_sessions,
  SUM(CASE WHEN outcome IN ('engaged', 'converted') THEN 1 ELSE 0 END) as engaged_sessions,
  ROUND(AVG(CASE WHEN outcome IN ('engaged', 'converted') THEN 1.0 ELSE 0.0 END) * 100, 2) as engagement_rate,
  ROUND(AVG(lighting_level), 0) as avg_brightness
FROM proximity_learning_sessions
WHERE lighting_condition IS NOT NULL
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY lighting_condition
ORDER BY engagement_rate DESC;
```

### 3. Detect Location Changes
```sql
-- Find sessions where kiosk location changed significantly
SELECT
  id,
  started_at,
  latitude,
  longitude,
  LAG(latitude) OVER (ORDER BY started_at) as prev_lat,
  LAG(longitude) OVER (ORDER BY started_at) as prev_lng
FROM proximity_learning_sessions
WHERE latitude IS NOT NULL AND longitude IS NOT NULL
ORDER BY started_at DESC
LIMIT 100;
```

### 4. Weekday vs Weekend Performance
```sql
SELECT
  CASE WHEN day_of_week IN (0, 6) THEN 'weekend' ELSE 'weekday' END as day_type,
  COUNT(*) as total_sessions,
  SUM(CASE WHEN outcome IN ('engaged', 'converted') THEN 1 ELSE 0 END) as engaged_sessions,
  ROUND(AVG(CASE WHEN outcome IN ('engaged', 'converted') THEN 1.0 ELSE 0.0 END) * 100, 2) as engagement_rate
FROM proximity_learning_sessions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY day_type
ORDER BY engagement_rate DESC;
```

### 5. Entity Type Detection Stats
```sql
SELECT
  entity_type,
  COUNT(*) as detections,
  SUM(CASE WHEN outcome IN ('engaged', 'converted') THEN 1 ELSE 0 END) as engaged_count,
  ROUND(AVG(total_duration_ms) / 1000, 1) as avg_duration_seconds
FROM proximity_learning_sessions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY entity_type
ORDER BY detections DESC;
```

## Implementation Notes

### Geolocation Reset Logic
When the kiosk detects it has moved to a new location (>100m from previous location):
1. **Archive old learning data** with `location_changed=true` tag
2. **Reset baseline thresholds** to defaults for new environment
3. **Start fresh learning** for the new location
4. **Notify via SMS** that kiosk has been relocated

### Lighting Adaptation
The system automatically adjusts detection thresholds based on lighting:
- **Bright conditions** (>200): Increase motion sensitivity (people squint, move differently)
- **Normal conditions** (140-200): Standard thresholds
- **Dim conditions** (80-140): Reduce sensitivity to avoid false positives
- **Dark conditions** (<80): Consider disabling or using infrared if available

### Time-Based Learning
- **Morning (5am-12pm)**: Adjust for commuter traffic patterns
- **Afternoon (12pm-5pm)**: Peak foot traffic, optimize for high volume
- **Evening (5pm-9pm)**: After-work crowd, different engagement patterns
- **Night (9pm-5am)**: Low traffic, may want to enter sleep mode

### Entity Type Detection
Currently uses simple heuristics. For production:
```javascript
// Upgrade to TensorFlow.js object detection
import * as cocoSsd from '@tensorflow-models/coco-ssd';

const model = await cocoSsd.load();
const predictions = await model.detect(videoElement);

for (const prediction of predictions) {
  if (prediction.class === 'person') entityType = 'human';
  else if (prediction.class === 'dog') entityType = 'dog';
  else if (prediction.class === 'cat') entityType = 'cat';
}
```

## Migration Checklist

- [ ] Run SQL migration to add new columns
- [ ] Update Supabase types if using TypeScript
- [ ] Deploy updated `useLearningSession` hook
- [ ] Deploy updated `useProximityDetection` hook
- [ ] Deploy `environmentalLearning.js` utilities
- [ ] Test geolocation permission requests
- [ ] Test lighting classification
- [ ] Verify data is being saved with new fields
- [ ] Create dashboard to visualize environmental patterns
- [ ] Set up alerts for location changes
- [ ] Optional: Integrate weather API for accurate weather data
- [ ] Optional: Upgrade to TensorFlow.js for object detection

## Future Enhancements

1. **Weather API Integration**: Replace heuristic weather estimation with real API data (OpenWeather, etc.)
2. **Advanced Object Detection**: Upgrade from heuristics to TensorFlow.js COCO-SSD model
3. **Seasonal Patterns**: Track performance across seasons (summer vs winter engagement)
4. **Crowd Detection**: Detect and adapt to group sizes (single person vs crowd)
5. **Sound Level Detection**: Add microphone input to detect ambient noise and adjust accordingly
6. **Air Quality**: Integrate with air quality sensors for comprehensive environmental context

## References

- [TensorFlow.js Object Detection](https://www.tensorflow.org/js/models)
- [COCO-SSD Model](https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd)
- [OpenWeather API](https://openweathermap.org/api)
- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)
