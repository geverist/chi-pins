# Twilio Call Border - Setup Guide

Visual indicator for active Twilio voice bot calls. Shows animated glowing border around the kiosk screen when a call is in progress.

## 🎯 What You Get

- **Animated Border**: Rainbow gradient border pulses around entire screen during active calls
- **Status Badge**: Shows "📞 Voice Bot Active" with caller number in top-left corner
- **Real-time Updates**: Automatically shows/hides based on call status via Supabase real-time
- **Visual Awareness**: Staff/customers know when the voice bot is engaged with a caller

## 📋 Prerequisites

1. Twilio phone number configured for voice calls
2. Supabase database access
3. Your kiosk is deployed (local or production)

## 🚀 Setup Steps

### Step 1: Run SQL Migration

Apply the database migration to create the `twilio_call_status` table:

```bash
# Using Supabase CLI (if installed)
supabase db push

# OR using psql directly
psql "postgresql://postgres.[YOUR-PROJECT]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" \
  -f sql-migrations/create-twilio-call-status.sql

# OR via Supabase Dashboard
# 1. Go to https://supabase.com/dashboard
# 2. Select your project
# 3. Go to SQL Editor
# 4. Copy contents of sql-migrations/create-twilio-call-status.sql
# 5. Execute the SQL
```

### Step 2: Configure Twilio Webhook

1. **Go to Twilio Console**: https://console.twilio.com/
2. **Navigate to Phone Numbers**: Active numbers → Click your phone number
3. **Configure Voice settings**:
   - Under "A CALL COMES IN" section
   - Set "Voice URL" (if not already set) to: `https://your-domain.com/api/twilio-voice-webhook`
   - Method: `HTTP POST`

4. **Add Status Callback**:
   - Scroll down to "CONFIGURE WITH" section
   - Set "Status Callback URL" to:
   ```
   https://your-domain.com/api/twilio-call-status
   ```
   - Method: `HTTP POST`
   - Under "STATUS EVENTS", check these boxes:
     - ✅ Ringing
     - ✅ Answered
     - ✅ Completed

5. **Save** your phone number configuration

### Step 3: Deploy Your Changes

If you've made changes locally, deploy to Vercel:

```bash
git add .
git commit -m "Add Twilio call status tracking and visual border"
git push

# Or using Vercel CLI
vercel --prod
```

## 🧪 Testing

### Method 1: Test with Window Function (Local)

Open browser console on your kiosk and run:

```javascript
// Activate test call border
window.setCallActive(true, '+15551234567');

// Deactivate test call border
window.setCallActive(false);
```

The border should appear/disappear immediately.

### Method 2: Test with Real Call

1. Call your Twilio phone number from any phone
2. When the call connects (voice bot answers), the border should appear
3. When you hang up, the border should disappear within 1-2 seconds

### Method 3: Test with Database Insert

```sql
-- Insert active call
INSERT INTO twilio_call_status (call_sid, caller_number, call_status, is_active, tenant_id)
VALUES ('test-call-123', '+15551234567', 'in-progress', true, 'chicago-mikes');

-- The border should appear immediately on all connected kiosks

-- End call
UPDATE twilio_call_status
SET is_active = false, call_status = 'completed'
WHERE call_sid = 'test-call-123';

-- The border should disappear
```

## 🔧 Configuration

### Webhook URL Format

Your webhook URL depends on your deployment:

- **Production Vercel**: `https://your-domain.vercel.app/api/twilio-call-status`
- **Custom Domain**: `https://kiosk.yourdomain.com/api/twilio-call-status`
- **Local Testing**: Use ngrok tunnel: `https://abc123.ngrok.io/api/twilio-call-status`

### Environment Variables

Make sure these are set in your deployment:

```bash
# Supabase (required for database updates)
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Tenant ID (optional, defaults to chicago-mikes)
VITE_TENANT_ID=chicago-mikes
```

### Customizing the Border

Edit `src/components/CallBorderIndicator.jsx` to customize:

