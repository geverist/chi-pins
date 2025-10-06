# Admin Login & Setup Guide

## Overview

EngageOS now features a secure admin login system with a guided setup wizard. Business owners and managers can easily configure their kiosk through an intuitive, step-by-step process.

---

## Features

### 🔐 Secure Authentication
- **Email & Password**: Traditional login with strong password requirements
- **Magic Links**: Passwordless login via email
- **Supabase Auth**: Enterprise-grade security with Row-Level Security (RLS)
- **Session Management**: Automatic session handling and refresh

### 🧙 Setup Wizard
First-time users are guided through a 5-step wizard:

**Step 1: Business Name**
- Enter your business name (appears on kiosk welcome screen)

**Step 2: Industry Selection**
- Choose from 9 industries with pre-configured features:
  - 🍔 Restaurant & QSR
  - 💆 Med Spa & Wellness
  - 🚗 Auto Dealership
  - 💊 Healthcare & Dental
  - 💪 Fitness Center
  - 🛍️ Retail Store
  - 🏦 Bank / Credit Union
  - 🏨 Hotel / Airbnb
  - 🎉 Events & Weddings

**Step 3: Brand Colors**
- Visual color picker with live preview
- Pre-selected industry colors or custom hex values
- See your brand color applied in real-time

**Step 4: Location Details**
- Number of locations (volume discount calculator)
- Optional phone number for SMS/voice features

**Step 5: Review & Complete**
- Summary of all settings
- One-click setup completion
- Automatic configuration of your kiosk

### 🎯 Key Benefits
- **Zero Configuration**: Industry defaults get you started instantly
- **Visual Wizards**: No technical knowledge required
- **Guided Setup**: Step-by-step with helpful hints
- **Save Progress**: Exit and return anytime
- **Instant Preview**: See changes in real-time

---

## For Business Owners

### Getting Started

1. **Access Admin Panel**
   - Click the admin icon on your kiosk (usually hidden in corner)
   - Or visit: `https://yourdomain.com` and access admin

2. **Create Account**
   - Click "Sign up" on login screen
   - Enter your business email
   - Create a strong password (min 6 characters)
   - Check your email to confirm account

3. **Complete Setup Wizard**
   - Follow the 5-step guided setup
   - Choose your industry for pre-configured features
   - Customize brand colors to match your business
   - Enter location details

4. **Start Managing**
   - Configure games, voice agent, and more
   - Upload custom content
   - View analytics and reports

### Login Options

**Email & Password**
```
1. Enter your email
2. Enter your password
3. Click "Sign In"
```

**Magic Link (Recommended for Quick Access)**
```
1. Enter your email
2. Click "Email me a login link"
3. Check your email
4. Click the login link
5. Automatically signed in!
```

### Forgot Password?
- Use "Email me a login link" for instant access
- Or contact support: hello@agentiosk.com

---

## For Developers

### Architecture

**Components:**
- `AdminLogin.jsx` - Authentication UI
- `SetupWizard.jsx` - Onboarding flow
- `AdminRoute.jsx` - Protected route wrapper
- Database: `business_config` table

**Auth Flow:**
```
User visits admin → AdminRoute checks auth
  ↓ Not logged in
  → Show AdminLogin
  ↓ Login successful
  → Check business_config
    ↓ First time
    → Show SetupWizard
    ↓ Setup complete
    → Show AdminPanel
```

### Database Schema

```sql
business_config {
  id: UUID
  user_id: UUID (FK to auth.users)
  business_name: TEXT
  industry: TEXT
  primary_color: TEXT
  locations: INTEGER
  phone_number: TEXT
  setup_completed: BOOLEAN
  features: JSONB
  custom_domain: TEXT
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}
```

### RLS Policies

Users can only:
- View their own config
- Insert their own config
- Update their own config

```sql
-- Example RLS policy
CREATE POLICY "Users can view own business config"
  ON business_config FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

### Integration

**Wrap admin panel with AdminRoute:**
```jsx
import AdminRoute from './components/AdminRoute'

