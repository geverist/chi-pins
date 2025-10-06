# EngageOS Quick Start Guide

## 🎯 Test Account & Demo Access

### **Public Demo Links (No Login Required)**

Try any industry demo instantly:

- **Restaurant:** https://chi-pins.vercel.app/?industry=restaurant
- **Med Spa:** https://chi-pins.vercel.app/?industry=medspa
- **Auto Shop:** https://chi-pins.vercel.app/?industry=auto
- **Healthcare:** https://chi-pins.vercel.app/?industry=healthcare
- **Fitness:** https://chi-pins.vercel.app/?industry=fitness
- **Retail:** https://chi-pins.vercel.app/?industry=retail
- **Banking:** https://chi-pins.vercel.app/?industry=banking
- **Hotels:** https://chi-pins.vercel.app/?industry=hospitality
- **Events:** https://chi-pins.vercel.app/?industry=events

These demos show the kiosk interface with industry-specific branding, features, and sample data.

---

### **Admin Panel Test Access**

**URL:** https://chi-pins.vercel.app/?admin=true

**Test PIN:** `1111` (default for demo environment)

**What you can test:**
- ✅ Analytics dashboard
- ✅ Menu/content management
- ✅ Feature configuration
- ✅ Integration settings (POS, Twilio, Stripe)
- ✅ User data and engagement metrics

---

## 🚀 URLs & Access

| Purpose | URL | Authentication |
|---------|-----|----------------|
| **Marketing Site** | https://agentiosk.com/ | None |
| **Public Demos** | https://chi-pins.vercel.app/?industry=X | None |
| **Admin Panel** | https://chi-pins.vercel.app/?admin=true | PIN: `1111` |
| **Production Kiosk** | https://chi-pins.vercel.app/ | None (public kiosk) |

---

## 🔐 Admin Access Methods

### Method 1: Direct URL
1. Go to: https://chi-pins.vercel.app/?admin=true
2. Enter PIN: `1111`
3. Access full admin dashboard

### Method 2: From Kiosk
1. Tap the logo 5 times (top-left corner)
2. Enter PIN: `1111`
3. Access admin panel

### Method 3: Custom Domain (Production)
- If you have `chicagomikes.us` configured:
- Admin URL: `https://chicagomikes.us/?admin=true`

---

## 📊 What's in the Admin Panel?

### 1. **Analytics Tab**
- Revenue from upsells (daily/monthly)
- Customer engagement metrics
- Popular items/services
- ROI calculations
- Session durations and completion rates

### 2. **Menu Tab** (Restaurants)
- Add/edit/remove menu items
- Set prices and descriptions
- Mark items as "upsell opportunities"
- Configure AI Voice ordering

### 3. **Content Tab**
- Upload trivia questions
- Manage photo booth overlays
- Before/after galleries (med spas)
- Custom branding assets

### 4. **Integrations Tab**
- **POS:** Toast, Square, Clover
- **Payments:** Stripe setup
- **Communications:** Twilio (SMS/Voice)
- **Social Media:** Facebook, Instagram

### 5. **Settings Tab**
- Feature toggles (games, photo booth, jukebox)
- Kiosk timeout settings
- Accessibility options
- Multi-location management

### 6. **Users Tab**
- View customer data
- Email list export
- Loyalty program members
- Engagement history

---

## 🎮 Industry Demo Features

### Restaurant (`?industry=restaurant`)
- **Games:** Trivia, Hot Dog Catch, Deep Dish Pizza
- **AI Voice:** Order taking with natural language
- **Upsells:** Fries, drinks, desserts
- **Branding:** Chicago Mike's Hot Dogs theme

### Med Spa (`?industry=medspa`)
- **Before/After Gallery:** HIPAA-compliant photo uploads
- **Treatment Upsells:** Products, upgrades, memberships
- **Appointment Booking:** AI scheduling
- **Branding:** Spa/wellness aesthetic

### Auto Shop (`?industry=auto`)
- **Service Tracking:** Real-time status updates
- **Parts Upsells:** Filters, fluids, detailing
- **Trivia:** Automotive facts
- **Branding:** Professional service theme

---

## 🛠️ Development Setup

### Local Development
```bash
# Clone repo
git clone https://github.com/geverist/chi-pins.git
cd chi-pins

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your API keys

# Start dev server
npm run dev
```

### Deploy to Vercel
```bash
# Deploy marketing site
cd marketing-site
npx vercel --prod

# Deploy main app
cd ..
npx vercel --prod
```

---

## 📱 Custom Domain Setup

Want to use your own domain like `kiosk.yourrestaurant.com`?

See: [CUSTOM_DOMAIN_SETUP.md](./CUSTOM_DOMAIN_SETUP.md)

**Quick steps:**
1. Add CNAME record pointing to Vercel
2. Configure domain in Vercel dashboard
3. SSL auto-generated
4. Access admin: `https://your-domain.com/?admin=true`

---

## 🔧 Configuration

### Setting a Custom Admin PIN

**For production deployments:**

1. Set environment variable in Vercel:
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add: `VITE_ADMIN_PIN=5678` (your 4-digit PIN)
   - Redeploy

2. Or edit locally:
   ```bash
   # .env
   VITE_ADMIN_PIN=5678
   ```

**Security Note:** Never commit real PINs to git. Use environment variables.

---

## 📚 Additional Documentation

- [Admin Access Guide](./ADMIN_ACCESS_GUIDE.md) - Full admin panel documentation
- [API Integrations](./API_INTEGRATIONS.md) - POS, payment, and communication APIs
- [Billing System](./BILLING_SYSTEM_DESIGN.md) - Subscription and payment flow
- [Twilio A2P 10DLC](./TWILIO_A2P_10DLC_GUIDE.md) - SMS compliance setup
- [Custom Domains](./CUSTOM_DOMAIN_SETUP.md) - White-label setup

---

## 🎯 Quick Test Checklist

### For Prospects/Demos
- [ ] Visit https://chi-pins.vercel.app/?industry=restaurant
- [ ] Play the Hot Dog Catch game
- [ ] Try the photo booth
- [ ] Test AI Voice ordering (tap microphone icon)
- [ ] View the "popular spots" overlay

### For Business Owners
- [ ] Access admin: https://chi-pins.vercel.app/?admin=true (PIN: `1111`)
- [ ] View analytics dashboard
- [ ] Edit menu items (add an upsell)
- [ ] Configure Stripe test mode
- [ ] Upload a custom photo booth overlay
- [ ] Export customer email list

---

## 🆘 Support

- **Email:** hello@agentiosk.com
- **Phone:** (312) 555-8200
- **Documentation:** https://docs.agentiosk.com/
- **GitHub Issues:** https://github.com/geverist/chi-pins/issues

---

## 🔑 Production Credentials

**Important:** The test PIN (`1111`) is for demo purposes only.

For production deployments:
1. Set a unique 4-digit PIN via `VITE_ADMIN_PIN` environment variable
2. Never share your PIN publicly
3. Rotate PINs quarterly for security
4. Enable IP whitelisting for Enterprise plans

---

*Last updated: October 2025*
