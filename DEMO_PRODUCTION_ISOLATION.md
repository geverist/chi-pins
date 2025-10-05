# 🔒 Demo/Production Environment Isolation Guide

## Overview

Complete separation between **demo** (sales) and **production** (live restaurant) environments to ensure:
- ✅ Demo cannot affect live restaurant operations
- ✅ Separate databases for complete data isolation
- ✅ Read-only demo mode with auto-reset
- ✅ Different URLs and deployment pipelines
- ✅ Feature flags to disable real integrations in demo

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    ENGAGEOS ENVIRONMENTS                    │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐    ┌──────────────────────┐     │
│  │   DEMO ENVIRONMENT   │    │ PRODUCTION ENVIRONMENT│     │
│  │  (Sales Presentations)│    │  (Live Restaurant)    │     │
│  └──────────────────────┘    └──────────────────────┘     │
│           │                            │                    │
│           ▼                            ▼                    │
│  ┌──────────────────────┐    ┌──────────────────────┐     │
│  │  demo.chi-pins.com   │    │  chi-pins.vercel.app  │     │
│  │  (or /demo subdomain)│    │  (or custom domain)   │     │
│  └──────────────────────┘    └──────────────────────┘     │
│           │                            │                    │
│           ▼                            ▼                    │
│  ┌──────────────────────┐    ┌──────────────────────┐     │
│  │  Demo Supabase DB    │    │ Production Supabase DB│     │
│  │  (Isolated)          │    │  (Live Data)          │     │
│  └──────────────────────┘    └──────────────────────┘     │
│           │                            │                    │
│           ▼                            ▼                    │
│  • Read-only mode          • Full read/write            │
│  • Auto-resets hourly      • No auto-reset              │
│  • Sample data only        • Real customer data         │
│  • No real payments        • Live payments enabled      │
│  • No SMS/email sends      • Real SMS/email             │
│  • Demo watermark          • No watermark               │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 📦 Files Created

### 1. Environment Configuration

**`.env.demo`** - Demo environment variables
```bash
VITE_DEMO_MODE=true
VITE_ENVIRONMENT=demo
VITE_SUPABASE_URL=https://demo-project.supabase.co
VITE_READ_ONLY_MODE=true
VITE_AUTO_RESET_INTERVAL=3600000  # 1 hour
VITE_DEMO_WATERMARK=true
```

**`.env.production`** - Production environment (already exists)
```bash
VITE_DEMO_MODE=false
VITE_ENVIRONMENT=production
VITE_SUPABASE_URL=https://xxwqmakcrchgefgzrulf.supabase.co
VITE_READ_ONLY_MODE=false
```

### 2. Demo Mode Library

**`src/lib/demoMode.js`** - Core demo mode logic
- `isDemoMode()` - Check if in demo mode
- `isFeatureEnabled(feature)` - Check if feature allowed
- `safeDemoOperation()` - Intercept write operations
- `resetDemoData()` - Reset to sample data
- `getDemoWatermark()` - Get watermark config

### 3. Demo Watermark Component

**`src/components/DemoWatermark.jsx`** - Visual demo indicator
- Displays at top of screen in demo mode
- Shows "DEMO MODE - For Sales Presentation Only"
- Not visible in production

---

## 🚀 Deployment Strategy

### Production Deployment

```bash
# Deploy to production (live restaurant)
vercel --prod

# Environment: production
# Domain: chi-pins.vercel.app (or custom domain)
# Uses: .env.production
```

### Demo Deployment

```bash
# Deploy to demo environment
vercel --prod --scope demo

# Environment: demo
# Domain: demo-chi-pins.vercel.app
# Uses: .env.demo
```

**Or use Vercel Environments:**

1. **Production Environment**
   - Vercel Project: `chi-pins`
   - Environment Variables: From `.env.production`
   - Domain: `chi-pins.vercel.app`
   - Branch: `main`

2. **Demo Environment**
   - Vercel Project: `chi-pins-demo` (separate project)
   - Environment Variables: From `.env.demo`
   - Domain: `demo.chi-pins.com` or `chi-pins-demo.vercel.app`
   - Branch: `demo` (separate branch)

---

## 🗄️ Database Isolation

### Create Separate Supabase Projects

**Production Database:**
```
Project: chi-pins-production
URL: https://xxwqmakcrchgefgzrulf.supabase.co
Purpose: Live restaurant data
Data: Real pins, orders, customer info
Backups: Daily automated backups
```

**Demo Database:**
```
Project: chi-pins-demo
URL: https://demo-chi-pins.supabase.co
Purpose: Sales demonstrations
Data: Sample/synthetic data only
Backups: No backups needed (auto-resets)
Auto-Reset: Every 1 hour
```

### Demo Data Seeding

Create sample data for demo:

