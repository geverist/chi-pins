# ⏰ Widget Scheduling & Time-Based Control System

## Overview

Enable **intelligent widget activation/deactivation** based on time of day, day of week, business hours, and custom schedules to:
- **Maximize revenue** during peak times (disable distractions, focus on ordering)
- **Increase engagement** during slow times (enable games, entertainment)
- **Respect business hours** (disable widgets when closed)
- **Support special events** (activate specific widgets for promotions)

---

## 🎯 Use Cases

### Restaurant Example

**Lunch Rush (11:30 AM - 1:30 PM)**
- ✅ **ENABLED:** Order Menu, Upsell Engine, POS Integration, Queue Management
- ❌ **DISABLED:** Games, Photo Booth, Jukebox, Then & Now

**Dinner Service (5:30 PM - 9:00 PM)**
- ✅ **ENABLED:** Order Menu, Upsell Engine, POS Integration, Queue Management
- ❌ **DISABLED:** Games, Photo Booth

**Off-Peak Hours (2:00 PM - 5:00 PM)**
- ✅ **ENABLED:** Games, Photo Booth, Jukebox, Survey, Birthday Club Sign-up
- ⚠️ **REDUCED PRIORITY:** Order Menu (still available but not prominent)

**Late Night (9:00 PM - Close)**
- ✅ **ENABLED:** Survey, Reviews, Feedback, Photo Booth, Games
- ❌ **DISABLED:** Order Menu (kitchen closed)

---

### Auto Dealership Example

**Service Drive Hours (7:00 AM - 6:00 PM Monday-Friday)**
- ✅ **ENABLED:** Service Check-in, Queue Management, Upsell Engine, Video (service explainers)
- ❌ **DISABLED:** Games, Entertainment content

**Showroom Hours (9:00 AM - 8:00 PM)**
- ✅ **ENABLED:** Vehicle Configurator, Financing Calculator, Trade-in Estimator, Upsell Engine
- ⚠️ **REDUCED:** Games (available but not prioritized)

**Weekends (Saturday 9 AM - 6 PM)**
- ✅ **ENABLED:** All engagement widgets (more leisurely shopping)
- ✅ **FEATURED:** Photo Booth ("My New Car" selfies), Games, Surveys

**After Hours (Closed)**
- ✅ **ENABLED:** Inventory Browse, Photo Booth, "Schedule Appointment" forms
- ❌ **DISABLED:** Service check-in, Sales team contact

---

### Fitness Studio Example

**Class Times (6:00 AM - 9:00 AM, 5:00 PM - 8:00 PM)**
- ✅ **ENABLED:** Class Check-in, Queue Management, Access Control, Locker Assignment
- ❌ **DISABLED:** Games, Entertainment, Surveys

**Mid-Day Lull (10:00 AM - 4:00 PM)**
- ✅ **ENABLED:** Games, Challenges, Progress Tracking, Surveys, Membership Upsells
- ⚠️ **REDUCED:** Check-in (fewer people arriving)

**Early Morning (5:00 AM - 6:00 AM)**
- ✅ **ENABLED:** Quick Check-in Only
- ❌ **DISABLED:** Everything else (minimize distractions)

---

## 🏗️ Architecture

### Widget Schedule Configuration

Each installed widget can have multiple schedule rules:

```json
{
  "widget_id": "gaming-widget",
  "location_id": "abc123",
  "schedule_rules": [
    {
      "id": "lunch-disable",
      "enabled": false,
      "priority": "high",
      "days_of_week": [1, 2, 3, 4, 5],  // Monday-Friday
      "start_time": "11:30",
      "end_time": "13:30",
      "timezone": "America/Chicago",
      "reason": "Disable games during lunch rush"
    },
    {
      "id": "dinner-disable",
      "enabled": false,
      "priority": "high",
      "days_of_week": [1, 2, 3, 4, 5, 6, 0],  // All week
      "start_time": "17:30",
      "end_time": "21:00",
      "timezone": "America/Chicago",
      "reason": "Disable games during dinner service"
    },
    {
      "id": "off-peak-enable",
      "enabled": true,
      "priority": "low",
      "days_of_week": [1, 2, 3, 4, 5],
      "start_time": "14:00",
      "end_time": "17:00",
      "timezone": "America/Chicago",
      "reason": "Enable games during slow period"
    }
  ],
  "default_enabled": true,  // Default state when no rules match
  "override_enabled": null  // Manual override (null = use schedule, true/false = force)
}
```

