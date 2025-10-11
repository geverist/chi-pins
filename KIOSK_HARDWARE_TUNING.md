# Kiosk Hardware-Specific Performance Tuning

## 🎯 Adaptive Memory Caching - Now Hardware-Aware!

Your in-memory tile cache is now **automatically optimized for your kiosk's hardware**. The system detects available RAM and adjusts cache size accordingly.

---

## 📊 How Cache Size is Determined

### Automatic Detection (Preferred)
The system uses `navigator.deviceMemory` API to detect your device's RAM:

| Device RAM | Cache Size | Memory Used | % of RAM |
|------------|-----------|-------------|----------|
| **8GB+** (High-end) | 1000 tiles | ~15MB | 0.19% |
| **4-8GB** (Mid-range) | 700 tiles | ~10.5MB | 0.26% |
| **2-4GB** (Low-mid) | 400 tiles | ~6MB | 0.30% |
| **<2GB** (Low-end) | 200 tiles | ~3MB | 0.15% |

### Fallback Detection (If RAM detection unavailable)
If the browser doesn't support `deviceMemory`, we use Android version:

| Android Version | Cache Size | Memory Used |
|----------------|-----------|-------------|
| **Android 11+** | 500 tiles | ~7.5MB |
| **Android 8-10** | 300 tiles | ~4.5MB |
| **Android <8** | 200 tiles | ~3MB |

---

## 🔍 Check Your Kiosk's Configuration

### Method 1: ADB Remote Debugging (Recommended)

1. **Connect via USB**:
   ```bash
   adb devices
   ```

2. **Open Chrome DevTools**:
   - Chrome desktop → `chrome://inspect`
   - Click "inspect" on your device

3. **Run in Console**:
   ```javascript
   // Get complete performance report
   window.performanceDiagnostics.getReport()
   ```

**Example Output**:
```
========== PERFORMANCE DIAGNOSTICS ==========
Device: {
  deviceMemory: "4GB",
  hardwareConcurrency: 4,
  platform: "Linux armv8l",
  online: true
}
Memory: {
  usedJSHeapSize: "45.2 MB",
  totalJSHeapSize: "67.1 MB",
  jsHeapSizeLimit: "512 MB",
  usagePercent: "8.8%"
}
Tile Cache: {
  size: 687,
  maxSize: 700,
  hits: 4523,
  misses: 234,
  hitRate: "95.1%",    ← TARGET: >80%
  memoryEstimate: "10.3 MB"
}
Blob Manager: {
  trackedUrls: 3,
  oldestAge: 2s
}
Recommendations: [
  {
    type: "success",
    message: "Excellent cache hit rate: 95.1%!"
  }
]
===========================================
```

### Method 2: Check Console on Startup

Look for these logs when the app starts:

```
[TileCache] Detected device memory: 4GB
[TileCache] Mid-range device detected, using 700 tiles (~10.5MB)
[TileCache] Initialized with maxSize=700 tiles (~10.5MB)
```

---

## 🎛️ Manual Override (If Needed)

If automatic detection isn't optimal for your hardware, you can manually override:

### Edit `src/lib/tileCache.js`:

```javascript
export function getTileCache() {
  if (!instance) {
    // MANUAL OVERRIDE: Set custom size (in tiles)
    instance = new TileCache(600); // 600 tiles = ~9MB

    // OR: Let system auto-detect (recommended)
    // instance = new TileCache(null);
  }
  return instance;
}
```

---

## 📈 Real-Time Monitoring

### Start Continuous Monitoring (Every 30 seconds):
```javascript
// In Chrome DevTools console:
window.performanceDiagnostics.startMonitoring()
```

### Stop Monitoring:
```javascript
window.performanceDiagnostics.stopMonitoring()
```

### Single Report:
```javascript
window.performanceDiagnostics.getReport()
```

---

## 🎯 Tuning Guidelines

### Your Cache Hit Rate Matters Most

**Cache Hit Rate** is the % of tiles loaded from memory (instant) vs. disk/network (slow).

| Hit Rate | Performance | Action |
|----------|-------------|--------|
| **95%+** | Excellent ✅ | No changes needed |
| **80-95%** | Good ✅ | Working as intended |
| **60-80%** | Fair ⚠️ | Consider increasing cache size |
| **<60%** | Poor ❌ | Increase cache size or check for memory leaks |

### Memory Usage Guidelines

**JS Heap Usage** indicates overall memory pressure:

| Heap Usage | Status | Action |
|------------|--------|--------|
| **<50%** | Healthy ✅ | Can increase cache size for better performance |
| **50-70%** | Normal ✅ | Current settings optimal |
| **70-85%** | Warning ⚠️ | Monitor closely, reduce cache if issues occur |
| **>85%** | Critical ❌ | Reduce cache size immediately |

---

## 🔧 Optimal Settings by Kiosk Hardware