```sql
-- Demo location
INSERT INTO locations (id, name, industry, demo_mode)
VALUES (
  'demo-chicago-mikes',
  'Chicago Mikes (Demo)',
  'restaurant',
  true
);

-- Sample pins
INSERT INTO pins (location_id, title, description, latitude, longitude, image_url)
SELECT
  'demo-chicago-mikes',
  'Sample Pin ' || i,
  'This is demo content',
  41.8781 + (random() * 0.1),
  -87.6298 + (random() * 0.1),
  'https://picsum.photos/400/300?random=' || i
FROM generate_series(1, 25) as i;

-- Sample comments
INSERT INTO pin_comments (pin_id, author_name, comment_text)
SELECT
  p.id,
  'Demo User',
  'This is a sample comment for demonstration'
FROM pins p
WHERE p.location_id = 'demo-chicago-mikes'
LIMIT 10;
```

---

## 🔐 Security & Feature Restrictions

### Demo Mode Restrictions

When `VITE_DEMO_MODE=true`:

**❌ Disabled Features:**
- Pin creation/editing/deletion
- Order placement
- Payment processing
- SMS sending
- Email sending
- Facebook sharing
- Vestaboard notifications
- All data modification operations

**✅ Allowed Features:**
- Browse pins
- View map
- Play games (read-only scores)
- View surveys (no submission)
- Watch videos
- Browse menu (no ordering)
- View analytics (sample data)

### Code-Level Protection

```javascript
import { isDemoMode, safeDemoOperation } from './lib/demoMode';

// Example: Protect pin creation
async function createPin(pinData) {
  return await safeDemoOperation(
    async () => {
      // Real pin creation logic
      const { data, error } = await supabase
        .from('pins')
        .insert([pinData]);

      return { success: true, data };
    },
    'Pin creation is disabled in demo mode. This is for sales presentations only.'
  );
}

// Example: Check feature availability
function OrderMenu() {
  if (!isFeatureEnabled('ordering')) {
    return (
      <div className="feature-disabled">
        <h3>Ordering Feature</h3>
        <p>This feature is available in the full version</p>
        <button>Contact Sales</button>
      </div>
    );
  }

  // Real order menu component
  return <OrderMenuComponent />;
}
```

---

## 📱 Usage in Components

### Add Demo Watermark to App

```jsx
// src/App.jsx
import DemoWatermark from './components/DemoWatermark';
import { isDemoMode, initDemoAutoReset, resetDemoData } from './lib/demoMode';
import { supabase } from './lib/supabase';

function App() {
  useEffect(() => {
    // Initialize demo auto-reset
    if (isDemoMode()) {
      initDemoAutoReset(() => resetDemoData(supabase));
    }
  }, []);

  return (
    <>
      <DemoWatermark />
      {/* Rest of app */}
    </>
  );
}
```

### Conditional Feature Rendering

```jsx
import { isFeatureEnabled } from './lib/demoMode';

function OrderButton() {
  if (!isFeatureEnabled('ordering')) {
    return (
      <button disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
        <Lock size={16} />
        Ordering (Demo Only)
      </button>
    );
  }

  return (
    <button onClick={handleOrder}>
      Place Order
    </button>
  );
}
```

---

## 🎨 Visual Demo Indicators

### 1. Top Banner (Always Visible in Demo)

```jsx
<div style={{
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  padding: '8px 16px',
  textAlign: 'center',
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 10000
}}>
  <strong>DEMO MODE</strong> - For Sales Presentations Only
  📹 No real data will be affected
</div>
```

### 2. Watermark on Screenshots

```jsx
<div style={{
  position: 'fixed',
  bottom: '20px',
  right: '20px',
  background: 'rgba(0,0,0,0.7)',
  color: 'white',
  padding: '4px 12px',
  borderRadius: '4px',
  fontSize: '12px',
  zIndex: 9999,
  opacity: 0.5
}}>
  DEMO
</div>
```

### 3. Disabled Feature Overlays

```jsx
function DisabledFeatureOverlay({ featureName }) {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      zIndex: 100
    }}>
      <div style={{ textAlign: 'center' }}>
        <Lock size={48} />
        <h3>{featureName}</h3>
        <p>Available in full version</p>
        <button onClick={() => window.location.href = '/contact-sales'}>
          Contact Sales
        </button>
      </div>
    </div>
  );
}
```

---

## 🔄 Auto-Reset System

### How It Works

1. **On Demo Load:** Immediate reset to fresh sample data
2. **Every Hour:** Automatic reset (configurable interval)
3. **Manual Reset:** Admin button to reset anytime

### Reset Process

