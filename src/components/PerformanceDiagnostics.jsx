// Performance Diagnostics Component
// Access via admin panel or by adding ?diagnostics=true to URL

import { useState, useEffect, useRef } from 'react';
import { perfMonitor } from '../lib/performanceMonitor';

export default function PerformanceDiagnostics() {
  const [stats, setStats] = useState(null);
  const [touchLog, setTouchLog] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [longTasks, setLongTasks] = useState([]);
  const touchLogRef = useRef([]);
  const longTasksRef = useRef([]);

  useEffect(() => {
    // Enable performance monitoring
    perfMonitor.enable();

    // Touch event logging
    const logTouch = (type) => (e) => {
      const entry = {
        type,
        target: e.target.tagName + (e.target.className ? '.' + e.target.className.split(' ')[0] : ''),
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now(),
        isTrusted: e.isTrusted,
      };

      touchLogRef.current.push(entry);
      if (touchLogRef.current.length > 100) {
        touchLogRef.current.shift();
      }

      console.log(`[TOUCH] ${type}:`, entry.target, `(${entry.x}, ${entry.y})`);
    };

    const pointerDown = logTouch('pointerdown');
    const pointerUp = logTouch('pointerup');
    const click = logTouch('click');
    const touchStart = logTouch('touchstart');
    const touchEnd = logTouch('touchend');

    // Add listeners in capture phase to see everything
    window.addEventListener('pointerdown', pointerDown, { capture: true, passive: true });
    window.addEventListener('pointerup', pointerUp, { capture: true, passive: true });
    window.addEventListener('click', click, { capture: true, passive: true });
    window.addEventListener('touchstart', touchStart, { capture: true, passive: true });
    window.addEventListener('touchend', touchEnd, { capture: true, passive: true });

    // Long task detection
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              const task = {
                duration: entry.duration.toFixed(0),
                name: entry.name,
                timestamp: new Date().toLocaleTimeString(),
              };
              longTasksRef.current.push(task);
              if (longTasksRef.current.length > 50) {
                longTasksRef.current.shift();
              }
              console.warn(`[LONG TASK] ${task.duration}ms - ${task.name}`);
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.log('[Diagnostics] Long task observer not supported');
      }
    }

    // Update stats every 2 seconds
    const interval = setInterval(() => {
      setStats(perfMonitor.getStats());
      setTouchLog([...touchLogRef.current.slice(-20)]); // Last 20 events
      setLongTasks([...longTasksRef.current.slice(-10)]); // Last 10 long tasks
    }, 2000);

    setIsMonitoring(true);

    return () => {
      clearInterval(interval);
      window.removeEventListener('pointerdown', pointerDown, { capture: true });
      window.removeEventListener('pointerup', pointerUp, { capture: true });
      window.removeEventListener('click', click, { capture: true });
      window.removeEventListener('touchstart', touchStart, { capture: true });
      window.removeEventListener('touchend', touchEnd, { capture: true });
    };
  }, []);

  const clearLogs = () => {
    touchLogRef.current = [];
    longTasksRef.current = [];
    setTouchLog([]);
    setLongTasks([]);
    perfMonitor.clear();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      width: 400,
      maxHeight: '90vh',
      background: 'rgba(0, 0, 0, 0.95)',
      color: '#00ff00',
      padding: 20,
      borderRadius: 8,
      fontFamily: 'monospace',
      fontSize: 11,
      overflowY: 'auto',
      zIndex: 10000,
      border: '2px solid #00ff00',
    }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#00ff00' }}>
        ⚡ Performance Diagnostics
      </h2>

      <button
        onClick={clearLogs}
        style={{
          background: '#00ff00',
          color: '#000',
          border: 'none',
          padding: '8px 16px',
          borderRadius: 4,
          cursor: 'pointer',
          marginBottom: 16,
          fontWeight: 'bold',
        }}
      >
        Clear Logs
      </button>

      {/* Performance Stats */}
      {stats && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 13, color: '#ffff00', margin: '0 0 8px' }}>📊 Performance Metrics</h3>

          <div style={{ marginBottom: 8 }}>
            <strong style={{ color: longTasks.length > 0 ? '#ff0000' : '#00ff00' }}>
              Long Tasks (&gt;50ms blocking):
            </strong>
            <div>{stats.longTasks.count} tasks</div>
            {stats.longTasks.avg > 0 && (
              <div>Avg: {stats.longTasks.avg.toFixed(0)}ms | Max: {stats.longTasks.max.toFixed(0)}ms</div>
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <strong>Database Syncs:</strong>
            <div>{stats.syncs.count} syncs</div>
            {stats.syncs.avg > 0 && (
              <div>Avg: {stats.syncs.avg.toFixed(0)}ms | Max: {stats.syncs.max.toFixed(0)}ms</div>
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <strong>Database Operations:</strong>
            <div>{stats.databaseOps.count} ops</div>
            {stats.databaseOps.avg > 0 && (
              <div>Avg: {stats.databaseOps.avg.toFixed(0)}ms | Max: {stats.databaseOps.max.toFixed(0)}ms</div>
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <strong>Tile Loads:</strong>
            <div>{stats.tiles.count} tiles</div>
            {stats.tiles.avg > 0 && (
              <div>Avg: {stats.tiles.avg.toFixed(0)}ms | Max: {stats.tiles.max.toFixed(0)}ms</div>
            )}
          </div>
        </div>
      )}

      {/* Long Tasks */}
      {longTasks.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 13, color: '#ff0000', margin: '0 0 8px' }}>
            🐌 Recent Long Tasks (Blocking UI)
          </h3>
          <div style={{ maxHeight: 150, overflowY: 'auto', fontSize: 10 }}>
            {longTasks.map((task, i) => (
              <div key={i} style={{
                marginBottom: 4,
                padding: 4,
                background: 'rgba(255, 0, 0, 0.2)',
                borderLeft: '3px solid #ff0000'
              }}>
                <div><strong>{task.duration}ms</strong> - {task.name}</div>
                <div style={{ color: '#888' }}>{task.timestamp}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Touch Event Log */}
      <div>
        <h3 style={{ fontSize: 13, color: '#ffff00', margin: '0 0 8px' }}>
          👆 Recent Touch Events (Last 20)
        </h3>
        <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: 10 }}>
          {touchLog.length === 0 ? (
            <div style={{ color: '#888' }}>No events yet. Try tapping buttons...</div>
          ) : (
            touchLog.slice().reverse().map((event, i) => (
              <div key={i} style={{
                marginBottom: 4,
                padding: 4,
                background: event.type === 'click' ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                borderLeft: event.type === 'click' ? '3px solid #00ff00' : '3px solid #666',
              }}>
                <div>
                  <strong style={{
                    color: event.type === 'click' ? '#00ff00' :
                           event.type === 'pointerdown' ? '#ffff00' : '#888'
                  }}>
                    {event.type}
                  </strong> on {event.target}
                </div>
                <div style={{ color: '#888' }}>
                  ({event.x}, {event.y}) {event.isTrusted ? '✓' : '✗'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 8, background: 'rgba(255, 255, 0, 0.1)', borderRadius: 4 }}>
        <strong style={{ color: '#ffff00' }}>💡 What to look for:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 10, lineHeight: 1.5 }}>
          <li>Red long tasks = UI is frozen during these</li>
          <li>If you tap a button and see pointerdown but NO click = event consumed</li>
          <li>If target shows wrong element = something is covering the button</li>
          <li>Database sync &gt;1000ms = blocking UI thread</li>
        </ul>
      </div>
    </div>
  );
}