{adminOpen && (
  <AdminRoute>
    <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} />
  </AdminRoute>
)}
```

**Access user context:**
```jsx
const { user, businessConfig } = useAuth()
// user: Supabase auth user
// businessConfig: business_config row
```

### API Examples

**Load business config:**
```javascript
const { data, error } = await supabase
  .from('business_config')
  .select('*')
  .eq('user_id', user.id)
  .single()
```

**Update business config:**
```javascript
const { error } = await supabase
  .from('business_config')
  .upsert({
    user_id: user.id,
    business_name: 'My Business',
    industry: 'restaurant',
    primary_color: '#ef4444',
    setup_completed: true
  })
```

---

## Setup Wizard Customization

### Adding New Industries

1. **Update database constraint:**
```sql
ALTER TABLE business_config
  DROP CONSTRAINT business_config_industry_check;

ALTER TABLE business_config
  ADD CONSTRAINT business_config_industry_check
  CHECK (industry IN ('restaurant', 'medspa', ..., 'your_new_industry'));
```

2. **Add to SetupWizard.jsx:**
```javascript
const industries = [
  ...
  { id: 'your_new_industry', name: '🎭 Your Industry', color: '#hexcode' },
]
```

3. **Create industry config:**
```javascript
// src/config/industryConfigs.js
export const industryConfigs = {
  ...
  your_new_industry: {
    name: "Your Business",
    brandColor: "#hexcode",
    // ... other config
  }
}
```

### Customizing Wizard Steps

**Add new step:**
```javascript
// In SetupWizard.jsx
case 6:
  return (
    <div style={styles.stepContent}>
      <h2>Your New Step</h2>
      {/* Your custom form */}
    </div>
  )
```

**Modify progress bar:**
```javascript
{[1, 2, 3, 4, 5, 6].map((s) => (
  <div key={s} style={styles.progressStep} />
))}
```

---

## Security Best Practices

### For Business Owners

✅ **DO:**
- Use a strong, unique password
- Enable two-factor authentication (coming soon)
- Keep your login credentials private
- Log out on shared devices
- Use magic links for quick, secure access

❌ **DON'T:**
- Share your password with employees
- Use the same password across multiple services
- Stay logged in on public computers

### For Developers

✅ **DO:**
- Use Supabase RLS policies for all queries
- Validate all inputs on client and server
- Use parameterized queries
- Keep Supabase keys in environment variables
- Implement rate limiting

❌ **DON'T:**
- Expose service role keys
- Bypass RLS policies
- Store sensitive data in localStorage
- Trust client-side validation alone

---

## Troubleshooting

### "Please check your email to confirm your account"

**Cause**: Email confirmation required for new signups
**Solution**: Check your inbox (and spam folder) for confirmation email

---

### "Invalid login credentials"

**Cause**: Wrong email or password
**Solution**:
1. Use "Email me a login link" instead
2. Or contact support to reset password

---

### Wizard won't save

**Cause**: Database migration not applied
**Solution**:
```bash
# Apply business_config migration
npx supabase db push

# Or manually run SQL in Supabase Studio
```

---

### Can't access admin panel

**Cause**: Admin route requires authentication
**Solution**: Click admin icon and log in with your account

---

### Session expires frequently

**Cause**: Supabase token refresh issue
**Solution**: Check Supabase project settings for session duration

---

## Support

### Business Owner Support
📧 **Email**: hello@agentiosk.com
📞 **Phone**: (720) 702-2122
💬 **Live Chat**: https://agentiosk.com

**Response Times:**
- Email: Within 4 business hours
- Phone: Mon-Fri 9am-6pm MT
- Critical issues: Within 1 hour

### Developer Support
📚 **Docs**: https://github.com/geverist/chi-pins
💻 **Issues**: https://github.com/geverist/chi-pins/issues
💬 **Discord**: (Coming soon)

---

## Roadmap

### Coming Soon
- [ ] Two-factor authentication (2FA)
- [ ] Team member invites (multi-user per business)
- [ ] Role-based permissions (admin, manager, viewer)
- [ ] SSO with Google/Microsoft
- [ ] Mobile app for admin panel
- [ ] Voice-controlled admin (coming Q2 2025)

### In Progress
- [x] Email & password authentication
- [x] Magic link login
- [x] Setup wizard
- [x] Business configuration database

---

*Last updated: October 2025*
*EngageOS™ by Agentiosk*
