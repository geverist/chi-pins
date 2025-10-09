# 🚀 Chi-Pins Kiosk - Quick Start Guide

## 📍 Access URLs

### 🌐 Web Deployments

#### Local Network (Active Now!)
- **Network URL**: http://192.168.2.234:4173
- **Localhost**: http://localhost:4173
- **Status**: ✅ Running (preview server active)
- **Access**: Available on your local network

#### Vercel (Cloud Deployment)
- **Status**: 🔄 Deploying (75% complete)
- **Check Status**: `tail -f vercel-deploy.log`
- **Expected URL**: https://chi-pins-[your-project].vercel.app
- **Once Complete**: Check log for production URL

#### GitHub Pages (Coming Soon)
- **Deploy Command**: `npm run deploy`
- **Expected URL**: https://[username].github.io/chi-pins
- **Setup Required**: Enable GitHub Pages in repository settings

---

## 📱 Physical Kiosk

- **IP Address**: 192.168.2.112:36619
- **Status**: ✅ Updated with latest build
- **APK**: android/app/build/outputs/apk/debug/app-debug.apk
- **Access**: Admin Panel → Marketplace tab to browse features

---

## 🎯 Quick Commands

```bash
# View local demo
open http://192.168.2.234:4173

# Deploy to Vercel
npm run deploy:vercel

# Deploy to GitHub Pages
npm run deploy

# Check Vercel status
tail -f vercel-deploy.log

# Restart local server
npm start
```

---

## ✨ What's New

### Marketplace Features (47 Total)
- **POS Integrations**: Square, Toast, Clover, Shopify, Stripe
- **Smart Home**: Philips Hue, Nanoleaf
- **Hardware**: Receipt Printers, Badge Readers, Cash Drawers, KDS
- **Communications**: Vestaboard, HEOS Audio, Twilio Voice
- **AI Features**: Agentic Voice Bot with multi-turn conversations

### Industries Supported
- Restaurant & Bar
- Hospitality (Airbnb, Hotels)
- Spa & Salon
- Retail
- Entertainment Venues
- All Industries (General)

---

## 🔧 Admin Access

### Web Admin Panel
1. Open any of the URLs above
2. Long-press bottom-right corner for 2 seconds
3. Enter PIN: **1111** (default)
4. Navigate to **Marketplace** tab

### Kiosk Admin Panel
1. Tap and hold bottom-right corner
2. Enter PIN: **1111**
3. Access all settings and marketplace

---

## 📦 Deployment Status

✅ **Completed**:
- Local preview server running
- GitHub Pages deployment configured
- Comprehensive deployment documentation
- Kiosk updated with latest build
- Marketplace with 47 features

🔄 **In Progress**:
- Vercel cloud deployment (75% - uploading assets)

---

## 🌍 Share Your Demo

### Option 1: Local Network
Share this URL with anyone on your network:
`http://192.168.2.234:4173`

### Option 2: ngrok (Public URL)
```bash
# Install ngrok
brew install ngrok

# Create public tunnel
ngrok http 4173

# Share the ngrok URL (e.g., https://abc123.ngrok.io)
```

### Option 3: Vercel (Permanent URL)
Wait for Vercel deployment to complete, then share the production URL

---

## 💡 Tips

- **Demo Mode**: The kiosk works fully offline after initial load
- **Mobile Friendly**: Works on phones, tablets, and touchscreens
- **PWA**: Can be installed as an app on mobile devices
- **Admin Features**: Full marketplace, settings, and analytics

---

## 📞 Need Help?

- **Deployment Issues**: Check `DEPLOYMENT.md` for detailed guides
- **Logs**: `tail -f vercel-deploy.log` or `tail -f preview-server.log`
- **Kiosk Logs**: `adb -s 192.168.2.112:36619 logcat`

---

**Last Updated**: October 2025
**Version**: 0.1.0 with Marketplace
