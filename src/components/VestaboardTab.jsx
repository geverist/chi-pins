// src/components/VestaboardTab.jsx
import { useState, useEffect } from 'react';
import {
  isVestaboardConfigured,
  sendTextToVestaboard,
  notifyNowPlaying,
  notifyOrderReady
} from '../lib/vestaboard';

export default function VestaboardTab({ settings, setSettings }) {
  const [apiKey, setApiKey] = useState('');
  const [localIP, setLocalIP] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState([]);

  // Load API key from environment on mount
  useEffect(() => {
    const envKey = import.meta.env.VITE_VESTABOARD_API_KEY;
    if (envKey) {
      setApiKey(envKey);
    }
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await sendTextToVestaboard('CONNECTION TEST\n\nCHI-PINS KIOSK\n\nSUCCESS');

      if (result.status === 'error') {
        setTestResult({ success: false, message: result.message });
      } else {
        setTestResult({ success: true, message: 'Connection successful! Check your Vestaboard.' });
      }
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setTesting(false);
    }
  };

  const handleTestNowPlaying = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await notifyNowPlaying(
        {
          artist: 'The Beatles',
          title: 'Hey Jude'
        },
        settings.vestaboardEnabled
      );

      if (result.status === 'error' || result.status === 'disabled') {
        setTestResult({ success: false, message: result.message });
      } else {
        setTestResult({ success: true, message: '"Now Playing" test sent! Check your Vestaboard.' });
      }
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setTesting(false);
    }
  };

  const handleTestOrderReady = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await notifyOrderReady(
        {
          customerName: 'John Doe',
          orderNumber: '12345'
        },
        settings.vestaboardEnabled
      );

      if (result.status === 'error' || result.status === 'disabled') {
        setTestResult({ success: false, message: result.message });
      } else {
        setTestResult({ success: true, message: '"Order Ready" test sent! Check your Vestaboard.' });
      }
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setTesting(false);
    }
  };

  const handleNetworkScan = async () => {
    setScanning(true);
    setScanResults([]);
    setTestResult(null);

    try {
      // Try to get local IP first
      const localIPAddress = await getLocalIP();
      if (localIPAddress) {
        setLocalIP(localIPAddress);
        setTestResult({
          success: true,
          message: `Local IP detected: ${localIPAddress}\n\nVestaboard typically uses ports 7000-7001.\n\nTry accessing: http://${localIPAddress}:7000`
        });
      } else {
        setTestResult({
          success: false,
          message: 'Could not detect local IP. Please enter Vestaboard IP manually.'
        });
      }

      // Note: Full network scanning is not practical in browser environment
      // User must manually find Vestaboard IP via router admin or Vestaboard app
      setScanResults([
        {
          message: 'Network scanning is limited in browser environment.',
          instructions: [
            '1. Find your Vestaboard IP address via:',
            '   - Your router\'s admin panel (typically 192.168.1.1)',
            '   - Vestaboard mobile app settings',
            '   - Network scanning tool on your computer',
            '',
            '2. Common Vestaboard IPs:',
            '   - 192.168.1.x (most home routers)',
            '   - 10.0.0.x (some routers)',
            '',
            '3. Once found, use the Read/Write API (cloud-based) instead.',
            '   Get your API key from: vestaboard.com/developers'
          ]
        }
      ]);
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setScanning(false);
    }
  };

  const getLocalIP = async () => {
    try {
      return new Promise((resolve) => {
        const rtc = new RTCPeerConnection({ iceServers: [] });
        rtc.createDataChannel('');
        rtc.createOffer().then(offer => rtc.setLocalDescription(offer));

        rtc.onicecandidate = (event) => {
          if (!event || !event.candidate || !event.candidate.candidate) {
            rtc.close();
            resolve(null);
            return;
          }

          const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
          const match = ipRegex.exec(event.candidate.candidate);

          if (match && match[1]) {
            rtc.close();
            resolve(match[1]);
          }
        };

        setTimeout(() => {
          rtc.close();
          resolve(null);
        }, 2000);
      });
    } catch (error) {
      console.error('[Vestaboard] Failed to get local IP:', error);
      return null;
    }
  };

  const isConfigured = isVestaboardConfigured();

  return (
    <div style={styles.container}>
      <SectionGrid>
        {/* Enable/Disable Section */}
        <Card title="📺 Vestaboard Integration">
          <FieldRow label="Enable Vestaboard">
            <Toggle
              checked={settings.vestaboardEnabled}
              onChange={(v) => setSettings(s => ({ ...s, vestaboardEnabled: v }))}
            />
          </FieldRow>

          {settings.vestaboardEnabled && (
            <>
              <FieldRow label="Status">
                <StatusIndicator configured={isConfigured} enabled={settings.vestaboardEnabled} />
              </FieldRow>

              <InfoBox>
                <p><strong>About Vestaboard:</strong></p>
                <p>Vestaboard is a mechanical split-flap display for showing messages, notifications, and "Now Playing" information in your venue.</p>
                <br />
                <p><strong>Setup Instructions:</strong></p>
                <ol style={{ paddingLeft: '20px', marginTop: '8px' }}>
                  <li>Get your API key from <a href="https://www.vestaboard.com/developers" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>vestaboard.com/developers</a></li>
                  <li>Add <code>VITE_VESTABOARD_API_KEY=your-key</code> to your <code>.env</code> file</li>
                  <li>Restart the application</li>
                  <li>Enable Vestaboard above and test connection</li>
                </ol>
              </InfoBox>
            </>
          )}
        </Card>

        {/* Configuration Section - Only show when enabled */}
        {settings.vestaboardEnabled && (
          <>
            {/* API Configuration */}
            <Card title="🔑 API Configuration">
              <FieldRow label="Read/Write API Key">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Vestaboard API key"
                  style={styles.input}
                  disabled
                  title="API key must be set in .env file as VITE_VESTABOARD_API_KEY"
                />
              </FieldRow>

              <InfoBox type="warning">
                <strong>⚠️ API Key Configuration:</strong><br />
                The API key must be set in your <code>.env</code> file as <code>VITE_VESTABOARD_API_KEY</code>.<br />
                This ensures the key is not exposed in the admin panel.<br />
                <br />
                Current status: {isConfigured ? '✅ Configured' : '❌ Not configured'}
              </InfoBox>

              <FieldRow label="Test Connection">
                <button
                  onClick={handleTestConnection}
                  disabled={testing || !isConfigured}
                  style={styles.button}
                >
                  {testing ? 'Testing...' : '🧪 Send Test Message'}
                </button>
              </FieldRow>

              {testResult && (
                <div style={testResult.success ? styles.successBox : styles.errorBox}>
                  {testResult.message}
                </div>
              )}
            </Card>

            {/* Network Discovery */}
            <Card title="🌐 Network Discovery">
              <InfoBox>
                <p><strong>Cloud API (Recommended):</strong></p>
                <p>The Read/Write API key connects to Vestaboard via the cloud, which is the recommended method for most users.</p>
                <br />
                <p><strong>Local API (Advanced):</strong></p>
                <p>For local network control, you'll need to:</p>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                  <li>Enable Local API on your Vestaboard (via mobile app)</li>
                  <li>Find your Vestaboard's local IP address</li>
                  <li>Configure firewall rules if needed</li>
                </ul>
              </InfoBox>

              <FieldRow label="Local IP Address">
                <input
                  type="text"
                  value={localIP}
                  onChange={(e) => setLocalIP(e.target.value)}
                  placeholder="e.g., 192.168.1.100"
                  style={styles.input}
                />
              </FieldRow>

              <FieldRow label="Network Scan">
                <button
                  onClick={handleNetworkScan}
                  disabled={scanning}
                  style={styles.button}
                >
                  {scanning ? 'Scanning...' : '🔍 Detect Local IP'}
                </button>
              </FieldRow>

              {scanResults.length > 0 && (
                <div style={styles.scanResults}>
                  {scanResults.map((result, idx) => (
                    <div key={idx} style={styles.scanResult}>
                      <p><strong>{result.message}</strong></p>
                      {result.instructions && result.instructions.map((line, i) => (
                        <p key={i} style={{ margin: '4px 0', fontSize: '13px', fontFamily: 'monospace' }}>
                          {line}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Feature Configuration */}
            <Card title="🎵 Now Playing Notifications">
              <FieldRow label="Enable Now Playing">
                <Toggle
                  checked={settings.vestaboardNowPlaying !== false}
                  onChange={(v) => setSettings(s => ({ ...s, vestaboardNowPlaying: v }))}
                />
              </FieldRow>

              <InfoBox>
                When enabled, displays artist and song information on Vestaboard before audio playback starts.
                <br /><br />
                <strong>Format:</strong>
                <pre style={styles.pre}>
{`NOW PLAYING

ARTIST NAME

SONG TITLE`}
                </pre>
              </InfoBox>

              <FieldRow label="Test Now Playing">
                <button
                  onClick={handleTestNowPlaying}
                  disabled={testing || !isConfigured || !settings.vestaboardEnabled}
                  style={styles.button}
                >
                  {testing ? 'Testing...' : '🎵 Test "Now Playing"'}
                </button>
              </FieldRow>
            </Card>

            <Card title="🍔 Order Notifications (POS Integration)">
              <FieldRow label="Enable Order Notifications">
                <Toggle
                  checked={settings.vestaboardOrders !== false}
                  onChange={(v) => setSettings(s => ({ ...s, vestaboardOrders: v }))}
                />
              </FieldRow>

              <InfoBox type="warning">
                <strong>🚧 Feature Status: Stubbed</strong><br />
                Order notification integration is stubbed out for future implementation.<br />
                <br />
                <strong>Supported POS Systems:</strong>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                  <li>Square (webhook ready)</li>
                  <li>Toast (webhook ready)</li>
                  <li>Clover (webhook ready)</li>
                  <li>Custom (webhook with transformer)</li>
                </ul>
                <br />
                See <code>VESTABOARD_POS_INTEGRATION.md</code> for setup instructions.
              </InfoBox>

              <InfoBox>
                When enabled, displays customer name and order number when orders are ready.
                <br /><br />
                <strong>Format:</strong>
                <pre style={styles.pre}>
{`ORDER READY

CUSTOMER NAME

ORDER #123456`}
                </pre>
              </InfoBox>

              <FieldRow label="Test Order Ready">
                <button
                  onClick={handleTestOrderReady}
                  disabled={testing || !isConfigured || !settings.vestaboardEnabled}
                  style={styles.button}
                >
                  {testing ? 'Testing...' : '🍔 Test "Order Ready"'}
                </button>
              </FieldRow>
            </Card>

            {/* Rate Limiting Info */}
            <Card title="⏱️ Rate Limiting">
              <InfoBox>
                <strong>Vestaboard API Rate Limits:</strong>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                  <li><strong>1 message per 15 seconds</strong> (automatically enforced)</li>
                  <li>Messages sent too quickly are queued and delayed</li>
                  <li>Priority: Order notifications {">"} Now Playing {">"} General messages</li>
                </ul>
              </InfoBox>
            </Card>
          </>
        )}
      </SectionGrid>
    </div>
  );
}

// Helper Components
function SectionGrid({ children }) {
  return <div style={styles.sectionGrid}>{children}</div>;
}

function Card({ title, children }) {
  return (
    <div style={styles.card}>
      {title && <h3 style={styles.cardTitle}>{title}</h3>}
      <div style={styles.cardContent}>{children}</div>
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div style={styles.fieldRow}>
      <label style={styles.label}>{label}</label>
      <div style={styles.fieldValue}>{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <label style={styles.toggleContainer}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={styles.toggleInput}
      />
      <span style={{ ...styles.toggleSlider, ...(checked ? styles.toggleSliderActive : {}) }}>
        <span style={{ ...styles.toggleThumb, ...(checked ? styles.toggleThumbActive : {}) }} />
      </span>
    </label>
  );
}

function StatusIndicator({ configured, enabled }) {
  const status = !configured
    ? { text: 'Not Configured', color: '#ef4444', icon: '❌' }
    : !enabled
    ? { text: 'Disabled', color: '#f59e0b', icon: '⏸️' }
    : { text: 'Active', color: '#10b981', icon: '✅' };

  return (
    <div style={{ ...styles.statusIndicator, color: status.color }}>
      <span style={styles.statusIcon}>{status.icon}</span>
      <span style={styles.statusText}>{status.text}</span>
    </div>
  );
}

function InfoBox({ children, type = 'info' }) {
  const bgColor = type === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)';
  const borderColor = type === 'warning' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.3)';

  return (
    <div style={{ ...styles.infoBox, background: bgColor, borderColor }}>
      {children}
    </div>
  );
}

// Styles
const styles = {
  container: {
    width: '100%',
    height: '100%',
    overflow: 'auto',
  },
  sectionGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '20px',
    padding: '20px',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '20px',
  },
  cardTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#ffffff',
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    minHeight: '40px',
  },
  label: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.8)',
    flex: '0 0 auto',
    minWidth: '180px',
  },
  fieldValue: {
    flex: '1 1 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  input: {
    width: '100%',
    maxWidth: '300px',
    padding: '8px 12px',
    fontSize: '14px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    color: '#ffffff',
  },
  button: {
    padding: '8px 16px',
    fontSize: '14px',
    background: 'rgba(59, 130, 246, 0.2)',
    border: '1px solid rgba(59, 130, 246, 0.4)',
    borderRadius: '6px',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  toggleContainer: {
    position: 'relative',
    display: 'inline-block',
    width: '48px',
    height: '26px',
    cursor: 'pointer',
  },
  toggleInput: {
    opacity: 0,
    width: 0,
    height: 0,
  },
  toggleSlider: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '13px',
    transition: '0.3s',
  },
  toggleSliderActive: {
    background: 'rgba(59, 130, 246, 0.6)',
  },
  toggleThumb: {
    position: 'absolute',
    height: '20px',
    width: '20px',
    left: '3px',
    bottom: '3px',
    background: 'white',
    borderRadius: '50%',
    transition: '0.3s',
  },
  toggleThumbActive: {
    transform: 'translateX(22px)',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600',
  },
  statusIcon: {
    fontSize: '16px',
  },
  statusText: {
    fontSize: '14px',
  },
  infoBox: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '13px',
    lineHeight: '1.5',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  pre: {
    background: 'rgba(0, 0, 0, 0.3)',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '12px',
    lineHeight: '1.4',
    fontFamily: 'monospace',
    marginTop: '8px',
    whiteSpace: 'pre',
  },
  successBox: {
    padding: '12px 16px',
    borderRadius: '8px',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#10b981',
    fontSize: '13px',
  },
  errorBox: {
    padding: '12px 16px',
    borderRadius: '8px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
    fontSize: '13px',
  },
  scanResults: {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  scanResult: {
    padding: '12px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    fontSize: '13px',
    lineHeight: '1.5',
  },
};
