# Chi-Pins Kiosk - Deployment Guide

Complete guide for deploying the Chi-Pins kiosk application to various platforms.

---

## 🌐 Quick Access URLs

### Production Deployments
- **Vercel**: Check `vercel-deploy.log` for your production URL
- **Local Network**: http://192.168.2.234:4173
- **Localhost**: http://localhost:4173

---

## 📦 Deployment Options

### 1. Vercel (Recommended)

**Automatic Deployment:**
```bash
npm run deploy:vercel
```

**Manual Steps:**
```bash
# Install Vercel CLI (first time only)
npm i -g vercel

# Deploy to production
vercel --prod
```

**Features:**
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Instant deployment
- ✅ Preview deployments for branches
- ✅ Environment variables management

**Environment Variables:**
Set these in Vercel dashboard or via CLI:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

### 2. GitHub Pages

**Automatic Deployment:**
```bash
npm run deploy
```

**Setup:**
1. Ensure your repository is on GitHub
2. Run `npm run deploy` to publish to gh-pages branch
3. Enable GitHub Pages in repository settings
4. Select `gh-pages` branch as source

**URL Format:**
`https://[username].github.io/chi-pins`

**Features:**
- ✅ Free hosting
- ✅ Automatic SSL
- ✅ Good for public demos
- ⚠️  No server-side features

---

### 3. Local Preview Server

**Start Server:**
```bash
npm start
# Or
npm run preview
```

**Features:**
- ✅ Test production build locally
- ✅ Available on local network
- ✅ No deployment needed
- ✅ Perfect for LAN demos

**Network Access:**
- Local: http://localhost:4173
- Network: http://192.168.2.234:4173 (your local IP)

**Share via ngrok (optional):**
```bash
# Install ngrok
brew install ngrok

# Create tunnel
ngrok http 4173

# Get public URL (e.g., https://abc123.ngrok.io)
```

---

### 4. Netlify

**Install Netlify CLI:**
```bash
npm i -g netlify-cli
```

**Deploy:**
```bash
# Login
netlify login

# Deploy
netlify deploy --prod
```

**Drag & Drop:**
1. Build: `npm run build`
2. Visit: https://app.netlify.com/drop
3. Drag `dist` folder
4. Get instant URL

**Features:**
- ✅ Instant deployment
- ✅ Form handling
- ✅ Function support
- ✅ Split testing

---

### 5. Custom Server (VPS/Cloud)

**Prerequisites:**
- Node.js 18+ installed
- nginx or Apache (optional)

**Steps:**
```bash
# 1. Build the app
npm run build

# 2. Copy dist folder to server
scp -r dist/ user@your-server.com:/var/www/chi-pins/

# 3. Serve with nginx
# /etc/nginx/sites-available/chi-pins
server {
    listen 80;
    server_name chi-pins.yourdomain.com;
    
    root /var/www/chi-pins;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🔧 Build Configuration

### Environment Variables

Create `.env.production`:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Vite Configuration

The app uses Vite with optimized settings for production:
- Tree shaking
- Code splitting
- Asset optimization
- Source maps (optional)

---

## 🚀 Continuous Deployment

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## 📱 Mobile/Tablet Access

The kiosk is fully responsive and works on:
- Desktop browsers
- Tablets (iPad, Android tablets)
- Mobile phones
- Large touchscreen displays

**Optimizations:**
- Touch-friendly interface
- Responsive layouts
- Offline support (PWA)
- Fast loading

---

## 🔒 Security Considerations

### Production Checklist:
- [ ] Environment variables configured
- [ ] Supabase Row Level Security enabled
- [ ] Admin PIN configured (default: 1111)
- [ ] HTTPS enabled
- [ ] CSP headers configured (optional)
- [ ] Rate limiting configured

### Supabase Security:
```sql
-- Enable RLS on all tables
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_settings ENABLE ROW LEVEL SECURITY;
```

---

## 📊 Monitoring

### Vercel Analytics
Automatically enabled for Vercel deployments

### Custom Analytics
The app supports:
- Google Analytics
- Plausible
- Custom analytics endpoints

Add tracking ID in Admin Panel → System → Analytics

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist .next
npm install
npm run build
```

### Map Not Loading
- Check Supabase connection
- Verify environment variables
- Check browser console for errors

### Admin Panel Not Accessible
- Default PIN: 1111
- Check keyboard input on mobile
- Try clearing browser cache

---

## 📞 Support

For deployment issues:
1. Check deployment logs
2. Verify environment variables
3. Test locally first (`npm start`)
4. Check browser console for errors

---

## 🎯 Quick Deploy Commands

```bash
# Vercel
npm run deploy:vercel

# GitHub Pages  
npm run deploy

# Local preview
npm start

# Build only
npm run build
```

---

Last updated: October 2025
