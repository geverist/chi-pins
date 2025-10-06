# Admin Panel Access Guide

## For Business Owners

### How to Access Your Admin Dashboard

There are **three ways** to access your EngageOS admin panel:

---

## 1. **Direct URL (Recommended)**

**Admin Dashboard URL:** `https://chi-pins.vercel.app/?admin=true`

> **Note:** You can also use `https://app.agentiosk.com/?admin=true` once domain protection is disabled in Vercel.

- Visit the URL above
- Enter your **4-digit PIN code** (provided during setup)
- Access your full admin dashboard

**Features available:**
- View analytics and metrics
- Manage menu items (restaurants)
- Configure features and settings
- Upload content (photos, trivia questions)
- View customer data and engagement stats
- Manage integrations (POS, Twilio, Stripe)

---

## 2. **From the Kiosk (On-Site)**

If you're at your location with the kiosk:

1. **Tap the logo 5 times** in the top-left corner
2. Enter your **4-digit PIN code**
3. Access the admin panel

This method is useful when you're physically at your business and want to make quick changes.

---

## 3. **Custom Domain (Enterprise)**

If you have a custom domain set up (e.g., `kiosk.yourrestaurant.com`):

**Admin URL:** `https://your-custom-domain.com/?admin=true`

Examples:
- `https://chicagomikes.us/?admin=true`
- `https://kiosk.radiancemedspa.com/?admin=true`
- `https://app.agentiosk.com/?admin=true` (once configured)

---

## Security Features

- **PIN Protection:** All admin access requires a 4-digit PIN code
- **Session Timeout:** Admin sessions expire after 30 minutes of inactivity
- **Audit Log:** All admin actions are logged for security
- **IP Whitelisting:** Available for Enterprise customers

---

## Demo vs. Production Access

### **Public Demos** (No Login Required)
These URLs are for prospects to try the kiosk:
- `https://chi-pins.vercel.app/?industry=restaurant`
- `https://chi-pins.vercel.app/?industry=medspa`
- `https://chi-pins.vercel.app/?industry=auto`
- etc.

Demo mode has:
- ✅ All features enabled for testing
- ✅ Sample data pre-loaded
- ❌ No admin panel access
- ❌ No real customer data

### **Production Access** (PIN Required)
Your actual kiosk URL with real data:
- `https://chi-pins.vercel.app/?admin=true`
- Or your custom domain: `https://yourbranding.com/?admin=true`

---

## Common Admin Tasks

### View Revenue & Analytics
1. Log in to admin panel
2. Go to **Analytics** tab
3. View:
   - Daily/monthly revenue from upsells
   - Customer engagement metrics
   - Popular items/services
   - ROI calculations

### Update Menu Items (Restaurants)
1. Admin panel → **Menu** tab
2. Add/edit/remove items
3. Update prices and descriptions
4. Mark items as "upsells" to promote during games

### Manage Integrations
1. Admin panel → **Integrations** tab
2. Configure:
   - POS system (Toast, Square, Clover)
   - Payment processing (Stripe)
   - SMS/Voice (Twilio)
   - Social media accounts

### Upload Custom Content
1. Admin panel → **Content** tab
2. Upload:
   - Trivia questions (industry-specific)
   - Photos for photo booth overlays
   - Before/after galleries (med spas)
   - Promotional videos

---

## Troubleshooting

### "Invalid PIN Code"
- Verify you're using the 4-digit PIN provided during onboarding
- Contact support: hello@agentiosk.com

### "Session Expired"
- Admin sessions timeout after 30 minutes
- Simply log in again with your PIN

### Can't Find the Kiosk
- Check if kiosk is plugged in and powered on
- Verify WiFi connection
- Restart the kiosk (unplug for 10 seconds, plug back in)

---

## Need Help?

**Email:** hello@agentiosk.com
**Phone:** (312) 555-8200
**Live Chat:** Available 24/7 in admin panel

---

## URLs Quick Reference

| Purpose | URL |
|---------|-----|
| **Admin Dashboard** | `https://chi-pins.vercel.app/?admin=true` or `https://app.agentiosk.com/?admin=true` |
| **Public Restaurant Demo** | `https://chi-pins.vercel.app/?industry=restaurant` |
| **Public Med Spa Demo** | `https://chi-pins.vercel.app/?industry=medspa` |
| **Marketing Site** | `https://agentiosk.com/` |
| **Documentation** | `https://docs.agentiosk.com/` |

---

## Security Best Practices

1. **Never share your PIN** with customers or unauthorized staff
2. **Log out** when done with admin tasks
3. **Use a unique PIN** (don't reuse PINs from other systems)
4. **Rotate your PIN quarterly** for enhanced security
5. **Enable IP whitelisting** for Enterprise plans

---

*Last updated: October 2025*