---

### Schedule Priority Levels

When multiple rules conflict, priority determines which wins:

1. **Manual Override** (highest priority)
   - Admin can manually enable/disable, ignoring schedule
   - Persists until admin removes override

2. **High Priority Rules**
   - Business-critical operations (ordering, check-in)
   - Revenue-generating activities
   - Cannot be overridden by lower-priority rules

3. **Medium Priority Rules**
   - Engagement features (games, surveys)
   - Content rotation
   - Can be overridden by high-priority rules

4. **Low Priority Rules**
   - Ambient content (videos, idle screens)
   - Can be overridden by any higher-priority rule

5. **Default State** (lowest priority)
   - Fallback when no rules match

---

### Schedule Rule Types

#### 1. **Time of Day Rules**
Enable/disable widgets based on specific hours

```json
{
  "type": "time_of_day",
  "start_time": "11:30",  // 24-hour format
  "end_time": "13:30",
  "enabled": false,  // Disable during this time
  "reason": "Lunch rush - focus on orders"
}
```

#### 2. **Day of Week Rules**
Different schedules for different days

```json
{
  "type": "day_of_week",
  "days_of_week": [6, 0],  // Saturday, Sunday
  "enabled": true,
  "reason": "Enable games on weekends"
}
```

#### 3. **Business Hours Rules**
Sync with location's operating hours

```json
{
  "type": "business_hours",
  "match": "open",  // or "closed"
  "enabled": true,
  "reason": "Enable only when business is open"
}
```

#### 4. **Date Range Rules**
Special events, holidays, promotions

```json
{
  "type": "date_range",
  "start_date": "2025-12-01",
  "end_date": "2025-12-31",
  "enabled": true,
  "reason": "Holiday promotion widget"
}
```

#### 5. **Recurring Event Rules**
Repeating special events

```json
{
  "type": "recurring",
  "recurrence": "weekly",  // daily, weekly, monthly
  "day_of_week": 2,  // Tuesday
  "start_time": "17:00",
  "end_time": "20:00",
  "enabled": true,
  "reason": "Taco Tuesday promotion"
}
```

#### 6. **Conditional Rules**
Based on other system state

```json
{
  "type": "conditional",
  "condition": "queue_length > 5",
  "enabled": false,
  "reason": "Disable games when queue is long"
}
```

---

## 📊 Database Schema

```sql
-- Add to existing location_widgets table
ALTER TABLE location_widgets
ADD COLUMN schedule_rules JSONB DEFAULT '[]'::jsonb,
ADD COLUMN default_enabled BOOLEAN DEFAULT true,
ADD COLUMN override_enabled BOOLEAN DEFAULT NULL,
ADD COLUMN last_schedule_check TIMESTAMPTZ;

-- Create index for fast schedule lookups
CREATE INDEX idx_location_widgets_schedule ON location_widgets USING GIN(schedule_rules);

-- Widget activation log (for analytics)
CREATE TABLE widget_activation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL,
  widget_id UUID NOT NULL REFERENCES marketplace_widgets(id),

  -- State change
  previous_state BOOLEAN NOT NULL,
  new_state BOOLEAN NOT NULL,

  -- Reason for change
  trigger_type TEXT NOT NULL,  -- schedule_rule, manual_override, conditional, default
  trigger_id TEXT,  -- ID of the schedule rule that triggered this
  reason TEXT,

  -- Timestamp
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activation_log_location ON widget_activation_log(location_id);
CREATE INDEX idx_activation_log_widget ON widget_activation_log(widget_id);
CREATE INDEX idx_activation_log_timestamp ON widget_activation_log(timestamp);

-- Widget schedule templates (pre-built schedules for industries)
CREATE TABLE widget_schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  description TEXT,

  -- Template rules
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example templates
INSERT INTO widget_schedule_templates (name, industry, description, rules)
VALUES (
  'Restaurant Peak Hours',
  'restaurant',
  'Disable entertainment widgets during peak dining hours',
  '[
    {
      "widget_categories": ["content", "entertainment"],
      "enabled": false,
      "days_of_week": [1,2,3,4,5],
      "start_time": "11:30",
      "end_time": "13:30",
      "reason": "Lunch rush - focus on orders"
    },
    {
      "widget_categories": ["content", "entertainment"],
      "enabled": false,
      "days_of_week": [1,2,3,4,5,6,0],
      "start_time": "17:30",
      "end_time": "21:00",
      "reason": "Dinner service - minimize distractions"
    }
  ]'::jsonb
);
```

