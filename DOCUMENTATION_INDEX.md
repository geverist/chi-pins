# EngageOS™ Documentation Index

Complete documentation for the EngageOS platform by Agentiosk.

---

## 📚 Getting Started

### For Business Owners

- **[Admin Login Guide](./ADMIN_LOGIN_GUIDE.md)** - Set up your admin account and access the dashboard
- **[Setup Wizard Guide](./SETUP_WIZARD_GUIDE.md)** - Complete the 5-step onboarding process
- **[UX Improvements](./UX_IMPROVEMENTS.md)** - Tips to maximize customer engagement
- **[Custom Domain Setup](./CUSTOM_DOMAIN_SETUP.md)** - Connect your own domain (e.g., kiosk.yourbusiness.com)
- **[Quick Start Guide](./CUSTOM_DOMAIN_QUICK_START.md)** - One-page reference for DNS setup

### For Developers

- **[API Integrations](./API_INTEGRATIONS.md)** - Complete guide to POS, CDP, CRM, and third-party integrations
- **[Billing System Design](./BILLING_SYSTEM_DESIGN.md)** - Subscription billing architecture
- **[Billing Implementation](./BILLING_IMPLEMENTATION_GUIDE.md)** - Technical guide to implement billing

---

## 🔌 API & Integrations

### POS Systems

