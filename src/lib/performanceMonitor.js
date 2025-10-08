// Performance monitoring utilities

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      tileLoadTimes: [],
      apiCallTimes: [],
      renderTimes: [],
      syncTimes: [],
      databaseOps: [],
      longTasks: [],
    };

    this.enabled = localStorage.getItem('perfMonitor') === 'true';

    // Track long tasks (>50ms) that block the main thread
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        this.longTaskObserver = new PerformanceObserver((list) => {
          if (!this.enabled) return;

          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              this.metrics.longTasks.push({
                duration: entry.duration,
                timestamp: Date.now(),
                name: entry.name,
              });

              if (this.metrics.longTasks.length > 50) {
                this.metrics.longTasks.shift();
              }

              console.warn(`[PerfMonitor] Long task detected: ${entry.duration.toFixed(0)}ms - ${entry.name}`);
            }
          }
        });

        this.longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.log('[PerfMonitor] Long task observer not supported');
      }
    }
  }

  enable() {
    this.enabled = true;
    localStorage.setItem('perfMonitor', 'true');
    console.log('[PerfMonitor] Enabled');
  }

  disable() {
    this.enabled = false;
    localStorage.removeItem('perfMonitor');
    console.log('[PerfMonitor] Disabled');
  }

  // Track tile loading performance
  trackTileLoad(url, startTime) {
    if (!this.enabled) return;

    const duration = performance.now() - startTime;
    this.metrics.tileLoadTimes.push({
      url,
      duration,
      timestamp: Date.now(),
    });

    // Keep only last 100 entries
    if (this.metrics.tileLoadTimes.length > 100) {
      this.metrics.tileLoadTimes.shift();
    }

    if (duration > 1000) {
      console.warn(`[PerfMonitor] Slow tile load: ${url} took ${duration.toFixed(0)}ms`);
    }
  }

  // Track API call performance
  trackAPICall(endpoint, startTime) {
    if (!this.enabled) return;

    const duration = performance.now() - startTime;
    this.metrics.apiCallTimes.push({
      endpoint,
      duration,
      timestamp: Date.now(),
    });

    if (this.metrics.apiCallTimes.length > 50) {
      this.metrics.apiCallTimes.shift();
    }

    if (duration > 2000) {
      console.warn(`[PerfMonitor] Slow API call: ${endpoint} took ${duration.toFixed(0)}ms`);
    }
  }

  // Track render performance
  trackRender(component, startTime) {
    if (!this.enabled) return;

    const duration = performance.now() - startTime;
    this.metrics.renderTimes.push({
      component,
      duration,
      timestamp: Date.now(),
    });

    if (this.metrics.renderTimes.length > 50) {
      this.metrics.renderTimes.shift();
    }

    if (duration > 100) {
      console.warn(`[PerfMonitor] Slow render: ${component} took ${duration.toFixed(0)}ms`);
    }
  }

  // Track database sync performance
  trackSync(operation, startTime, recordCount = 0) {
    if (!this.enabled) return;

    const duration = performance.now() - startTime;
    this.metrics.syncTimes.push({
      operation,
      duration,
      recordCount,
      timestamp: Date.now(),
    });

    if (this.metrics.syncTimes.length > 50) {
      this.metrics.syncTimes.shift();
    }

    if (duration > 1000) {
      console.warn(`[PerfMonitor] Slow sync: ${operation} (${recordCount} records) took ${duration.toFixed(0)}ms`);
    }
  }

  // Track individual database operations
  trackDatabaseOp(operation, startTime, table = '') {
    if (!this.enabled) return;

    const duration = performance.now() - startTime;
    this.metrics.databaseOps.push({
      operation,
      table,
      duration,
      timestamp: Date.now(),
    });

    if (this.metrics.databaseOps.length > 100) {
      this.metrics.databaseOps.shift();
    }

    if (duration > 500) {
      console.warn(`[PerfMonitor] Slow database op: ${operation} on ${table} took ${duration.toFixed(0)}ms`);
    }
  }

  // Get statistics
  getStats() {
    const calcStats = (arr) => {
      if (arr.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };
      const durations = arr.map(m => m.duration);
      return {
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        count: durations.length,
      };
    };

    return {
      tiles: calcStats(this.metrics.tileLoadTimes),
      api: calcStats(this.metrics.apiCallTimes),
      renders: calcStats(this.metrics.renderTimes),
      syncs: calcStats(this.metrics.syncTimes),
      databaseOps: calcStats(this.metrics.databaseOps),
      longTasks: calcStats(this.metrics.longTasks),
    };
  }

  // Print report
  report() {
    if (!this.enabled) {
      console.log('[PerfMonitor] Disabled. Enable with perfMonitor.enable()');
      return;
    }

    const stats = this.getStats();

    console.log('=== Performance Report ===');
    console.log('Tile Loads:', {
      count: stats.tiles.count,
      avg: `${stats.tiles.avg.toFixed(0)}ms`,
      min: `${stats.tiles.min.toFixed(0)}ms`,
      max: `${stats.tiles.max.toFixed(0)}ms`,
    });
    console.log('API Calls:', {
      count: stats.api.count,
      avg: `${stats.api.avg.toFixed(0)}ms`,
      min: `${stats.api.min.toFixed(0)}ms`,
      max: `${stats.api.max.toFixed(0)}ms`,
    });
    console.log('Renders:', {
      count: stats.renders.count,
      avg: `${stats.renders.avg.toFixed(0)}ms`,
      min: `${stats.renders.min.toFixed(0)}ms`,
      max: `${stats.renders.max.toFixed(0)}ms`,
    });
    console.log('Database Syncs:', {
      count: stats.syncs.count,
      avg: `${stats.syncs.avg.toFixed(0)}ms`,
      min: `${stats.syncs.min.toFixed(0)}ms`,
      max: `${stats.syncs.max.toFixed(0)}ms`,
    });
    console.log('Database Operations:', {
      count: stats.databaseOps.count,
      avg: `${stats.databaseOps.avg.toFixed(0)}ms`,
      min: `${stats.databaseOps.min.toFixed(0)}ms`,
      max: `${stats.databaseOps.max.toFixed(0)}ms`,
    });
    console.log('Long Tasks (>50ms blocking):', {
      count: stats.longTasks.count,
      avg: `${stats.longTasks.avg.toFixed(0)}ms`,
      min: `${stats.longTasks.min.toFixed(0)}ms`,
      max: `${stats.longTasks.max.toFixed(0)}ms`,
    });
    console.log('========================');
  }

  // Clear all metrics
  clear() {
    this.metrics = {
      tileLoadTimes: [],
      apiCallTimes: [],
      renderTimes: [],
      syncTimes: [],
      databaseOps: [],
      longTasks: [],
    };
    console.log('[PerfMonitor] Metrics cleared');
  }
}

// Global instance
export const perfMonitor = new PerformanceMonitor();

// Make available in console
if (typeof window !== 'undefined') {
  window.perfMonitor = perfMonitor;
}

// Log instructions
console.log(`
Performance Monitor available!
- perfMonitor.enable()  - Enable monitoring
- perfMonitor.disable() - Disable monitoring
- perfMonitor.report()  - Show performance report
- perfMonitor.clear()   - Clear metrics
`);