- **Colors**: Change the `borderImage` gradient colors
- **Animation Speed**: Adjust animation durations in `@keyframes`
- **Border Width**: Change `border: '8px solid...'` to your preferred thickness
- **Badge Position**: Move the status badge by changing `top` and `left` values
- **Badge Content**: Customize the text and emoji

## 📊 How It Works

### Call Flow

```
1. Customer calls Twilio number
   ↓
2. Twilio sends "ringing" status to /api/twilio-call-status
   ↓
3. Endpoint updates twilio_call_status table (is_active = true)
   ↓
4. Supabase broadcasts real-time change
   ↓
5. CallBorderIndicator component receives update
   ↓
6. Animated border appears on kiosk screen
   ↓
7. Call completes → Twilio sends "completed" status
   ↓
8. Endpoint updates table (is_active = false)
   ↓
9. Border disappears from screen
```

### Database Schema

```sql
twilio_call_status
├── id (UUID)
├── tenant_id (TEXT) - defaults to 'chicago-mikes'
├── call_sid (TEXT) - Twilio unique call identifier
├── caller_number (TEXT) - Phone number of caller
├── call_status (TEXT) - ringing, in-progress, completed, etc.
├── is_active (BOOLEAN) - true = show border, false = hide
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

## 🐛 Troubleshooting

### Border doesn't appear during calls

1. **Check Twilio webhook logs**:
   - Go to Twilio Console → Monitor → Logs → Webhooks
   - Look for POST requests to `/api/twilio-call-status`
   - Check for any errors or 4xx/5xx responses

2. **Verify database updates**:
   ```sql
   SELECT * FROM twilio_call_status ORDER BY created_at DESC LIMIT 10;
   ```

3. **Check browser console**:
   - Open DevTools on the kiosk
   - Look for `[CallBorder]` log messages
   - Should see "Call status update" messages

4. **Verify Supabase real-time is working**:
   - Go to Supabase Dashboard → Database → Replication
   - Make sure real-time is enabled for `twilio_call_status` table

### Border stays visible after call ends

1. **Check for stuck active calls**:
   ```sql
   UPDATE twilio_call_status SET is_active = false WHERE is_active = true;
   ```

2. **Verify cleanup logic** in `api/twilio-call-status.js` is working

### Multiple borders appear

This shouldn't happen, but if it does:
1. Check if multiple records have `is_active = true`
2. Clean up with: `UPDATE twilio_call_status SET is_active = false WHERE call_status IN ('completed', 'failed', 'busy', 'no-answer', 'canceled');`

## 🎨 Design Rationale

- **Full-screen border**: Ensures visibility from any angle
- **Rainbow gradient**: Eye-catching but not distracting
- **Pulse animation**: Indicates active/live status
- **Top-left badge**: Conventional position, doesn't block main content
- **Caller number display**: Helpful for debugging and awareness

## 📱 Multi-Kiosk Support

The system supports multiple kiosks automatically:

- Each kiosk listens to the same `twilio_call_status` table
- When a call comes in, ALL kiosks show the border
- This is intentional - helps staff know voice bot is engaged across all locations
- If you want per-kiosk borders, add a `kiosk_id` field to filter updates

## 🔐 Security

- Uses Supabase Row Level Security (RLS)
- Public read access (kiosks can see active calls)
- Service role write access (only webhook endpoint can update)
- No sensitive data exposed (just call status, not audio/transcripts)

## ✅ Checklist

- [ ] SQL migration applied to Supabase
- [ ] `SUPABASE_SERVICE_ROLE_KEY` environment variable set
- [ ] Twilio Status Callback URL configured
- [ ] Status events enabled (ringing, answered, completed)
- [ ] Changes deployed to production
- [ ] Tested with real phone call
- [ ] Border appears and disappears correctly
- [ ] Console logs show call status updates

---

**Questions?** Check the browser console for `[CallBorder]` and `[Twilio Status]` log messages.
