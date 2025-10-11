# Fix Vercel Deployment Protection for app.agentiosk.com

## Problem
`https://app.agentiosk.com` shows "Log in to Vercel" instead of the kiosk app.

## Root Cause
The Vercel project has **Deployment Protection** enabled, which requires authentication to access the site.

---

## Solution: Disable Deployment Protection

### Step 1: Access Vercel Dashboard

1. Go to: https://vercel.com/geverists-projects/chi-pins
2. Log in if needed
3. Click on **Settings** (top navigation)

### Step 2: Find Deployment Protection

1. In the left sidebar, click **"Deployment Protection"**
2. You'll see the current protection setting

### Step 3: Change Protection Setting

You have **three options**:

#### **Option A: No Protection (Recommended for Public Kiosks)**
- Select: **"All Deployments Publicly Accessible"**
- This makes the entire site public (no login required)
- Click **Save**

#### **Option B: Production Only**
- Select: **"Only Production Deployments"**
- Uncheck **"Password Protection"** if enabled
- This allows public access to production (main branch)
- Preview deployments remain protected
- Click **Save**

#### **Option C: Standard Protection with Domain Allowlist**
- Keep: **"Standard Protection"**
- Scroll to **"Bypass for Automation"**
- Add domain: `app.agentiosk.com`
- This allows public access only via the custom domain
- Click **Save**

### Step 4: Wait for Propagation

- Changes take **1-2 minutes** to propagate
- The site will be publicly accessible after that

---

## Verification

After making changes, test these URLs:

### ✅ Should Work (200 OK):
```bash
curl -I https://app.agentiosk.com/
curl -I https://app.agentiosk.com/?admin=true
curl -I https://app.agentiosk.com/?industry=restaurant
```

### Expected Response:
```
HTTP/2 200
```

---

## Current Status

As of now:
- ✅ **Working:** https://chi-pins.vercel.app/ (public, no protection)
- ❌ **Blocked:** https://app.agentiosk.com/ (401 - requires Vercel login)

**Once you disable protection:**
- ✅ **Will work:** https://app.agentiosk.com/ (public)

---

## Alternative: Use Working URL

If you can't access Vercel settings, use the primary URL:

**Admin Panel:** https://chi-pins.vercel.app/?admin=true (PIN: see `src/state/useAdminSettings.js`)

This works immediately without any configuration changes.

---

## Why This Happened

The `app.agentiosk.com` domain was aliased to an older deployment that had protection enabled:

```bash
# Old (protected) deployment
app.agentiosk.com → chi-pins-m5q9dfj8n-geverists-projects.vercel.app (401)

# Updated to latest deployment (still protected)
app.agentiosk.com → chi-pins-luclv7iob-geverists-projects.vercel.app (401)
```

The **project-level protection** setting is causing the 401, not the deployment itself.

---

## After Fixing

Once protection is disabled, update all references:

### Marketing Site
- Demo links: Already use `chi-pins.vercel.app` ✅
- Can optionally change to `app.agentiosk.com`

### Documentation
- Admin access: Updated to show both URLs ✅
- Primary: `chi-pins.vercel.app/?admin=true`
- Alternative: `app.agentiosk.com/?admin=true`

---

## Security Considerations

### If Making Fully Public:
- ✅ Kiosk mode is designed to be public (that's the point)
- ✅ Admin panel is PIN-protected (4-digit code)
- ✅ Sensitive operations require authentication
- ⚠️ Make sure `VITE_ADMIN_PIN` is set to a secure value in production

### If Keeping Protection:
- ❌ Public demos won't work
- ❌ Customers can't access the kiosk
- ❌ Not suitable for a public-facing kiosk

**Recommendation:** Disable protection for public kiosk access. Security is handled by PIN protection for admin features.

---

## Need Help?

If you can't access Vercel settings or need assistance:

1. **Contact Vercel Support:** https://vercel.com/help
2. **Share access:** Invite team member to Vercel project
3. **Use primary URL:** https://chi-pins.vercel.app/ works now

---

## Summary of Steps

1. ✅ Go to Vercel Dashboard → chi-pins project → Settings → Deployment Protection
2. ✅ Select "All Deployments Publicly Accessible"
3. ✅ Click Save
4. ✅ Wait 1-2 minutes
5. ✅ Test: `curl -I https://app.agentiosk.com/` should return 200

---

*Last updated: October 2025*
