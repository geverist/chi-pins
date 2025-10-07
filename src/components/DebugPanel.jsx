// src/components/DebugPanel.jsx
import { useState, useEffect } from 'react';

/**
 * On-screen debug panel for viewing console logs on the kiosk
 * Shows recent console.log, console.warn, and console.error messages
 *
 * To enable: Add ?debug=true to URL or press D-E-B-U-G sequence
 */
export default function DebugPanel({ enabled = false }) {
  const [logs, setLogs] = useState([]);
  const [visible, setVisible] = useState(enabled);

  useEffect(() => {
    if (!visible) return;

    const maxLogs = 100;
    const addLog = (type, args) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      const timestamp = new Date().toLocaleTimeString();

      setLogs(prev => {
        const newLogs = [...prev, { type, message, timestamp, id: Date.now() }];
        return newLogs.slice(-maxLogs); // Keep last 100
      });
    };

    // Intercept console methods
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
      originalLog(...args);
      addLog('log', args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args);
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, [visible]);

  // Check URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'true') {
      setVisible(true);
    }
  }, []);

  // Keyboard shortcut: D-E-B-U-G
  useEffect(() => {
    const sequence = ['d', 'e', 'b', 'u', 'g'];
    let pressed = [];

    const handleKey = (e) => {
      pressed.push(e.key.toLowerCase());
      if (pressed.length > sequence.length) {
        pressed.shift();
      }

      if (pressed.join('') === sequence.join('')) {
        setVisible(v => !v);
        pressed = [];
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  if (!visible) return null;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div style={styles.title}>🐛 Debug Console</div>
        <button
          onClick={() => setLogs([])}
          style={styles.clearBtn}
          aria-label="Clear logs"
        >
          Clear
        </button>
        <button
          onClick={() => setVisible(false)}
          style={styles.closeBtn}
          aria-label="Close debug panel"
        >
          ×
        </button>
      </div>
      <div style={styles.logs}>
        {logs.length === 0 ? (
          <div style={styles.empty}>No logs yet. Waiting for console messages...</div>
        ) : (
          logs.map(log => (
            <div key={log.id} style={{
              ...styles.logEntry,
              ...(log.type === 'warn' ? styles.logWarn : {}),
              ...(log.type === 'error' ? styles.logError : {}),
            }}>
              <span style={styles.timestamp}>{log.timestamp}</span>
              <span style={styles.logType}>[{log.type}]</span>
              <span style={styles.logMessage}>{log.message}</span>
            </div>
          ))
        )}
      </div>
      <div style={styles.footer}>
        Press D-E-B-U-G or add ?debug=true to URL to toggle
      </div>
    </div>
  );
}

const styles = {
  panel: {
    position: 'fixed',
    bottom: 20,
    right: 20,
    width: '400px',
    maxWidth: '90vw',
    height: '400px',
    background: '#1a1a1a',
    border: '2px solid #333',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 99999,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
    fontFamily: 'monospace',
    fontSize: '11px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: '#2a2a2a',
    borderBottom: '1px solid #333',
    borderRadius: '6px 6px 0 0',
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '13px',
    flex: 1,
  },
  clearBtn: {
    background: '#4a5568',
    color: '#fff',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    marginRight: '8px',
  },
  closeBtn: {
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logs: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
    background: '#0a0a0a',
  },
  empty: {
    color: '#666',
    textAlign: 'center',
    padding: '20px',
    fontStyle: 'italic',
  },
  logEntry: {
    padding: '4px 6px',
    marginBottom: '2px',
    borderRadius: '3px',
    display: 'flex',
    gap: '8px',
    background: '#1a1a1a',
    color: '#e0e0e0',
    wordBreak: 'break-word',
    fontSize: '10px',
    lineHeight: '1.4',
  },
  logWarn: {
    background: '#2d2416',
    borderLeft: '3px solid #f59e0b',
  },
  logError: {
    background: '#2d1616',
    borderLeft: '3px solid #ef4444',
  },
  timestamp: {
    color: '#666',
    flexShrink: 0,
    fontSize: '9px',
  },
  logType: {
    color: '#888',
    flexShrink: 0,
    textTransform: 'uppercase',
    fontSize: '9px',
  },
  logMessage: {
    flex: 1,
    whiteSpace: 'pre-wrap',
  },
  footer: {
    padding: '6px 12px',
    background: '#2a2a2a',
    borderTop: '1px solid #333',
    color: '#666',
    fontSize: '9px',
    textAlign: 'center',
    borderRadius: '0 0 6px 6px',
  },
};