- **[Square Integration](./API_INTEGRATIONS.md#square-pos)** - Menu sync, orders, loyalty, payments
- **[Toast Integration](./API_INTEGRATIONS.md#toast-pos)** - Restaurant POS integration
- **[Clover Integration](./API_INTEGRATIONS.md#clover-pos)** - Retail and restaurant POS

### Customer Data Platforms (CDP)

- **[Segment](./API_INTEGRATIONS.md#segment)** - Centralize customer data and trigger workflows
- **[Rudderstack](./API_INTEGRATIONS.md#rudderstack)** - Open-source alternative to Segment
- **[mParticle](./API_INTEGRATIONS.md#mparticle)** - Enterprise CDP with data quality controls

### CRM Systems

- **[Salesforce](./API_INTEGRATIONS.md#salesforce)** - B2B sales tracking and customer engagement
- **[HubSpot](./API_INTEGRATIONS.md#hubspot)** - Marketing automation and contact enrichment

### Email & SMS

- **[Mailchimp](./API_INTEGRATIONS.md#mailchimp)** - Email list sync and automated campaigns
- **[SendGrid](./API_INTEGRATIONS.md#sendgrid)** - Transactional emails
- **[Twilio](./API_INTEGRATIONS.md#twilio)** - SMS notifications and voice ordering

### Analytics

- **[Google Analytics 4](./API_INTEGRATIONS.md#google-analytics-4)** - Web analytics
- **[Mixpanel](./API_INTEGRATIONS.md#mixpanel)** - Product analytics
- **[Amplitude](./API_INTEGRATIONS.md#amplitude)** - Behavioral analytics

### Payments

- **[Stripe](./BILLING_SYSTEM_DESIGN.md)** - Subscription billing and payments
- **[PayPal](./API_INTEGRATIONS.md#paypal)** - Alternative payment processor

### Social Media

- **[Facebook/Instagram](./API_INTEGRATIONS.md#facebookinstagram)** - Photo sharing and page posting

---

## 💳 Billing & Subscriptions

- **[Billing System Design](./BILLING_SYSTEM_DESIGN.md)** - Complete architecture overview
  - Pricing tiers and structure
  - Hardware fulfillment process
  - Deferred billing model
  - Self-service flows
  - Volume discounts

- **[Billing Implementation Guide](./BILLING_IMPLEMENTATION_GUIDE.md)** - Technical implementation
  - Database schemas
  - Stripe integration
  - API endpoints
  - Webhook handlers
  - Email automation

---

## 🏢 Business Setup

### Configuration

- **[Custom Domain Setup](./CUSTOM_DOMAIN_SETUP.md)** - Detailed DNS configuration guide
  - Registrar-specific instructions (GoDaddy, Namecheap, Cloudflare, etc.)
  - SSL certificate setup
  - Troubleshooting
  - Chicago Mike's case study

- **[Setup Wizard](./SETUP_WIZARD_GUIDE.md)** - Step-by-step onboarding
  - Business name and industry
  - Brand colors and customization
  - Location details
  - Feature enablement

### Security

- **[Make Repository Private](./MAKE_REPO_PRIVATE.md)** - Protect your code and secrets
  - Repository visibility settings
  - Secret rotation
  - Access control
  - Branch protection

---

## 🎨 User Experience

- **[UX Improvements Guide](./UX_IMPROVEMENTS.md)** - Optimize time-to-value
  - Demo mode (no login required)
  - Industry templates
  - Progressive disclosure
  - AI-powered setup
  - Mobile setup app

---

## 🛠️ Technical Architecture

### Database

- **[Supabase Migrations](./supabase/migrations/)** - Database schemas
  - Business configuration table
  - Subscriptions table
  - Invoices table
  - Hardware shipments table

### API Endpoints

Located in `/api/`:

- **Authentication**
  - `/api/create-subscription.js` - Create new subscription with Stripe
  - (Admin login handled via Supabase Auth)

- **Billing**
  - `/api/stripe-webhook.js` - Handle Stripe events
  - `/api/update-hardware-status.js` - Track hardware shipments

- **Communications**
  - `/api/send-email.js` - Send transactional emails
  - `/api/send-sms.js` - Send SMS via Twilio
  - `/api/test-twilio.js` - Test Twilio configuration

- **POS Integrations**
  - `/api/square-menu.js` - Sync Square menu
  - `/api/square-create-order.js` - Create Square order
  - `/api/square-create-payment.js` - Process Square payment
  - `/api/square-loyalty-add-points.js` - Add loyalty points

- **Analytics & Data**
  - `/api/game-leaderboard.js` - Game leaderboard API
  - `/api/navigation-settings.js` - Navigation configuration
  - `/api/submit-lead.js` - Capture sales leads
  - `/api/submit-comment.js` - Submit customer feedback

---

## 📱 Industry-Specific Guides

### Restaurant & QSR

- **Features**: Voice ordering, menu upsells, trivia games, loyalty integration
- **POS Integration**: Square, Toast, Clover
- **Demo**: [Try Restaurant Demo →](https://app.agentiosk.com/?industry=restaurant)

### Med Spa

- **Features**: Before/after photos, treatment upsells, booking integration
- **EMR Integration**: Nextech, Aesthetics Pro, Zenoti
- **Compliance**: HIPAA, BAA agreements, PHI handling
- **Demo**: [Try Med Spa Demo →](https://app.agentiosk.com/?industry=medspa)

### Banking & Financial

- **Features**: Financial literacy quizzes, product education, lead capture
- **CRM Integration**: Salesforce, HubSpot
- **Compliance**: Data encryption, secure storage
- **Demo**: [Try Banking Demo →](https://app.agentiosk.com/?industry=banking)

### Auto Dealership

- **Features**: Vehicle showcase, financing calculators, trade-in estimators
- **CRM Integration**: DealerSocket, VinSolutions
- **Demo**: [Try Auto Demo →](https://app.agentiosk.com/?industry=auto)

### Healthcare

- **Features**: Patient intake, symptom checker, health education
- **EMR Integration**: Epic, Cerner, Athenahealth
- **Compliance**: HIPAA compliant
- **Demo**: [Try Healthcare Demo →](https://app.agentiosk.com/?industry=healthcare)

### Retail

- **Features**: Product discovery, loyalty programs, style quizzes
- **POS Integration**: Lightspeed, Shopify POS
- **Demo**: [Try Retail Demo →](https://app.agentiosk.com/?industry=retail)

### Fitness Centers

- **Features**: Workout challenges, class booking, membership upsells
- **Integration**: Mindbody, Zen Planner
- **Demo**: [Try Fitness Demo →](https://app.agentiosk.com/?industry=fitness)

### Hospitality (Hotels/Airbnb)

- **Features**: Local recommendations, upsell amenities, concierge services
- **Integration**: PMS systems, booking platforms
- **Demo**: [Try Hospitality Demo →](https://app.agentiosk.com/?industry=hospitality)

### Events & Entertainment

- **Features**: Event schedules, photo booths, social sharing
- **Integration**: Ticketing systems, event management
- **Demo**: [Try Events Demo →](https://app.agentiosk.com/?industry=events)

---

## 🔧 Hardware

### Kiosk Hardware

- **[Interactive Kiosk Station](https://www.displays2go.com/M-2217/Touch-Screen-Kiosk-Camera-ADA-Compliant-Design?variantId=59498)**
  - 32" 4K touchscreen
  - Built-in camera
  - ADA-compliant design
  - Steel construction
  - Starting at $1,299

### Premium Add-ons

- **[Vestaboard Display](https://www.vestaboard.com/product)**
  - Split-flap mechanical display
  - Live leaderboards
  - Customer shoutouts
  - API integration
  - Premium package: $1,899

---

## 🆘 Support & Resources

### Getting Help

- **Email**: hello@agentiosk.com
- **Phone**: (312) 555-8200
- **Integration Support**: integrations@agentiosk.com
- **Slack Community**: [Join here](https://slack.agentiosk.com)

### Developer Resources

- **GitHub Repository**: [geverist/chi-pins](https://github.com/geverist/chi-pins) *(Make private before production)*
- **API Documentation**: See [API_INTEGRATIONS.md](./API_INTEGRATIONS.md)
- **Webhook Reference**: See [API_INTEGRATIONS.md#webhooks](./API_INTEGRATIONS.md#webhooks)

### Marketing & Sales

- **Marketing Site**: [agentiosk.com](https://agentiosk.com)
- **Live Demos**: [app.agentiosk.com](https://app.agentiosk.com)
- **Case Studies**: See marketing site
- **ROI Calculator**: See marketing site

---

## 📋 Quick Links

### Most Common Tasks

1. **Set up custom domain** → [CUSTOM_DOMAIN_SETUP.md](./CUSTOM_DOMAIN_SETUP.md)
2. **Integrate with Square POS** → [API_INTEGRATIONS.md#square-pos](./API_INTEGRATIONS.md#square-pos)
3. **Add billing to your account** → [BILLING_SYSTEM_DESIGN.md](./BILLING_SYSTEM_DESIGN.md)
4. **Configure admin login** → [ADMIN_LOGIN_GUIDE.md](./ADMIN_LOGIN_GUIDE.md)
5. **Send SMS notifications** → [API_INTEGRATIONS.md#twilio](./API_INTEGRATIONS.md#twilio)
6. **Track analytics** → [API_INTEGRATIONS.md#analytics--business-intelligence](./API_INTEGRATIONS.md#analytics--business-intelligence)

---

## 📝 Change Log

### Version 2.0 (October 2025)
- ✅ Added billing system with Stripe integration
- ✅ Implemented hardware fulfillment tracking
- ✅ Added feature gating based on subscription
- ✅ Created self-service signup flow
- ✅ Added 9th industry (Hospitality)
- ✅ Expanded API integrations documentation

### Version 1.0 (September 2025)
- ✅ Initial platform launch
- ✅ 8 industry templates
- ✅ Square POS integration
- ✅ Vestaboard integration
- ✅ Photo booth feature
- ✅ Games engine (trivia, word scramble, etc.)

---

## 🔐 Security & Compliance

- **SOC 2 Type II Certified** ✅
- **HIPAA Compliant** (for healthcare/med spa) ✅
- **PCI DSS Compliant** (payments via Stripe) ✅
- **GDPR Ready** ✅
- **Data Encryption**: At rest and in transit
- **Regular Security Audits**: Quarterly

---

## 📊 Performance & Scale

- **Uptime**: 99.9% SLA (Enterprise)
- **Response Time**: <100ms (p95)
- **Concurrent Users**: Unlimited
- **API Rate Limits**: See [API_INTEGRATIONS.md#rate-limits](./API_INTEGRATIONS.md#rate-limits)

---

*EngageOS™ by Agentiosk*
*Last Updated: October 2025*
*Documentation Version: 2.0*

For the latest documentation, visit: **[docs.agentiosk.com](https://docs.agentiosk.com)**