### Example: 2GB RAM Tablet (Low-end)
**Symptoms**: Occasional lag, apps closing in background

**Recommended Settings**:
```javascript
new TileCache(250)  // 250 tiles = ~3.75MB
```

**Expected Performance**:
- Hit rate: 85-90%
- Memory: 5-10% of RAM
- Smooth 55-60fps

---

### Example: 4GB RAM Tablet (Mid-range) ⭐ MOST COMMON
**Symptoms**: Generally smooth, occasional stutter on heavy use

**Recommended Settings**:
```javascript
new TileCache(null)  // Auto-detect: 700 tiles = ~10.5MB
```

**Expected Performance**:
- Hit rate: 92-96%
- Memory: 8-12% of RAM
- Smooth 60fps

---

### Example: 8GB RAM Tablet (High-end)
**Symptoms**: Buttery smooth, no issues

**Recommended Settings**:
```javascript
new TileCache(null)  // Auto-detect: 1000 tiles = ~15MB
```

**Expected Performance**:
- Hit rate: 96-99%
- Memory: 5-8% of RAM
- Locked 60fps

---

## 🚨 Troubleshooting

### Issue: Cache Hit Rate <80%

**Diagnosis**:
```javascript
const report = window.performanceDiagnostics.getReport()
console.log(report.cache.tiles)
```

**Solutions**:
1. **Cache too small** → Increase size by 50%
2. **Too many zoom levels** → Stick to 2-3 zoom levels
3. **Map panning too much** → Cache can't keep up with rapid panning

---

### Issue: High Memory Usage (>80%)

**Diagnosis**:
```javascript
const report = window.performanceDiagnostics.getReport()
console.log(report.memory.usagePercent)
```

**Solutions**:
1. **Reduce cache size** → Decrease by 25-50%
2. **Check for leaks** → Look at `trackedUrls` in blob manager
3. **Restart app** → Memory should reset to <20%

---

### Issue: App Crashes or Slows Down Over Time

**Diagnosis**:
```javascript
// Start monitoring
window.performanceDiagnostics.startMonitoring(60000) // Every minute

// Watch for steady memory growth
```

**Solutions**:
1. **Memory leak detected** → Check blob URL cleanup
2. **Cache never evicting** → Verify LRU is working
3. **Too much disk I/O** → Increase memory cache, reduce disk cache

---

## 📝 Recommended Test Protocol

### 1. Initial Test (Day 1)
- Deploy app to kiosk
- Run `window.performanceDiagnostics.getReport()` immediately
- Record: device RAM, cache size, initial hit rate

### 2. Stress Test (30 minutes)
- Zoom in/out rapidly
- Pan around map extensively
- Switch between Chicago/Global multiple times
- Check hit rate: should stabilize at 85-95%

### 3. Long-term Test (8 hours)
- Leave app running normal kiosk operations
- Check memory every 2 hours:
  ```javascript
  window.performanceDiagnostics.getReport()
  ```
- Memory should stay <70%, hit rate >85%

### 4. Overnight Test (24 hours)
- Leave app running overnight
- Check in morning:
  - Memory usage should be stable (not growing)
  - Hit rate should be >90% (tiles well cached)
  - No crashes or freezes

---

## ✅ Expected Results by Device Type

### 2GB RAM Device
- Hit rate: 85-90%
- Memory: 8-15% of RAM
- FPS: 55-60fps
- Smooth operation for 8+ hours

### 4GB RAM Device ⭐ RECOMMENDED
- Hit rate: 92-96%
- Memory: 8-12% of RAM
- FPS: 60fps locked
- Smooth operation for 24+ hours

### 8GB RAM Device
- Hit rate: 96-99%
- Memory: 5-8% of RAM
- FPS: 60fps locked
- Indefinite smooth operation

---

## 🎯 Quick Checklist

Use this for initial kiosk setup:

- [ ] Deploy app to kiosk
- [ ] Connect via ADB and open Chrome DevTools
- [ ] Run `window.performanceDiagnostics.getReport()`
- [ ] Check detected RAM: Should match physical RAM
- [ ] Check cache size: Should be appropriate for RAM
- [ ] Do 5-minute stress test (rapid zoom/pan)
- [ ] Check hit rate after stress test: Target >85%
- [ ] Check memory usage: Target <50%
- [ ] Monitor for 1 hour: Memory should be stable
- [ ] If hit rate <80%: Increase cache size by 50%
- [ ] If memory >70%: Decrease cache size by 25%
- [ ] Retest and document final settings

---

## 📞 Support

If you need help tuning for your specific hardware:

1. Run: `window.performanceDiagnostics.getReport()`
2. Copy the output
3. Include in your issue/question

**Key info to include**:
- Device model
- Android version
- RAM (from diagnostics)
- Cache hit rate
- Memory usage %
- Symptoms (lag, crashes, etc.)