---

## 💻 Implementation (React Component)

### Widget Scheduler UI

```jsx
// src/components/WidgetScheduler.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function WidgetScheduler({ locationId, widgetId }) {
  const [rules, setRules] = useState([]);
  const [defaultEnabled, setDefaultEnabled] = useState(true);
  const [overrideEnabled, setOverrideEnabled] = useState(null);

  useEffect(() => {
    loadSchedule();
  }, [locationId, widgetId]);

  async function loadSchedule() {
    const { data, error } = await supabase
      .from('location_widgets')
      .select('schedule_rules, default_enabled, override_enabled')
      .eq('location_id', locationId)
      .eq('widget_id', widgetId)
      .single();

    if (data) {
      setRules(data.schedule_rules || []);
      setDefaultEnabled(data.default_enabled ?? true);
      setOverrideEnabled(data.override_enabled);
    }
  }

  async function saveSchedule() {
    const { error } = await supabase
      .from('location_widgets')
      .update({
        schedule_rules: rules,
        default_enabled: defaultEnabled,
        override_enabled: overrideEnabled
      })
      .eq('location_id', locationId)
      .eq('widget_id', widgetId);

    if (error) {
      alert('Error saving schedule: ' + error.message);
    } else {
      alert('Schedule saved successfully!');
    }
  }

  function addRule() {
    setRules([...rules, {
      id: `rule-${Date.now()}`,
      enabled: true,
      priority: 'medium',
      days_of_week: [1, 2, 3, 4, 5],
      start_time: '09:00',
      end_time: '17:00',
      reason: ''
    }]);
  }

  function updateRule(index, field, value) {
    const updated = [...rules];
    updated[index] = { ...updated[index], [field]: value };
    setRules(updated);
  }

  function deleteRule(index) {
    setRules(rules.filter((_, i) => i !== index));
  }

  return (
    <div style={styles.container}>
      <h3>Widget Schedule</h3>

      <div style={styles.section}>
        <label style={styles.label}>
          <input
            type="checkbox"
            checked={overrideEnabled !== null}
            onChange={e => setOverrideEnabled(e.target.checked ? true : null)}
          />
          Manual Override
        </label>
        {overrideEnabled !== null && (
          <label style={styles.label}>
            <input
              type="radio"
              checked={overrideEnabled === true}
              onChange={() => setOverrideEnabled(true)}
            />
            Force Enabled
            <input
              type="radio"
              checked={overrideEnabled === false}
              onChange={() => setOverrideEnabled(false)}
            />
            Force Disabled
          </label>
        )}
      </div>

      <div style={styles.section}>
        <h4>Schedule Rules</h4>
        {rules.map((rule, index) => (
          <div key={rule.id} style={styles.rule}>
            <div style={styles.ruleHeader}>
              <select
                value={rule.enabled}
                onChange={e => updateRule(index, 'enabled', e.target.value === 'true')}
                style={styles.input}
              >
                <option value="true">Enable</option>
                <option value="false">Disable</option>
              </select>

              <select
                value={rule.priority}
                onChange={e => updateRule(index, 'priority', e.target.value)}
                style={styles.input}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>

              <button style={styles.deleteBtn} onClick={() => deleteRule(index)}>
                Delete
              </button>
            </div>

            <div style={styles.ruleBody}>
              <label style={styles.label}>
                Days of Week:
                <div style={styles.daysGrid}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dayIndex) => (
                    <label key={dayIndex} style={styles.dayCheckbox}>
                      <input
                        type="checkbox"
                        checked={rule.days_of_week?.includes(dayIndex)}
                        onChange={e => {
                          const days = rule.days_of_week || [];
                          const updated = e.target.checked
                            ? [...days, dayIndex]
                            : days.filter(d => d !== dayIndex);
                          updateRule(index, 'days_of_week', updated);
                        }}
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </label>

              <div style={styles.timeRow}>
                <label style={styles.label}>
                  Start Time:
                  <input
                    type="time"
                    value={rule.start_time}
                    onChange={e => updateRule(index, 'start_time', e.target.value)}
                    style={styles.input}
                  />
                </label>

                <label style={styles.label}>
                  End Time:
                  <input
                    type="time"
                    value={rule.end_time}
                    onChange={e => updateRule(index, 'end_time', e.target.value)}
                    style={styles.input}
                  />
                </label>
              </div>

              <label style={styles.label}>
                Reason:
                <input
                  type="text"
                  value={rule.reason}
                  onChange={e => updateRule(index, 'reason', e.target.value)}
                  style={styles.input}
                  placeholder="E.g., Lunch rush - disable games"
                />
              </label>
            </div>
          </div>
        ))}

        <button style={styles.addBtn} onClick={addRule}>
          + Add Schedule Rule
        </button>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>
          <input
            type="checkbox"
            checked={defaultEnabled}
            onChange={e => setDefaultEnabled(e.target.checked)}
          />
          Default Enabled (when no rules match)
        </label>
      </div>

      <button style={styles.saveBtn} onClick={saveSchedule}>
        Save Schedule
      </button>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  section: {
    marginBottom: '30px',
    paddingBottom: '30px',
    borderBottom: '1px solid #e5e7eb'
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '12px',
    fontSize: '14px',
    fontWeight: '600'
  },
  rule: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px'
  },
  ruleHeader: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px'
  },
  ruleBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  input: {
    padding: '8px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px'
  },
  daysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px'
  },
  dayCheckbox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontSize: '12px'
  },
  timeRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  },
  deleteBtn: {
    padding: '8px 16px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    marginLeft: 'auto'
  },
  addBtn: {
    padding: '10px 20px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  saveBtn: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
  }
};
```

