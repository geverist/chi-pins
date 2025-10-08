# EngageOS - Interactive Kiosk Platform

## Project Overview
EngageOS is a comprehensive interactive kiosk platform that transforms customer engagement through AI-powered voice assistants, gamification, and multi-tenant white-label deployment. Originally built as "Chi-Pins" for Chicago Mike's hot dog restaurant, it has evolved into a full B2B SaaS platform serving multiple industries.

## Vision
Create the leading kiosk engagement platform that combines:
- Voice AI assistants (Vapi integration)
- Interactive maps and location services
- Gamification (trivia, photo booth, jukebox)
- Multi-tenant white-label customization
- Widget marketplace for extensibility
- Offline-first Android deployment

## Current Architecture

### Tech Stack
- **Frontend**: React + Vite
- **Mobile**: Capacitor (Android APK builds)
- **Maps**: Leaflet with offline tile caching (IndexedDB + Capacitor Filesystem)
- **Database**: Supabase (PostgreSQL)
- **Voice AI**: Vapi.ai integration
- **Hosting**: Vercel (web), GitHub Actions (APK builds)
- **Multi-tenancy**: Location-based configuration with marketplace widgets

### Key Components
1. **Voice Assistant** - Central microphone UI with scrolling suggested prompts, speech recognition
2. **Interactive Map** - Leaflet maps with offline caching, voice search, location pins
3. **Photo Booth** - EnhancedPhotoBooth with Snapchat-style filters (B&W, Sepia, Vintage, Cool, Warm, Dramatic, Neon), stickers, text overlays, drawing tools
4. **Jukebox** - Music player with Square integration for payments, now playing banner
5. **Games** - Trivia system with analytics
6. **Then & Now** - Historical photo comparisons
7. **Marketplace** - Widget system for banners, navigation items, custom features
8. **Admin Panel** - Content management, styling, multi-location configuration

### Multi-Tenant System
- Location-based tenancy (`location_id`)
- Industry vertical configs (restaurant, retail, healthcare, real estate, hotel)
- Widget marketplace for customization
- White-label branding per location
- Demo mode for investor presentations

## Recent Work (Current Session)

### Completed Features
1. **UI Overlay Positioning**
   - Fixed z-index hierarchy (Footer: 50, NowPlayingBanner: 250, Downloading: 200, VoiceAssistant: 300, Attractor: 400)
   - Now Playing banner stacks above downloading notification
   - Voice assistant prompts positioned independently of footer/nav
   - No overlaps between UI elements

2. **APK Signing & Deployment**
   - Set up consistent release keystore for GitHub Actions
   - Enables `adb install -r` updates without uninstalling
   - Preserves cached map tiles during updates
   - Auto-deploy script: `./scripts/deploy-latest-apk.sh`
   - ADB connection: `192.168.1.202:45675`

3. **Voice Assistant UX**
   - Smoothed scrolling prompts (4x duplication, 60s animation, GPU acceleration)
   - Fixed voice search microphone error handling (no-speech graceful handling)
   - Improved speech recognition with interim results
   - Static positioning for prompts (won't move with footer changes)

4. **Map Improvements**
   - Removed all `invalidateSize()` calls to eliminate periodic refresh
   - Offline tile caching with progressive downloads
   - Immersive mode on Android (hides nav/status bars)
   - Lake Michigan boundary detection

5. **Photo Booth Enhancement**
   - Switched to EnhancedPhotoBooth component
   - Real-time Snapchat-style filters
   - Sticker packs (Chicago, food, emojis, fun)
   - Text overlays with color/size controls
   - Drawing tools with color picker

6. **Debug Tools**
   - On-screen DebugPanel (press D-E-B-U-G or ?debug=true)
   - Captures console.log/warn/error for kiosk debugging
   - Shows last 100 logs with timestamps

### Configuration Files
- `.env` - Environment variables (Supabase, Vapi keys)
- `capacitor.config.ts` - Android app configuration
- `android/app/build.gradle` - Auto-incrementing version codes, release signing
- `.github/workflows/build-apk.yml` - CI/CD for APK builds
- `scripts/deploy-latest-apk.sh` - ADB deployment automation

### Current Deployment Process
1. Make code changes
2. Commit and push to GitHub
3. GitHub Actions builds signed release APK (~4 minutes)
4. Auto-deploy script downloads and installs via ADB
5. First install requires manual uninstall (signature change)
6. Future updates use `adb install -r` (preserves data)

## Known Issues & Pending Work

### Active Issues
1. **Weather Widget** - Verify coordinates for Centennial, CO (should be 39.5807, -104.8769, America/Denver)
2. **ADB Wireless** - Connection timing out, currently using manual install from `/sdcard/Download/`
3. **Map Tiles** - Progressive caching in global view needs testing with DebugPanel

### Future Enhancements
- Video recording in photo booth (Snapchat stories style)
- Face detection for AR filters (face-api.js integration)
- Advanced analytics dashboard
- Multi-location sync and clustering
- Stripe billing integration for SaaS model
- Enhanced widget marketplace with ratings/reviews

## Development Guidelines

### Code Organization
- `/src/components/` - React components
- `/src/lib/` - Utilities (mapUtils, supabase, etc.)
- `/src/hooks/` - Custom React hooks
- `/src/state/` - State management
- `/src/config/` - Configuration files (industry configs, voice prompts, etc.)
- `/api/` - Serverless functions (Vercel)
- `/scripts/` - Deployment and utility scripts

### Key Patterns
- Use TodoWrite tool for tracking multi-step tasks
- Always deploy via ADB after successful builds
- Test on actual kiosk hardware (not just browser)
- Preserve offline functionality (IndexedDB + Capacitor Filesystem)
- Maintain z-index hierarchy for overlays
- Skip `map.invalidateSize()` to prevent tile refresh

### Testing on Kiosk
- Android tablet at `192.168.1.202:45675` (ADB WiFi)
- Fully Kiosk Browser for production deployment
- Enable Developer Options → USB Debugging
- Microphone permissions: Settings → Apps → Chi Pins → Permissions

## Business Model (EngageOS SaaS)

### Target Markets
1. **Restaurants** - Menu ordering, loyalty, photo booth, jukebox
2. **Retail** - Product discovery, virtual shopping, customer engagement
3. **Healthcare** - Wayfinding, appointment check-in, patient education
4. **Real Estate** - Property search, virtual tours, agent contact
5. **Hotels** - Concierge services, local recommendations, event info

### Revenue Streams
- Monthly SaaS subscriptions per kiosk
- Widget marketplace (revenue share)
- Custom development services
- Event rentals (photo booths, branded experiences)
- Transaction fees (Square, Stripe integrations)

## Repository
- **GitHub**: https://github.com/geverist/chi-pins
- **Main Branch**: `main`
- **Demo**: https://agentiosk.com
- **Download Page**: https://geverist.github.io/chi-pins/download.html

## Contact & Access
- **Admin Panel**: Settings → System → Developer Options → tap "Build number" 7 times, then D-E-V-E-L-O-P sequence
- **Supabase Dashboard**: Connected via `.env` credentials
- **GitHub Actions**: Automated APK builds on push to main
- **ADB Connection**: `adb connect 192.168.1.202:45675`

---

*Last Updated: 2025-10-08*
*Current Version: Release builds with consistent signing*
*Status: Production-ready, actively deploying to kiosk hardware*
