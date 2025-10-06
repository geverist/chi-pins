# Touch Sequences Guide

## Overview

All keyboard shortcuts have been replaced with touch sequences for easier kiosk operation. Visual feedback (blue pulsing circles) appears when you touch corners.

---

## Touch Sequences

### 1. 🔄 **Refresh Page** (Clear Cache & Reload)

**Sequence:** Triple-tap anywhere on the screen

**Steps:**
1. Tap the screen three times quickly in the same spot (within 50px)
2. All three taps must be within 1 second

**Time Limit:** 1 second

**What it does:**
- Clears all PWA caches (map tiles, API data)
- Force reloads the page
- Useful after deploying new updates

**Visual Feedback:** Page reloads immediately after third tap

---

### 2. ⚙️ **Open Admin Panel**

**Sequence:** Touch all four quadrants of the screen (in any order)

**Steps:**
1. Touch anywhere in top-left quadrant
2. Touch anywhere in top-right quadrant
3. Touch anywhere in bottom-left quadrant
4. Touch anywhere in bottom-right quadrant

**Time Limit:** 5 seconds (existing behavior)

**What it does:**
- Opens the admin panel
- No login required! (login requirement removed)
- Configure kiosk settings, navigation, weather, etc.

**Note:** This is the existing four-quadrant touch - no changes

---

### 3. 🖥️ **Toggle Kiosk Mode**

**Sequence:** Double-tap two opposite corners

**Steps:**
Option A:
1. Touch top-left corner
2. Touch bottom-right corner

Option B:
1. Touch top-right corner
2. Touch bottom-left corner

**Time Limit:** 2 seconds

**What it does:**
- **If NOT in kiosk mode:** Enters fullscreen kiosk mode
- **If IN kiosk mode:** Shows PIN entry to exit (default PIN: 1234)

**Visual Feedback:** Blue pulse at each corner

---

## Corner Zones

Each corner has a 100px x 100px touch zone:

```
┌─────────────────────────────────────┐
│ [TL]                        [TR]    │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│ [BL]                        [BR]    │
└─────────────────────────────────────┘

TL = Top-Left
TR = Top-Right
BL = Bottom-Left
BR = Bottom-Right
```

---

## Tips

### For Fully Kiosk Browser:

1. **Refresh after deployment:**
   - Triple-tap anywhere on screen to clear cache and reload
   - Or use remote admin: `curl "http://TABLET-IP:2323/?cmd=clearCache&password=PASSWORD"`

2. **Access admin panel:**
   - Touch all four quadrants (existing gesture)
   - No more login required!

3. **Exit kiosk mode:**
   - Double-tap opposite corners
   - Enter PIN: 1234 (configurable in admin)

### Troubleshooting:

**Touch sequence not working?**
- Make sure you're touching within the corner zones (100px from edge)
- Complete the sequence within the time limit
- Look for blue pulse feedback at corners
- Avoid touching buttons, inputs, or interactive elements

**Admin panel requires login?**
- If deployed before this update, hard refresh:
  - Touch all four corners (clears cache)
  - Or in Chrome: Ctrl+Shift+R / Cmd+Shift+R

**Want different sequences?**
- Edit `/src/hooks/useTouchSequence.js`
- Available sequence types:
  - `corners` - Touch all 4 corners
  - `corners-clockwise` - Touch corners clockwise
  - `quadrants` - Touch all 4 quadrants
  - `triple-tap` - Triple tap same spot
  - `double-tap-corners` - Tap opposite corners

---

## Keyboard Shortcuts (REMOVED)

The following keyboard shortcuts have been **removed** and replaced with touch sequences:

- ~~Press 'k' 3 times~~ → Use double-tap corners instead
- ~~Other keyboard shortcuts~~ → All replaced with touch gestures

---

## PWA Features (NEW!)

### Service Worker Caching

The app now caches:
- Map tiles (faster loading, works offline)
- App assets (CSS, JS)
- API responses (view pins offline)

### Installing as PWA

**On Android (Chrome or Samsung Internet):**
1. Visit chicagomikes.us
2. Menu (⋮) → "Install app" or "Add to Home screen"
3. Tap "Install"
4. App icon appears on home screen
5. Opens in fullscreen (no browser UI!)

**On Fully Kiosk Browser:**
- Already runs fullscreen
- Benefits from PWA caching
- Enable "Use Chrome WebView" in settings for best performance

### PWA Updates

- Auto-updates in background
- Reloads automatically after 1 minute of idle
- Or manually refresh: touch all four corners

---

## Remote Admin Commands

### Refresh kiosk remotely:

```bash
# Get tablet IP from Fully Kiosk settings
TABLET_IP="192.168.1.150"
PASSWORD="your_password"

# Clear cache and reload
curl "http://$TABLET_IP:2323/?cmd=clearCache&password=$PASSWORD"
curl "http://$TABLET_IP:2323/?cmd=reload&password=$PASSWORD"
```

### Access remote admin web interface:

1. Enable in Fully Kiosk: Settings → Remote Administration → Enable
2. Set password
3. Visit: `http://TABLET-IP:2323` from any browser
4. Full control over kiosk!

---

## Summary

| Action | Touch Sequence | Time Limit |
|--------|---------------|------------|
| Refresh Page | Triple-tap same spot | 1 second |
| Admin Panel | Touch all 4 quadrants | 5 seconds |
| Kiosk Mode | Double-tap opposite corners | 2 seconds |

**No more keyboards needed for kiosk operation!** 🎉