---

## ⚙️ Schedule Evaluation Engine

```javascript
// src/lib/widgetScheduler.js

/**
 * Evaluate if a widget should be enabled right now
 * based on its schedule rules
 */
export function isWidgetEnabled(widgetConfig, currentTime = new Date()) {
  const {
    schedule_rules = [],
    default_enabled = true,
    override_enabled = null
  } = widgetConfig;

  // 1. Check manual override (highest priority)
  if (override_enabled !== null) {
    return override_enabled;
  }

  // 2. Evaluate schedule rules by priority
  const sortedRules = [...schedule_rules].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  for (const rule of sortedRules) {
    if (matchesScheduleRule(rule, currentTime)) {
      return rule.enabled;
    }
  }

  // 3. No rules matched, use default
  return default_enabled;
}

/**
 * Check if a schedule rule matches the current time
 */
function matchesScheduleRule(rule, currentTime) {
  const dayOfWeek = currentTime.getDay();
  const timeStr = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;

  // Check day of week
  if (rule.days_of_week && !rule.days_of_week.includes(dayOfWeek)) {
    return false;
  }

  // Check time range
  if (rule.start_time && rule.end_time) {
    if (timeStr < rule.start_time || timeStr >= rule.end_time) {
      return false;
    }
  }

  // Check date range
  if (rule.start_date && rule.end_date) {
    const currentDate = currentTime.toISOString().split('T')[0];
    if (currentDate < rule.start_date || currentDate > rule.end_date) {
      return false;
    }
  }

  return true;
}

/**
 * Get all enabled widgets for a location at current time
 */
export async function getEnabledWidgets(locationId, currentTime = new Date()) {
  const { data: locationWidgets } = await supabase
    .from('location_widgets')
    .select('*, widgets:widget_id(*)')
    .eq('location_id', locationId)
    .eq('status', 'active');

  return locationWidgets.filter(lw => isWidgetEnabled(lw, currentTime));
}

/**
 * Schedule checker (runs every minute)
 */
export async function checkSchedules(locationId) {
  const { data: locationWidgets } = await supabase
    .from('location_widgets')
    .select('*')
    .eq('location_id', locationId)
    .eq('status', 'active');

  const currentTime = new Date();
  const updates = [];

  for (const widget of locationWidgets) {
    const shouldBeEnabled = isWidgetEnabled(widget, currentTime);
    const currentlyEnabled = widget.currently_enabled ?? widget.default_enabled;

    if (shouldBeEnabled !== currentlyEnabled) {
      // State changed - log it
      await supabase.from('widget_activation_log').insert({
        location_id: locationId,
        widget_id: widget.widget_id,
        previous_state: currentlyEnabled,
        new_state: shouldBeEnabled,
        trigger_type: 'schedule_rule',
        timestamp: currentTime
      });

      // Update widget state
      updates.push({
        id: widget.id,
        currently_enabled: shouldBeEnabled,
        last_schedule_check: currentTime
      });
    }
  }

  // Batch update
  if (updates.length > 0) {
    for (const update of updates) {
      await supabase
        .from('location_widgets')
        .update(update)
        .eq('id', update.id);
    }
  }

  return updates;
}

/**
 * Initialize schedule checker (runs every minute)
 */
export function initScheduleChecker(locationId) {
  // Check immediately
  checkSchedules(locationId);

  // Then every minute
  setInterval(() => {
    checkSchedules(locationId);
  }, 60000); // 60 seconds
}
```

