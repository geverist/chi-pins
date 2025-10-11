# Performance Improvements & Bug Fixes

## Summary
Fixed multiple performance issues, updated dependencies, and optimized bundle size.

## Changes Made

### 1. ✅ Fixed Missing ElevenLabs API Endpoint
- **Issue**: `textToSpeechUrl()` function referenced non-existent `/api/elevenlabs/save-audio` endpoint
- **Fix**: Removed dead code - function was never used in the application
- **File**: `src/lib/elevenlabs.js:114-115`

### 2. ✅ Bundle Size Optimization (43% Reduction)
- **Before**:
  - ai-vendor: 1.8MB (tensorflow + mediapipe bundled together)
  - index: 767KB
- **After**:
  - tensorflow-vendor: 1.7MB (287KB gzipped) - separate chunk
  - mediapipe-vendor: 130KB (38KB gzipped) - separate chunk
  - supabase-vendor: 148KB (38KB gzipped) - new separate chunk
  - vendor: 248KB (78KB gzipped) - other vendors
  - index: 428KB (127KB gzipped) - **43% smaller!**
- **Benefits**: Better caching, lazy loading, faster initial page load
- **File**: `vite.config.js:25-60`

### 3. ✅ Console Logging Optimization
- **Before**: 472+ console.log/info/debug statements throughout codebase
- **After**:
  - Production: All console.log/info/debug suppressed
  - Production: console.warn filtered to only show critical warnings
  - Development: Full logging preserved for debugging
- **Impact**: Reduced runtime overhead and console spam
- **Files**:
  - `src/main.jsx:15-37` - Production console suppression
  - `vite.config.js:17` - Build-time minification removes debug calls

### 4. ✅ NPM Package Updates
Updated 19 packages including:
- `@capgo/capacitor-updater`: 7.18.2 → 7.18.9
- `@supabase/supabase-js`: 2.58.0 → 2.75.0
- `nodemailer`: 7.0.6 → 7.0.9
- `vercel`: 48.1.6 → 48.2.9

### 5. ✅ Code Cleanup
- Removed Web Speech Synthesis API fallback (doesn't work in Android WebView)
- Improved error logging in offline tile storage
- Removed PreviewBanner component reference

## Known Issues

### Security Vulnerabilities (5 total)
1. **esbuild** (moderate) - Requires Vite 7.x upgrade (breaking change)
   - Only affects development server
   - Not exploitable in production builds

2. **face-api.js dependency** (1 high, 2 low)
   - Old @tensorflow/tfjs-core dependency with node-fetch vulnerability
   - Used for employee facial recognition feature
   - Vulnerability only in build-time dependencies, not runtime
   - **Recommendation**: Consider migrating to MediaPipe FaceMesh (already in use for tracking)

### Performance Notes
- TensorFlow vendor chunk is still large (1.7MB) but now lazy-loaded
- AdminPanel (240KB) could benefit from dynamic import/lazy loading
- Consider implementing route-based code splitting for further optimization

## Testing Checklist
- [x] Build completes successfully
- [x] No TypeScript/linting errors
- [ ] Test production build in browser
- [ ] Verify console suppression works
- [ ] Test voice features still work
- [ ] Test employee check-in (face recognition)

## Next Steps (Optional)
1. Upgrade Vite to v7 to fix esbuild vulnerability (requires testing for breaking changes)
2. Implement lazy loading for AdminPanel component
3. Migrate face-api.js to MediaPipe for facial recognition
4. Add route-based code splitting for games and admin features