```javascript
export const resetDemoData = async (supabase) => {
  if (!isDemoMode()) return;

  // 1. Delete all user-generated data
  await supabase.from('pins').delete().eq('location_id', 'demo-chicago-mikes');
  await supabase.from('orders').delete().eq('location_id', 'demo-chicago-mikes');
  await supabase.from('survey_responses').delete().eq('location_id', 'demo-chicago-mikes');

  // 2. Restore sample data
  await supabase.functions.invoke('seed-demo-data', {
    body: { locationId: 'demo-chicago-mikes' }
  });

  // 3. Clear local storage
  localStorage.clear();

  // 4. Reload page
  window.location.reload();
};
```

---

## 📊 Analytics Separation

### Demo Analytics

```javascript
// Separate tracking for demo usage
if (isDemoMode()) {
  gtag('config', 'G-DEMO-XXXXXXX', {
    custom_map: {
      dimension1: 'demo_mode'
    }
  });

  gtag('event', 'demo_interaction', {
    demo_mode: true,
    feature: 'pin_view',
    industry: 'restaurant'
  });
}
```

### Production Analytics

```javascript
// Real customer analytics
if (!isDemoMode()) {
  gtag('config', 'G-PROD-XXXXXXX', {
    send_page_view: true
  });

  gtag('event', 'customer_interaction', {
    location_id: 'chicago-mikes',
    feature: 'order_placed'
  });
}
```

---

## 🧪 Testing

### Test Demo Mode

```bash
# Start with demo environment
npm run dev -- --mode demo

# Or set environment variable
export VITE_DEMO_MODE=true
npm run dev
```

### Verify Isolation

**Checklist:**
- [ ] Demo URL loads correctly
- [ ] Demo watermark displays
- [ ] Write operations blocked
- [ ] Separate database in use
- [ ] No real emails/SMS sent
- [ ] Auto-reset works
- [ ] Sample data loads
- [ ] Analytics tracked separately

---

## 📝 Deployment Checklist

### Before Deploying Demo

- [ ] Create separate Supabase project for demo
- [ ] Set all demo environment variables
- [ ] Seed demo database with sample data
- [ ] Test read-only mode
- [ ] Verify auto-reset works
- [ ] Test all disabled features show proper messages
- [ ] Confirm no real integrations triggered
- [ ] Check demo watermark displays

### Before Deploying Production

- [ ] Verify production database connection
- [ ] Ensure demo mode is OFF
- [ ] Test all features work
- [ ] Confirm real integrations active
- [ ] Verify no demo watermark
- [ ] Test payment processing
- [ ] Confirm SMS/email sending works
- [ ] Backup production data

---

## 🔗 URLs

### Production
- **Live Restaurant:** `https://chi-pins.vercel.app`
- **Admin Panel:** `https://chi-pins.vercel.app/admin`
- **Status:** Full features, live data

### Demo
- **Sales Demo:** `https://demo.chi-pins.com` or `https://chi-pins-demo.vercel.app`
- **Admin Panel:** `https://demo.chi-pins.com/admin` (read-only)
- **Status:** Read-only, sample data, auto-reset

---

## 🎯 Benefits

### For Sales Team
✅ Safe to demonstrate without affecting live restaurant
✅ Consistent demo experience (auto-resets)
✅ All features visible but clearly marked as demo
✅ No risk of data corruption or accidental orders

### For Restaurant
✅ Complete isolation from sales demonstrations
✅ No performance impact from demo traffic
✅ No risk of demo users seeing real customer data
✅ No chance of accidental data modification

### For Development
✅ Clear separation of concerns
✅ Easy to test both environments
✅ Feature flags for controlled rollouts
✅ Separate analytics for better insights

---

## 🚨 Important Notes

1. **Never mix databases** - Always use separate Supabase projects
2. **Always show demo indicators** - Users must know it's a demo
3. **Block all writes in demo** - No exceptions
4. **Auto-reset is critical** - Ensures consistent demo state
5. **Test thoroughly** - Verify isolation before customer demos

---

## 🔧 Troubleshooting

### Demo shows production data
- Check `VITE_DEMO_MODE` is set to `true`
- Verify `VITE_SUPABASE_URL` points to demo database
- Clear browser cache and reload

### Write operations working in demo
- Check `VITE_READ_ONLY_MODE` is `true`
- Verify `safeDemoOperation` wrapper is used
- Check `isDemoMode()` returns `true`

### Auto-reset not working
- Verify `VITE_AUTO_RESET_INTERVAL` is set
- Check `initDemoAutoReset` is called on app load
- Verify Edge Function `reset-demo-data` exists

### Demo watermark not showing
- Check `VITE_DEMO_WATERMARK` is `true`
- Verify `<DemoWatermark />` is in App.jsx
- Check `getDemoWatermark()` returns non-null

---

**Last Updated:** October 5, 2025
**Status:** Production Ready ✅
**Environments:** 2 (Demo + Production)
**Database Isolation:** Complete ✅