---

## 📋 Pre-Built Schedule Templates

### Restaurant Templates

#### 1. **Peak Hours Focus**
```json
{
  "name": "Peak Hours - Orders Only",
  "rules": [
    {
      "widget_categories": ["entertainment", "content"],
      "enabled": false,
      "days_of_week": [1, 2, 3, 4, 5],
      "start_time": "11:30",
      "end_time": "13:30",
      "priority": "high",
      "reason": "Lunch rush - disable distractions"
    },
    {
      "widget_categories": ["entertainment", "content"],
      "enabled": false,
      "days_of_week": [1, 2, 3, 4, 5, 6, 0],
      "start_time": "17:30",
      "end_time": "21:00",
      "priority": "high",
      "reason": "Dinner service - minimize distractions"
    }
  ]
}
```

#### 2. **Off-Peak Engagement**
```json
{
  "name": "Off-Peak Games & Entertainment",
  "rules": [
    {
      "widget_categories": ["entertainment", "content"],
      "enabled": true,
      "days_of_week": [1, 2, 3, 4, 5],
      "start_time": "14:00",
      "end_time": "17:00",
      "priority": "medium",
      "reason": "Slow period - engage customers"
    },
    {
      "widget_categories": ["entertainment", "content"],
      "enabled": true,
      "days_of_week": [1, 2, 3, 4, 5],
      "start_time": "21:00",
      "end_time": "23:00",
      "priority": "medium",
      "reason": "Post-dinner - feedback & engagement"
    }
  ]
}
```

---

### Auto Dealership Templates

