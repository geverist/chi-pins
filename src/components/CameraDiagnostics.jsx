// src/components/CameraDiagnostics.jsx
import { useState, useRef, useEffect } from 'react';

/**
 * CameraDiagnostics - Tool for troubleshooting camera access, permissions, and capabilities
 * Used to debug proximity detection, facial recognition, and motion sensing
 */
export function CameraDiagnostics() {
  const [logs, setLogs] = useState([]);
  const [cameraStream, setCameraStream] = useState(null);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [permissions, setPermissions] = useState(null);
  const [testing, setTesting] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }].slice(-50));
    console.log(`[CameraDiagnostics] ${message}`);
  };

  // Check camera permissions
  const checkPermissions = async () => {
    addLog('Checking camera permissions...', 'info');

    try {
      if (!navigator.permissions) {
        addLog('⚠️ Permissions API not available in this browser', 'warning');
        return;
      }

      const cameraPermission = await navigator.permissions.query({ name: 'camera' });
      setPermissions(cameraPermission.state);

      addLog(`📹 Camera permission: ${cameraPermission.state}`,
        cameraPermission.state === 'granted' ? 'success' : 'warning');

      // Listen for permission changes
      cameraPermission.onchange = () => {
        setPermissions(cameraPermission.state);
        addLog(`🔄 Camera permission changed to: ${cameraPermission.state}`, 'info');
      };
    } catch (err) {
      addLog(`❌ Permission check failed: ${err.message}`, 'error');
    }
  };

  // Enumerate camera devices
  const enumerateDevices = async () => {
    addLog('Enumerating camera devices...', 'info');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        addLog('❌ mediaDevices.enumerateDevices not available', 'error');
        return;
      }

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');

      setDevices(videoDevices);
      addLog(`✅ Found ${videoDevices.length} video input device(s)`, 'success');

      videoDevices.forEach((device, index) => {
        addLog(`  ${index + 1}. ${device.label || `Camera ${index + 1}`} (${device.deviceId.substr(0, 10)}...)`, 'info');
      });

      if (videoDevices.length === 0) {
        addLog('⚠️ No camera devices found!', 'warning');
      }
    } catch (err) {
      addLog(`❌ Device enumeration failed: ${err.message}`, 'error');
    }
  };

  // Test camera access
  const testCameraAccess = async (facingMode = 'user') => {
    addLog(`Testing camera access (${facingMode} camera)...`, 'info');
    setTesting(true);
    setError(null);

    try {
      // Check if getUserMedia exists
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser/webview');
      }

      addLog('Requesting camera access...', 'info');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      addLog('✅ Camera access granted!', 'success');
      addLog(`Stream active: ${stream.active}`, 'info');
      addLog(`Video tracks: ${stream.getVideoTracks().length}`, 'info');

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        addLog(`Resolution: ${settings.width}x${settings.height}`, 'info');
        addLog(`Frame rate: ${settings.frameRate} fps`, 'info');
        addLog(`Facing mode: ${settings.facingMode || 'unknown'}`, 'info');
        addLog(`Device ID: ${settings.deviceId?.substr(0, 10) || 'unknown'}...`, 'info');
      }

      // Display video feed
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        addLog('📹 Video feed started', 'success');
      }

      setCameraStream(stream);
      setTesting(false);
    } catch (err) {
      addLog(`❌ Camera access failed: ${err.name}`, 'error');
      addLog(`   Message: ${err.message}`, 'error');

      if (err.name === 'NotAllowedError') {
        addLog('   → Camera permission denied by user or system', 'error');
      } else if (err.name === 'NotFoundError') {
        addLog('   → No camera device found', 'error');
      } else if (err.name === 'NotReadableError') {
        addLog('   → Camera is already in use by another app', 'error');
      } else if (err.name === 'OverconstrainedError') {
        addLog('   → Camera constraints cannot be satisfied', 'error');
      }

      setError(err.message);
      setTesting(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (cameraStream) {
      addLog('Stopping camera...', 'info');
      cameraStream.getTracks().forEach(track => {
        track.stop();
        addLog(`  Stopped track: ${track.kind} (${track.label})`, 'info');
      });
      setCameraStream(null);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      addLog('✅ Camera stopped', 'success');
    }
  };

  // Test motion detection
  const testMotionDetection = () => {
    if (!cameraStream || !videoRef.current || !canvasRef.current) {
      addLog('❌ Start camera first to test motion detection', 'error');
      return;
    }

    addLog('🎬 Starting motion detection test...', 'info');

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    let previousFrame = null;
    let frameCount = 0;

    const detectMotion = () => {
      if (!videoRef.current || videoRef.current.readyState !== 4) {
        setTimeout(detectMotion, 100);
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const currentPixels = currentImageData.data;

      if (previousFrame) {
        let totalDiff = 0;
        let significantPixels = 0;

        for (let i = 0; i < currentPixels.length; i += 16) {
          const rDiff = Math.abs(currentPixels[i] - previousFrame[i]);
          const gDiff = Math.abs(currentPixels[i + 1] - previousFrame[i + 1]);
          const bDiff = Math.abs(currentPixels[i + 2] - previousFrame[i + 2]);
          const avgDiff = (rDiff + gDiff + bDiff) / 3;

          totalDiff += avgDiff;
          if (avgDiff > 15) {
            significantPixels++;
          }
        }

        const pixelCount = currentPixels.length / 4;
        const motionScore = Math.min(100, (significantPixels / (pixelCount / 4)) * 100);

        frameCount++;
        if (frameCount % 10 === 0) {
          addLog(`📊 Motion score: ${Math.round(motionScore)}%`,
            motionScore > 30 ? 'success' : 'info');
        }
      }

      previousFrame = new Uint8ClampedArray(currentPixels);

      if (frameCount < 100) { // Run for 100 frames (~50 seconds at 2fps)
        setTimeout(detectMotion, 500);
      } else {
        addLog('✅ Motion detection test complete', 'success');
      }
    };

    detectMotion();
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared', 'info');
  };

  // Run full diagnostic on mount
  useEffect(() => {
    addLog('🔍 Camera Diagnostics Tool initialized', 'info');
    checkPermissions();
    enumerateDevices();

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div style={{
      padding: '20px',
      background: '#1a1a1a',
      borderRadius: '8px',
      color: '#fff',
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '600' }}>
        🔍 Camera Diagnostics
      </h3>

      {/* Status Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <div style={{
          padding: '12px',
          background: '#2a2a2a',
          borderRadius: '6px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Permission</div>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: permissions === 'granted' ? '#00ff00' : permissions === 'denied' ? '#ff4444' : '#ffaa00'
          }}>
            {permissions || 'Unknown'}
          </div>
        </div>

        <div style={{
          padding: '12px',
          background: '#2a2a2a',
          borderRadius: '6px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Devices Found</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: devices.length > 0 ? '#00ff00' : '#ff4444' }}>
            {devices.length}
          </div>
        </div>

        <div style={{
          padding: '12px',
          background: '#2a2a2a',
          borderRadius: '6px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Stream Status</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: cameraStream ? '#00ff00' : '#888' }}>
            {cameraStream ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={checkPermissions}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Check Permissions
        </button>

        <button
          onClick={enumerateDevices}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          List Devices
        </button>

        <button
          onClick={() => testCameraAccess('user')}
          disabled={testing || cameraStream}
          style={{
            padding: '8px 16px',
            background: testing || cameraStream ? '#555' : '#10b981',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontWeight: '600',
            cursor: testing || cameraStream ? 'not-allowed' : 'pointer',
            fontSize: '13px',
          }}
        >
          {testing ? 'Testing...' : 'Test Front Camera'}
        </button>

        <button
          onClick={testMotionDetection}
          disabled={!cameraStream}
          style={{
            padding: '8px 16px',
            background: cameraStream ? '#8b5cf6' : '#555',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontWeight: '600',
            cursor: cameraStream ? 'pointer' : 'not-allowed',
            fontSize: '13px',
          }}
        >
          Test Motion Detection
        </button>

        <button
          onClick={stopCamera}
          disabled={!cameraStream}
          style={{
            padding: '8px 16px',
            background: cameraStream ? '#ef4444' : '#555',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontWeight: '600',
            cursor: cameraStream ? 'pointer' : 'not-allowed',
            fontSize: '13px',
          }}
        >
          Stop Camera
        </button>

        <button
          onClick={clearLogs}
          style={{
            padding: '8px 16px',
            background: '#6b7280',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Clear Logs
        </button>
      </div>

      {/* Video Preview */}
      {cameraStream && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            📹 Camera Feed:
          </div>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              maxWidth: '640px',
              height: 'auto',
              borderRadius: '8px',
              background: '#000',
            }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '12px',
          background: '#ff4444',
          borderRadius: '6px',
          marginBottom: '20px',
          fontSize: '13px',
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Log Output */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
          📋 Diagnostic Log:
        </div>
        <div style={{
          background: '#2a2a2a',
          borderRadius: '6px',
          padding: '12px',
          maxHeight: '400px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '12px',
        }}>
          {logs.length === 0 ? (
            <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
              No logs yet. Click buttons above to run diagnostics.
            </div>
          ) : (
            logs.map((log, i) => (
              <div
                key={i}
                style={{
                  padding: '4px 0',
                  color: log.type === 'error' ? '#ff4444' :
                         log.type === 'warning' ? '#ffaa00' :
                         log.type === 'success' ? '#00ff00' : '#ccc',
                }}
              >
                <span style={{ color: '#888' }}>[{log.timestamp}]</span> {log.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
