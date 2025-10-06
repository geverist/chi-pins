# Vercel Deployment Protection Issue

## Summary

The chi-pins project has **Deployment Protection** enabled that affects custom domains but NOT the default `.vercel.app` domain.

---

## Current Status

### ✅ **Working URLs (No Auth Required)**

| URL | Status | Use Case |
|-----|--------|----------|
| https://chi-pins.vercel.app/?admin=true | ✅ 200 OK | Admin panel |
| https://chi-pins.vercel.app/?industry=restaurant | ✅ 200 OK | Public demos |
| https://chi-pins.vercel.app/ | ✅ 200 OK | Main kiosk |

### ❌ **Blocked URLs (Require Vercel Login)**

| URL | Status | Issue |
|-----|--------|-------|
| https://kiosk.agentiosk.com/?admin=true | ❌ 401 | Custom domain protection |
| https://app.agentiosk.com/?admin=true | ❌ 401 | Custom domain protection |

---

## Root Cause

Vercel has **project-level protection** that:
- ✅ **Allows** access via default `.vercel.app` domains
- ❌ **Blocks** access via custom domains (agentiosk.com subdomains)

This is a **Vercel team/project setting** that requires dashboard access to change.

---

## How to Find the Protection Setting

The setting is hard to locate because Vercel has changed the UI several times. Try these locations:

### Location 1: Project Settings → Protection (Most Common)
1. Go to: https://vercel.com/geverists-projects/chi-pins/settings
2. Look in left sidebar for:
   - **"Protection"**
   - **"Vercel Authentication"**
   - **"Password Protection"**
3. Look for a toggle or dropdown
4. Set to: **"None"** or **"All Deployments Publicly Accessible"**

### Location 2: Project Settings → General
1. Go to: https://vercel.com/geverists-projects/chi-pins/settings
2. Scroll down in the **General** tab
3. Look for section called:
   - **"Protection"**
   - **"Security"**
   - **"Access Control"**

### Location 3: Team Settings
1. Go to: https://vercel.com/geverists-projects/settings
2. Click **"Security"** or **"Protection"**
3. Check if there's a team-wide protection policy

### Location 4: Environment Variables
Check if protection is set via env var:
1. Go to: https://vercel.com/geverists-projects/chi-pins/settings/environment-variables
2. Look for:
   - `VERCEL_AUTHENTICATION`
   - `PASSWORD_PROTECTION`
   - `DEPLOYMENT_PROTECTION`
3. Delete any protection-related variables

---

## Why chi-pins.vercel.app Works

Vercel's default `.vercel.app` domains often **bypass** project-level protection settings. This is intentional to allow:
- Preview deployments to be accessible
- Development testing without auth issues
- Quick prototyping

However, **custom domains respect the protection settings**, which is why `kiosk.agentiosk.com` returns 401.

---

## Temporary Solution

**Use the working URL for now:**

✅ **Admin Panel:** https://chi-pins.vercel.app/?admin=true (PIN: 1111)

This works perfectly and has all the same functionality. The custom domain is just a branding preference.

---

## Long-Term Solution

### Option A: Disable Protection (Recommended for Public Kiosks)

Find the protection setting in Vercel dashboard and disable it. This will make all URLs (including custom domains) publicly accessible.

**Security Note:** The kiosk is designed to be public. Admin features are protected by PIN code, so disabling Vercel protection is safe.

### Option B: Use Only .vercel.app Domains

Stick with `chi-pins.vercel.app` URLs and skip custom domains entirely.

**Pros:**
- Already working
- No configuration needed
- Same functionality

**Cons:**
- Less professional branding
- Longer URLs

### Option C: Allowlist Custom Domains

Some Vercel plans allow you to **allowlist** specific domains to bypass protection:

1. Find "Bypass for Automation" or "Allowlisted Domains" in settings
2. Add: `kiosk.agentiosk.com` and `app.agentiosk.com`
3. Save

This allows custom domains to work while keeping protection for other access methods.

---

## Testing the Fix

Once you change the setting, test with:

```bash
# Should return HTTP/2 200 (not 401)
curl -I https://kiosk.agentiosk.com/?admin=true

# Should also work
curl -I https://app.agentiosk.com/?admin=true
```

---

## What We've Done

1. ✅ Added DNS CNAME: `kiosk.agentiosk.com` → `cname.vercel-dns.com`
2. ✅ Created Vercel alias: `kiosk.agentiosk.com` → chi-pins deployment
3. ✅ Generated SSL certificate for `kiosk.agentiosk.com`
4. ✅ Updated all documentation
5. ❌ **Still blocked:** Project-level protection prevents custom domain access

---

## Next Steps

### For You (Dashboard Access Required):
1. Find the Protection setting in Vercel (see locations above)
2. Disable protection or allowlist custom domains
3. Wait 1-2 minutes for changes to propagate
4. Test the custom domain URLs

### For Us (Code/CLI - Already Done):
- ✅ DNS configuration complete
- ✅ Vercel alias created
- ✅ SSL certificate generated
- ✅ Documentation updated

---

## Alternative: Screenshot Debugging

If you can't find the setting:

1. Go to: https://vercel.com/geverists-projects/chi-pins/settings
2. Take a screenshot of:
   - The left sidebar menu
   - The main settings page
3. Share the screenshot

I can help identify the exact location of the protection setting.

---

## Conclusion

**Current working solution:**
- Use: https://chi-pins.vercel.app/?admin=true (PIN: 1111)
- This works perfectly with no authentication issues

**To enable custom domains:**
- Requires dashboard access to disable Vercel protection
- Setting location varies by Vercel plan/UI version
- Once disabled, both `kiosk.agentiosk.com` and `app.agentiosk.com` will work

---

*Last updated: October 2025*