#### 1. **Service Drive Focus**
```json
{
  "name": "Service Drive - Check-in Only",
  "rules": [
    {
      "widget_slugs": ["service-checkin", "queue-management", "upsell-engine"],
      "enabled": true,
      "days_of_week": [1, 2, 3, 4, 5],
      "start_time": "07:00",
      "end_time": "18:00",
      "priority": "high",
      "reason": "Service hours - focus on check-in"
    },
    {
      "widget_categories": ["entertainment"],
      "enabled": false,
      "days_of_week": [1, 2, 3, 4, 5],
      "start_time": "07:00",
      "end_time": "18:00",
      "priority": "high",
      "reason": "Service hours - disable games"
    }
  ]
}
```

---

### Fitness Studio Templates

#### 1. **Class Time - Quick Check-in**
```json
{
  "name": "Class Time - Minimal Distractions",
  "rules": [
    {
      "widget_slugs": ["access-control", "class-checkin"],
      "enabled": true,
      "days_of_week": [1, 2, 3, 4, 5],
      "start_time": "06:00",
      "end_time": "09:00",
      "priority": "high",
      "reason": "Morning classes - quick check-in"
    },
    {
      "widget_categories": ["entertainment", "content"],
      "enabled": false,
      "days_of_week": [1, 2, 3, 4, 5],
      "start_time": "06:00",
      "end_time": "09:00",
      "priority": "high",
      "reason": "Morning classes - minimize distractions"
    }
  ]
}
```

---

## 🎯 Benefits

### For Business Owners

1. **Maximize Revenue:**
   - Focus on orders during peak times
   - Reduce distractions when customers are ready to buy

2. **Increase Engagement:**
   - Activate entertainment during slow periods
   - Keep customers engaged while waiting

3. **Operational Efficiency:**
   - Automatically adapt kiosk to business rhythm
   - No manual intervention required

4. **Analytics:**
   - Track when widgets are most effective
   - Optimize schedules based on data

### For Customers

1. **Better Experience:**
   - Relevant content at the right time
   - Quick ordering when busy, entertainment when relaxed

2. **Faster Service:**
   - No distractions during peak hours
   - Streamlined ordering process

---

## 📊 Analytics

Track widget activation patterns:

```sql
-- Widget usage by time of day
SELECT
  EXTRACT(HOUR FROM timestamp) as hour,
  widget_id,
  COUNT(CASE WHEN new_state = true THEN 1 END) as activations,
  COUNT(CASE WHEN new_state = false THEN 1 END) as deactivations
FROM widget_activation_log
WHERE location_id = 'abc123'
  AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY hour, widget_id
ORDER BY hour;

-- Most scheduled widgets
SELECT
  w.name,
  COUNT(*) as schedule_changes,
  AVG(CASE WHEN new_state = true THEN 1 ELSE 0 END) as avg_enabled_pct
FROM widget_activation_log wal
JOIN marketplace_widgets w ON w.id = wal.widget_id
WHERE wal.location_id = 'abc123'
  AND wal.timestamp > NOW() - INTERVAL '30 days'
GROUP BY w.name
ORDER BY schedule_changes DESC;
```

---

## 🚀 Future Enhancements

1. **AI-Powered Scheduling:**
   - Learn optimal widget schedules from customer behavior
   - Automatically suggest schedule adjustments

2. **Conditional Rules:**
   - Enable/disable based on queue length, weather, etc.
   - Dynamic prioritization based on real-time data

3. **Multi-Location Sync:**
   - Apply same schedule to multiple locations
   - Chain-wide schedule templates

4. **Performance Metrics:**
   - Compare revenue with/without widget schedules
   - A/B test different scheduling strategies

---

## ✅ Implementation Checklist

- [x] Database schema design
- [x] Schedule evaluation engine
- [x] Widget scheduler UI component
- [x] Pre-built schedule templates
- [ ] Backend API endpoints
- [ ] Real-time schedule checker (cron job)
- [ ] Analytics dashboard
- [ ] Mobile-friendly schedule editor
- [ ] Template marketplace

---

**Next Steps:**
1. Implement backend API for schedule management
2. Add WidgetScheduler component to admin panel
3. Create schedule checker background job
4. Build analytics dashboard for schedule optimization
