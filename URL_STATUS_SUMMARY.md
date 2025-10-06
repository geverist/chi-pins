# EngageOS URL Status Summary

## ✅ Working URLs (Verified)

### Public Demo Links (No Login Required)
All industry demos are publicly accessible:

| Industry | URL | Status |
|----------|-----|--------|
| Restaurant | https://chi-pins.vercel.app/?industry=restaurant | ✅ 200 OK |
| Med Spa | https://chi-pins.vercel.app/?industry=medspa | ✅ 200 OK |
| Auto Shop | https://chi-pins.vercel.app/?industry=auto | ✅ 200 OK |
| Healthcare | https://chi-pins.vercel.app/?industry=healthcare | ✅ 200 OK |
| Fitness | https://chi-pins.vercel.app/?industry=fitness | ✅ 200 OK |
| Retail | https://chi-pins.vercel.app/?industry=retail | ✅ 200 OK |
| Banking | https://chi-pins.vercel.app/?industry=banking | ✅ 200 OK |
| Hotels | https://chi-pins.vercel.app/?industry=hospitality | ✅ 200 OK |
| Events | https://chi-pins.vercel.app/?industry=events | ✅ 200 OK |

### Admin Panel Access
**Primary URL (Working):** https://chi-pins.vercel.app/?admin=true
- Status: ✅ 200 OK
- Test PIN: `1111`
- No authentication required

**Custom Domain URLs (Need Protection Fix):**
- https://kiosk.agentiosk.com/?admin=true (❌ 401, DNS configured, needs Vercel protection disabled)
- https://app.agentiosk.com/?admin=true (❌ 401, needs Vercel protection disabled)

> **Note:** Custom domains require Vercel Deployment Protection to be disabled in project settings.

### Marketing Site
**URL:** https://agentiosk.com/
- Status: ✅ 200 OK
- Includes: Admin access FAQ (newly added)
- Industry demos: All working ✅

---

## 🎯 What Was Fixed Today

### 1. Marketing Site Issues
- ✅ Changed title: "Built for 10+ Industries" → "Purpose Built for 10+ Industries"
- ✅ Fixed industry card links: `/industries/*.html` → `chi-pins.vercel.app/?industry=*`
- ✅ Updated link text: "Learn More →" → "Try Demo →"
- ✅ Added admin access FAQ with working URL

### 2. Demo Link Issues
- ❌ **Old (broken):** `app.agentiosk.com/?industry=*` → 401 Vercel login
- ✅ **New (working):** `chi-pins.vercel.app/?industry=*` → Public access

### 3. Admin Panel Access
- ✅ **Working URL:** `chi-pins.vercel.app/?admin=true`
- ⏳ **Pending URL:** `app.agentiosk.com/?admin=true` (after protection disabled)
- ✅ Test credentials: PIN `1111`

### 4. Documentation Created
- ✅ `ADMIN_ACCESS_GUIDE.md` - Complete admin panel documentation
- ✅ `QUICK_START.md` - Test account and URLs
- ✅ `VERCEL_PROTECTION_FIX.md` - Step-by-step fix for app.agentiosk.com
- ✅ Fixed Twilio migration SQL

---

## 🔧 Next Steps for Full Functionality

### To Fix `app.agentiosk.com`:

1. **Go to Vercel Dashboard:**
   - https://vercel.com/geverists-projects/chi-pins/settings/deployment-protection

2. **Disable Deployment Protection:**
   - Select: "All Deployments Publicly Accessible"
   - Click: Save

3. **Wait 1-2 minutes** for propagation

4. **Verify:**
   ```bash
   curl -I https://app.agentiosk.com/
   # Should return: HTTP/2 200
   ```

**Detailed instructions:** [VERCEL_PROTECTION_FIX.md](./VERCEL_PROTECTION_FIX.md)

---

## 📚 Documentation Links

| Document | Purpose |
|----------|---------|
| [ADMIN_ACCESS_GUIDE.md](./ADMIN_ACCESS_GUIDE.md) | Complete guide for business owners to access admin panel |
| [QUICK_START.md](./QUICK_START.md) | Test credentials, demo URLs, and quick setup |
| [VERCEL_PROTECTION_FIX.md](./VERCEL_PROTECTION_FIX.md) | How to fix app.agentiosk.com 401 error |
| [CUSTOM_DOMAIN_SETUP.md](./CUSTOM_DOMAIN_SETUP.md) | Setup custom domains like kiosk.yourrestaurant.com |
| [API_INTEGRATIONS.md](./API_INTEGRATIONS.md) | POS, Stripe, Twilio integration docs |

---

## 🧪 Test Everything

### Public Demos (Should work now):
```bash
# Restaurant demo
curl -I https://chi-pins.vercel.app/?industry=restaurant
# Expected: HTTP/2 200

# Med spa demo
curl -I https://chi-pins.vercel.app/?industry=medspa
# Expected: HTTP/2 200
```

### Admin Access (Working):
```bash
# Primary admin URL
curl -I https://chi-pins.vercel.app/?admin=true
# Expected: HTTP/2 200

# In browser, go to:
https://chi-pins.vercel.app/?admin=true
# Enter PIN: 1111
```

### Admin Access (Pending fix):
```bash
# Alternative admin URL (needs Vercel protection disabled)
curl -I https://app.agentiosk.com/?admin=true
# Current: HTTP/2 401 (requires login)
# After fix: HTTP/2 200
```

---

## 🎬 Demo Flow for Prospects

### 1. Try Industry-Specific Demo:
- Go to: https://agentiosk.com/
- Click any industry button (🍔 Restaurant, 💆 Med Spa, etc.)
- Redirects to: `https://chi-pins.vercel.app/?industry=restaurant`
- No login required ✅

### 2. Experience the Kiosk:
- Play games (Hot Dog Catch, Trivia)
- Try photo booth
- Test AI Voice ordering (microphone icon)
- View popular spots
- See industry-specific branding

### 3. View Admin Panel (Optional):
- Go to: https://chi-pins.vercel.app/?admin=true
- Enter PIN: `1111`
- Explore analytics, menu management, integrations

---

## 🔐 Security Notes

### Public Access (Current State):
- ✅ `chi-pins.vercel.app` - Public, no restrictions
- ❌ `app.agentiosk.com` - Protected by Vercel auth

### Admin Security:
- ✅ Admin panel requires 4-digit PIN
- ✅ Default test PIN: `1111` (change for production)
- ✅ Session timeout: 30 minutes
- ✅ Rate limiting: 5 attempts before lockout

### Production Recommendations:
1. Set custom PIN via `VITE_ADMIN_PIN` env variable
2. Use strong 4-digit PIN (not `1111`)
3. Enable IP whitelisting for Enterprise plans
4. Rotate PINs quarterly

---

## 📊 Deployment Status

| Service | Status | URL |
|---------|--------|-----|
| **Marketing Site** | ✅ Deployed | https://agentiosk.com/ |
| **Kiosk App** | ✅ Deployed | https://chi-pins.vercel.app/ |
| **Admin Panel** | ✅ Accessible | https://chi-pins.vercel.app/?admin=true |
| **Alternative Domain** | ⏳ Pending | https://app.agentiosk.com/ (needs protection disabled) |

---

## 🆘 Support

- **Email:** hello@agentiosk.com
- **Phone:** (312) 555-8200
- **Docs:** All documentation in this repo
- **GitHub:** https://github.com/geverist/chi-pins

---

*Last updated: October 2025*
*All URLs verified and working except app.agentiosk.com (requires Vercel settings change)*
