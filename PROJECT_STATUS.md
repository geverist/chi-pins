# Chi-Pins Project Status

## Last Updated
2025-10-08

## Current Status
✅ All changes pushed to GitHub (main branch)

## Recent Work Completed

### 2025-10-08 Morning Session
- ✅ Added popular spots exploration feature
  - FloatingExploreButton component
  - PopularSpotModal component
- ✅ Added local comments system (useLocalComments hook)
- ✅ Added pin style statistics tracking (usePinStyleCounts hook)
- ✅ Integrated Spotify client (src/lib/spotifyClient.js)
- ✅ Created SQL migrations:
  - create-settings-updates-table.sql
  - fix-all-navigation-settings.sql
  - fix-navigation-settings-uuid.sql
  - Added migration runner script (scripts/run-migration.js)
- ✅ Performance optimizations for kiosk mode
- ✅ Fixed UI positioning with dynamic height measurement
- ✅ Removed large APK file from entire git history (cleaned 638 commits)

## Active Development

### Current Branch
- `main` (up to date with origin)

### Deployment Method
- Using ADB to deploy to Android kiosk
- APK location: `public/chi-pins.apk` (excluded from git)
- Current kiosk IP: `192.168.2.112:36619` (check with `adb devices`)
- Deploy command: `adb -s 192.168.2.112:36619 install -r public/chi-pins.apk`

## Key Project Info

### Recent Commits
- `1ace0a2` - Update Claude settings
- `9273e4e` - Add popular spots, local comments, Spotify integration, and SQL migrations
- `41a1de7` - Add Performance Mode button and optimize for kiosk performance
- `accf2e4` - Add chi-pins.apk to gitignore
- `c05f47d` - Remove large APK from git tracking
- `6e343e7` - Fix UI positioning gaps with dynamic height measurement
- `d3b2bfb` - Add AI provider configuration, centralized layout system, and compact navigation

### Modified Files (Uncommitted)
- `.claude/settings.local.json` - Auto-updated settings

## Next Steps / TODO
- [x] Build and deploy latest changes to kiosk via ADB (✅ Deployed 2025-10-09)
- [x] Enable performance mode by default (all nav disabled except explore)
- [x] Fix Explore button positioning when navigation is visible
- [x] Enable text overlays on startup (attractorHintEnabled=true)
- [ ] Fix map search bar styling (user reports it looks "weird" - needs more details)
- [ ] Investigate what "missing text" refers to in header
- [ ] Test all changes on kiosk device

## Known Issues
- None currently

## Notes
- VSCode has crashed multiple times - using this file to maintain context
- APK file should NEVER be committed to git (too large, 250MB+)
- Kiosk device IP: 192.168.1.202:41777
