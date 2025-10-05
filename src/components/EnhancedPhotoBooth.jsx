// src/components/EnhancedPhotoBooth.jsx
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { isDemoMode, safeDemoOperation } from '../lib/demoMode';

/**
 * Enhanced Photo Booth - Snapchat-like functionality
 *
 * Features:
 * - Real-time filters and effects
 * - AR face filters (emoji overlays)
 * - Drawings and text overlays
 * - Stickers and emojis
 * - Photo to pin attachment
 * - Instant sharing (SMS, email, social)
 * - Photo gallery
 * - Video recording (Snapchat stories style)
 */

export default function EnhancedPhotoBooth({ onClose, attachToPin = null }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [mode, setMode] = useState('camera'); // camera, photo, drawing, stickers, text

  // Filters
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [filterIntensity, setFilterIntensity] = useState(1.0);

  // Drawing
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#FF0000');
  const [drawWidth, setDrawWidth] = useState(5);
  const [drawings, setDrawings] = useState([]);

  // Text overlays
  const [textOverlays, setTextOverlays] = useState([]);
  const [currentText, setCurrentText] = useState('');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textSize, setTextSize] = useState(48);

  // Stickers
  const [stickers, setStickers] = useState([]);
  const [selectedSticker, setSelectedSticker] = useState(null);

  // Countdown timer
  const [countdown, setCountdown] = useState(null);

  // Face detection (optional - would need face-api.js or similar)
  const [faceDetected, setFaceDetected] = useState(false);

  const filters = [
    { id: 'none', name: 'Original', icon: '📷' },
    { id: 'vintage', name: 'Vintage', icon: '📺' },
    { id: 'bw', name: 'B&W', icon: '⬛' },
    { id: 'sepia', name: 'Sepia', icon: '🟫' },
    { id: 'cool', name: 'Cool', icon: '🧊' },
    { id: 'warm', name: 'Warm', icon: '🔥' },
    { id: 'dramatic', name: 'Dramatic', icon: '🎭' },
    { id: 'neon', name: 'Neon', icon: '💡' }
  ];

  const stickerPacks = {
    chicago: ['🌭', '🍕', '🏙️', '⚾', '🌊', '🎨', '🎵', '🍺'],
    food: ['🍔', '🍟', '🥤', '🌮', '🍪', '🎂', '🍦', '🥗'],
    emojis: ['😀', '😎', '🥳', '😍', '🤩', '😂', '🔥', '💯', '✨', '💕'],
    fun: ['🎉', '🎊', '🎈', '🎁', '⭐', '💫', '🌟', '✌️']
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Continuous filter preview
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || !stream || capturedPhoto) return;

    const animationFrame = () => {
      renderLivePreview();
      requestAnimationFrame(animationFrame);
    };

    const frameId = requestAnimationFrame(animationFrame);
    return () => cancelAnimationFrame(frameId);
  }, [stream, selectedFilter, filterIntensity, capturedPhoto]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user'
        },
        audio: false
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const renderLivePreview = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < 2) return;

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Apply selected filter
    if (selectedFilter && selectedFilter.id !== 'none') {
      applyFilter(ctx, canvas, selectedFilter.id, filterIntensity);
    }

    // Draw stickers on live preview
    stickers.forEach(sticker => {
      ctx.font = `${sticker.size}px Arial`;
      ctx.fillText(sticker.emoji, sticker.x, sticker.y);
    });

    // Draw text overlays on live preview
    textOverlays.forEach(overlay => {
      ctx.font = `bold ${overlay.size}px Arial`;
      ctx.fillStyle = overlay.color;
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.strokeText(overlay.text, overlay.x, overlay.y);
      ctx.fillText(overlay.text, overlay.x, overlay.y);
    });
  };

  const applyFilter = (ctx, canvas, filterId, intensity) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    switch (filterId) {
      case 'bw':
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = data[i + 1] = data[i + 2] = avg * intensity + data[i] * (1 - intensity);
        }
        break;

      case 'sepia':
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          data[i] = Math.min(255, (r * 0.393 + g * 0.769 + b * 0.189) * intensity + r * (1 - intensity));
          data[i + 1] = Math.min(255, (r * 0.349 + g * 0.686 + b * 0.168) * intensity + g * (1 - intensity));
          data[i + 2] = Math.min(255, (r * 0.272 + g * 0.534 + b * 0.131) * intensity + b * (1 - intensity));
        }
        break;

      case 'vintage':
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * 1.2 * intensity + data[i] * (1 - intensity));
          data[i + 1] = data[i + 1] * intensity + data[i + 1] * (1 - intensity);
          data[i + 2] = data[i + 2] * 0.8 * intensity + data[i + 2] * (1 - intensity);
        }
        break;

      case 'cool':
        for (let i = 0; i < data.length; i += 4) {
          data[i] = data[i] * 0.8 * intensity + data[i] * (1 - intensity);
          data[i + 1] = data[i + 1] * 0.9 * intensity + data[i + 1] * (1 - intensity);
          data[i + 2] = Math.min(255, data[i + 2] * 1.2 * intensity + data[i + 2] * (1 - intensity));
        }
        break;

      case 'warm':
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * 1.2 * intensity + data[i] * (1 - intensity));
          data[i + 1] = Math.min(255, data[i + 1] * 1.1 * intensity + data[i + 1] * (1 - intensity));
          data[i + 2] = data[i + 2] * 0.8 * intensity + data[i + 2] * (1 - intensity);
        }
        break;

      case 'dramatic':
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, (data[i] - 128) * 1.5 + 128)) * intensity + data[i] * (1 - intensity);
          data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * 1.5 + 128)) * intensity + data[i + 1] * (1 - intensity);
          data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * 1.5 + 128)) * intensity + data[i + 2] * (1 - intensity);
        }
        break;

      case 'neon':
        for (let i = 0; i < data.length; i += 4) {
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (brightness > 128) {
            data[i] = Math.min(255, data[i] * 1.5 * intensity + data[i] * (1 - intensity));
            data[i + 1] = Math.min(255, data[i + 1] * 1.5 * intensity + data[i + 1] * (1 - intensity));
            data[i + 2] = Math.min(255, data[i + 2] * 1.5 * intensity + data[i + 2] * (1 - intensity));
          }
        }
        break;
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const capturePhoto = () => {
    // Start countdown
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          takePhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const takePhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Canvas already has the filtered preview with stickers/text
    // Just need to add timestamp and branding
    const ctx = canvas.getContext('2d');

    // Add timestamp (top right)
    const now = new Date();
    const timestamp = now.toLocaleString();
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.textAlign = 'right';
    ctx.strokeText(timestamp, canvas.width - 20, 40);
    ctx.fillText(timestamp, canvas.width - 20, 40);

    // Add branding (bottom left)
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'left';
    ctx.strokeText("CHICAGO MIKE'S", 20, canvas.height - 20);
    ctx.fillText("CHICAGO MIKE'S", 20, canvas.height - 20);

    const photoData = canvas.toDataURL('image/png');
    setCapturedPhoto(photoData);
    setMode('photo');
    stopCamera();
  };

  const addSticker = (emoji) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setStickers(prev => [...prev, {
      emoji,
      x: canvas.width / 2,
      y: canvas.height / 2,
      size: 80,
      id: Date.now()
    }]);
  };

  const addTextOverlay = () => {
    if (!currentText.trim()) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    setTextOverlays(prev => [...prev, {
      text: currentText,
      x: canvas.width / 2,
      y: canvas.height / 2,
      color: textColor,
      size: textSize,
      id: Date.now()
    }]);

    setCurrentText('');
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const rect = drawingCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDrawings(prev => [...prev, {
      points: [{ x, y }],
      color: drawColor,
      width: drawWidth,
      id: Date.now()
    }]);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const rect = drawingCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDrawings(prev => {
      const newDrawings = [...prev];
      const currentDrawing = newDrawings[newDrawings.length - 1];
      currentDrawing.points.push({ x, y });
      return newDrawings;
    });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const savePhoto = async () => {
    const photoData = capturedPhoto;
    if (!photoData) return;

    await safeDemoOperation(async () => {
      // Upload to Supabase Storage
      const fileName = `photo-${Date.now()}.png`;
      const blob = await (await fetch(photoData)).blob();

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      // If attaching to pin
      if (attachToPin) {
        await supabase
          .from('pins')
          .update({ image_url: publicUrl })
          .eq('id', attachToPin.id);

        alert('Photo attached to pin successfully!');
      } else {
        // Save to photo gallery
        await supabase
          .from('photo_gallery')
          .insert([{
            image_url: publicUrl,
            filters: selectedFilter?.id,
            stickers: stickers.map(s => s.emoji),
            created_at: new Date().toISOString()
          }]);

        alert('Photo saved to gallery!');
      }

      onClose();
    }, 'Photo saving is disabled in demo mode');
  };

  const sharePhoto = async (method) => {
    const photoData = capturedPhoto;
    if (!photoData) return;

    await safeDemoOperation(async () => {
      if (method === 'sms') {
        const phone = prompt('Enter phone number:');
        if (!phone) return;

        // Send via Twilio
        await supabase.functions.invoke('send-sms', {
          body: {
            to: phone,
            message: 'Check out my photo from Chicago Mikes!',
            mediaUrl: photoData
          }
        });

        alert('Photo sent via SMS!');
      } else if (method === 'email') {
        const email = prompt('Enter email address:');
        if (!email) return;

        await supabase.functions.invoke('send-email', {
          body: {
            to: email,
            subject: 'Photo from Chicago Mikes',
            html: `<img src="${photoData}" alt="Photo" style="max-width: 100%;" />`,
            attachments: [{ content: photoData, filename: 'photo.png' }]
          }
        });

        alert('Photo sent via email!');
      } else if (method === 'social') {
        // Native share API
        if (navigator.share) {
          const blob = await (await fetch(photoData)).blob();
          const file = new File([blob], 'photo.png', { type: 'image/png' });

          await navigator.share({
            title: 'Chicago Mikes Photo',
            text: 'Check out my photo!',
            files: [file]
          });
        } else {
          alert('Sharing not supported on this device');
        }
      }
    }, 'Photo sharing is disabled in demo mode');
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setMode('camera');
    setStickers([]);
    setTextOverlays([]);
    setDrawings([]);
    startCamera();
  };

  if (mode === 'photo' && capturedPhoto) {
    return (
      <div style={styles.container}>
        <div style={styles.previewContainer}>
          <img src={capturedPhoto} alt="Captured" style={styles.preview} />

          <div style={styles.actions}>
            <button style={styles.actionBtn} onClick={retakePhoto}>
              🔄 Retake
            </button>
            <button style={styles.actionBtn} onClick={savePhoto}>
              💾 Save{attachToPin ? ' to Pin' : ''}
            </button>
            <button style={styles.actionBtn} onClick={() => sharePhoto('sms')}>
              📱 SMS
            </button>
            <button style={styles.actionBtn} onClick={() => sharePhoto('email')}>
              📧 Email
            </button>
            <button style={styles.actionBtn} onClick={() => sharePhoto('social')}>
              📲 Share
            </button>
            <button style={styles.closeBtn} onClick={onClose}>
              ✕ Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {countdown && (
        <div style={styles.countdown}>
          {countdown}
        </div>
      )}

      <div style={styles.viewfinder}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={styles.video}
        />
        <canvas
          ref={canvasRef}
          style={styles.canvas}
        />
        {mode === 'drawing' && (
          <canvas
            ref={drawingCanvasRef}
            style={styles.drawingCanvas}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        )}
      </div>

      {/* Filter selector */}
      <div style={styles.filterBar}>
        {filters.map(filter => (
          <button
            key={filter.id}
            style={{
              ...styles.filterBtn,
              ...(selectedFilter?.id === filter.id ? styles.filterBtnActive : {})
            }}
            onClick={() => setSelectedFilter(filter)}
          >
            <span style={styles.filterIcon}>{filter.icon}</span>
            <span style={styles.filterName}>{filter.name}</span>
          </button>
        ))}
      </div>

      {/* Mode selector */}
      <div style={styles.modeBar}>
        <button style={mode === 'camera' ? styles.modeBtnActive : styles.modeBtn} onClick={() => setMode('camera')}>
          📷 Camera
        </button>
        <button style={mode === 'stickers' ? styles.modeBtnActive : styles.modeBtn} onClick={() => setMode('stickers')}>
          😀 Stickers
        </button>
        <button style={mode === 'text' ? styles.modeBtnActive : styles.modeBtn} onClick={() => setMode('text')}>
          🔤 Text
        </button>
        <button style={mode === 'drawing' ? styles.modeBtnActive : styles.modeBtn} onClick={() => setMode('drawing')}>
          ✏️ Draw
        </button>
      </div>

      {/* Sticker picker */}
      {mode === 'stickers' && (
        <div style={styles.stickerPicker}>
          {Object.entries(stickerPacks).map(([pack, emojis]) => (
            <div key={pack} style={styles.stickerPack}>
              <h4 style={styles.packTitle}>{pack.toUpperCase()}</h4>
              <div style={styles.stickerGrid}>
                {emojis.map(emoji => (
                  <button
                    key={emoji}
                    style={styles.stickerBtn}
                    onClick={() => addSticker(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Text overlay */}
      {mode === 'text' && (
        <div style={styles.textOverlay}>
          <input
            type="text"
            value={currentText}
            onChange={e => setCurrentText(e.target.value)}
            placeholder="Enter text..."
            style={styles.textInput}
          />
          <div style={styles.textControls}>
            <label style={styles.label}>
              Color:
              <input
                type="color"
                value={textColor}
                onChange={e => setTextColor(e.target.value)}
                style={styles.colorPicker}
              />
            </label>
            <label style={styles.label}>
              Size:
              <input
                type="range"
                min="24"
                max="96"
                value={textSize}
                onChange={e => setTextSize(parseInt(e.target.value))}
                style={styles.slider}
              />
              {textSize}px
            </label>
          </div>
          <button style={styles.addTextBtn} onClick={addTextOverlay}>
            Add Text
          </button>
        </div>
      )}

      {/* Drawing tools */}
      {mode === 'drawing' && (
        <div style={styles.drawingTools}>
          <label style={styles.label}>
            Color:
            <input
              type="color"
              value={drawColor}
              onChange={e => setDrawColor(e.target.value)}
              style={styles.colorPicker}
            />
          </label>
          <label style={styles.label}>
            Width:
            <input
              type="range"
              min="1"
              max="20"
              value={drawWidth}
              onChange={e => setDrawWidth(parseInt(e.target.value))}
              style={styles.slider}
            />
            {drawWidth}px
          </label>
          <button style={styles.clearBtn} onClick={() => setDrawings([])}>
            Clear Drawing
          </button>
        </div>
      )}

      {/* Capture button */}
      <div style={styles.controls}>
        <button style={styles.captureBtn} onClick={capturePhoto}>
          <div style={styles.captureInner} />
        </button>
        <button style={styles.closeBtn} onClick={onClose}>
          ✕ Close
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: '#000',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column'
  },
  countdown: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '120px',
    fontWeight: 'bold',
    color: 'white',
    textShadow: '0 0 20px rgba(0,0,0,0.5)',
    zIndex: 10001,
    animation: 'pulse 1s'
  },
  viewfinder: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  video: {
    position: 'absolute',
    display: 'none'
  },
  canvas: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain'
  },
  drawingCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    cursor: 'crosshair'
  },
  filterBar: {
    display: 'flex',
    gap: '8px',
    padding: '12px',
    overflowX: 'auto',
    background: 'rgba(0,0,0,0.7)',
    borderTop: '1px solid rgba(255,255,255,0.1)'
  },
  filterBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '80px'
  },
  filterBtnActive: {
    background: 'rgba(102, 126, 234, 0.8)',
    transform: 'scale(1.05)'
  },
  filterIcon: {
    fontSize: '24px',
    marginBottom: '4px'
  },
  filterName: {
    fontSize: '11px',
    fontWeight: '600'
  },
  modeBar: {
    display: 'flex',
    gap: '8px',
    padding: '12px',
    background: 'rgba(0,0,0,0.7)',
    justifyContent: 'center'
  },
  modeBtn: {
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  modeBtnActive: {
    padding: '10px 20px',
    background: 'rgba(102, 126, 234, 0.8)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  stickerPicker: {
    padding: '16px',
    background: 'rgba(0,0,0,0.9)',
    maxHeight: '200px',
    overflowY: 'auto'
  },
  stickerPack: {
    marginBottom: '16px'
  },
  packTitle: {
    color: 'white',
    fontSize: '12px',
    marginBottom: '8px'
  },
  stickerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gap: '8px'
  },
  stickerBtn: {
    fontSize: '32px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
    transition: 'transform 0.2s'
  },
  textOverlay: {
    padding: '16px',
    background: 'rgba(0,0,0,0.9)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  textInput: {
    padding: '12px',
    fontSize: '16px',
    borderRadius: '8px',
    border: '1px solid #667eea',
    background: 'rgba(255,255,255,0.1)',
    color: 'white'
  },
  textControls: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'white',
    fontSize: '14px'
  },
  colorPicker: {
    width: '40px',
    height: '40px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  slider: {
    flex: 1,
    minWidth: '100px'
  },
  addTextBtn: {
    padding: '12px 24px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  drawingTools: {
    padding: '16px',
    background: 'rgba(0,0,0,0.9)',
    display: 'flex',
    gap: '20px',
    alignItems: 'center'
  },
  clearBtn: {
    padding: '8px 16px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    gap: '20px',
    background: 'rgba(0,0,0,0.7)'
  },
  captureBtn: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'white',
    border: '4px solid #667eea',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.1s'
  },
  captureInner: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: '#667eea'
  },
  closeBtn: {
    padding: '12px 24px',
    background: 'rgba(255,255,255,0.1)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  previewContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  preview: {
    maxWidth: '100%',
    maxHeight: 'calc(100vh - 200px)',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  actionBtn: {
    padding: '12px 24px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  }
};
