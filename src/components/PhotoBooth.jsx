// src/components/PhotoBooth.jsx
import { useState, useRef, useEffect } from 'react';

export default function PhotoBooth({ onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const livePreviewCanvasRef = useRef(null);
  const previewCanvasRefs = useRef({});
  const [stream, setStream] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [error, setError] = useState(null);
  const [filterPreviews, setFilterPreviews] = useState({});

  const filters = [
    { id: 'hotdog', name: 'Hot Dog Hat', emoji: '🌭', overlay: 'hotdog' },
    { id: 'chicago', name: 'Chicago Flag', emoji: '🏙️', overlay: 'flag' },
    { id: 'cubs', name: 'Cubs Fan', emoji: '⚾', overlay: 'cubs' },
    { id: 'sox', name: 'Sox Fan', emoji: '⚾', overlay: 'sox' },
    { id: 'skyline', name: 'Skyline', emoji: '🌆', overlay: 'skyline' },
    { id: 'deepdish', name: 'Deep Dish', emoji: '🍕', overlay: 'pizza' },
  ];

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Generate live preview on main canvas with selected filter
  useEffect(() => {
    if (!videoRef.current || !livePreviewCanvasRef.current || !stream || photo) return;

    const generateLivePreview = () => {
      const video = videoRef.current;
      const canvas = livePreviewCanvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Apply selected filter overlay if any
      if (selectedFilter) {
        applyFilter(ctx, canvas.width, canvas.height, selectedFilter);
      }
    };

    // Update live preview continuously (30 FPS)
    const interval = setInterval(generateLivePreview, 33);

    return () => {
      clearInterval(interval);
    };
  }, [stream, selectedFilter, photo]);

  // Generate filter previews from video feed
  useEffect(() => {
    if (!videoRef.current || !stream) return;

    const generatePreviews = () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      filters.forEach(filter => {
        const canvas = previewCanvasRefs.current[filter.id];
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 112; // 16:9 aspect ratio

        // Draw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Apply filter overlay
        applyFilter(ctx, canvas.width, canvas.height, filter);

        // Update preview state
        setFilterPreviews(prev => ({
          ...prev,
          [filter.id]: canvas.toDataURL('image/jpeg', 0.7)
        }));
      });
    };

    // Update previews every 100ms
    const interval = setInterval(generatePreviews, 100);

    // Initial generation after a short delay to ensure video is ready
    const timeout = setTimeout(generatePreviews, 500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Ensure video plays on iOS/Safari
        videoRef.current.play().catch(err => {
          console.warn('Video autoplay prevented:', err);
        });
      }
      setError(null);
      console.log('Camera started successfully');
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
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
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Apply filter overlay
    if (selectedFilter) {
      applyFilter(context, canvas.width, canvas.height, selectedFilter);
    }

    // Add Chicago Mike's branding
    context.font = 'bold 48px Arial';
    context.fillStyle = 'white';
    context.strokeStyle = 'black';
    context.lineWidth = 3;
    const text = "CHICAGO MIKE'S";
    context.strokeText(text, 20, canvas.height - 20);
    context.fillText(text, 20, canvas.height - 20);

    const photoData = canvas.toDataURL('image/png');
    setPhoto(photoData);
  };

  const applyFilter = (context, width, height, filter) => {
    const centerX = width / 2;
    const topY = height * 0.15;

    switch (filter.overlay) {
      case 'hotdog':
        // Hot dog hat on top of head
        context.font = '120px Arial';
        context.textAlign = 'center';
        context.fillText('🌭', centerX, topY);
        break;

      case 'flag':
        // Chicago flag overlay
        context.globalAlpha = 0.3;
        context.fillStyle = '#B3DDF2';
        context.fillRect(0, 0, width, height / 3);
        context.fillStyle = 'white';
        context.fillRect(0, height / 3, width, height / 3);
        context.fillStyle = '#B3DDF2';
        context.fillRect(0, 2 * height / 3, width, height / 3);

        // Red stars
        context.fillStyle = '#FF0000';
        context.globalAlpha = 0.5;
        for (let i = 0; i < 4; i++) {
          const starY = height / 2;
          const starX = width * (0.2 + i * 0.2);
          context.font = '80px Arial';
          context.textAlign = 'center';
          context.fillText('⭐', starX, starY);
        }
        context.globalAlpha = 1.0;
        break;

      case 'cubs':
        context.font = 'bold 60px Arial';
        context.fillStyle = '#0E3386';
        context.strokeStyle = 'white';
        context.lineWidth = 3;
        context.textAlign = 'center';
        context.strokeText('GO CUBS GO!', centerX, height * 0.9);
        context.fillText('GO CUBS GO!', centerX, height * 0.9);
        break;

      case 'sox':
        context.font = 'bold 60px Arial';
        context.fillStyle = 'black';
        context.strokeStyle = 'white';
        context.lineWidth = 3;
        context.textAlign = 'center';
        context.strokeText('SOX WIN!', centerX, height * 0.9);
        context.fillText('SOX WIN!', centerX, height * 0.9);
        break;

      case 'skyline':
        // Simple skyline silhouette at bottom
        context.fillStyle = 'rgba(0,0,0,0.6)';
        context.fillRect(0, height * 0.7, width, height * 0.3);
        context.font = '100px Arial';
        context.textAlign = 'center';
        context.fillText('🏙️', centerX, height * 0.85);
        break;

      case 'pizza':
        context.font = '100px Arial';
        context.textAlign = 'center';
        context.fillText('🍕', width * 0.15, height * 0.15);
        context.fillText('🍕', width * 0.85, height * 0.15);
        break;

      default:
        break;
    }
    context.textAlign = 'left';
  };

  const retakePhoto = () => {
    setPhoto(null);
    setCountdown(null);
  };

  const downloadPhoto = () => {
    const link = document.createElement('a');
    link.download = `chicago-mikes-${Date.now()}.png`;
    link.href = photo;
    link.click();
  };

  const sharePhoto = async () => {
    try {
      const blob = await (await fetch(photo)).blob();
      const file = new File([blob], `chicago-mikes-${Date.now()}.png`, { type: 'image/png' });

      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: "Chicago Mike's Photo Booth",
          text: 'Check out my photo from Chicago Mike\'s! 🌭'
        });
      } else {
        downloadPhoto();
      }
    } catch (err) {
      console.error('Share failed:', err);
      downloadPhoto();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 20px',
        }}
      >
        <h2 style={{ color: '#f4f6f8', fontSize: 28, margin: 0 }}>
          📸 Photo Booth
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(239,68,68,0.2)',
            border: '1px solid rgba(239,68,68,0.5)',
            borderRadius: 12,
            padding: '12px 24px',
            color: '#fff',
            fontSize: 18,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ✕ Close
        </button>
      </div>

      {/* Main Content */}
      <div
        style={{
          marginTop: 80,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          maxWidth: 1200,
          width: '100%',
        }}
      >
        {error && (
          <div
            style={{
              background: 'rgba(239,68,68,0.2)',
              border: '1px solid rgba(239,68,68,0.5)',
              borderRadius: 12,
              padding: 20,
              color: '#fff',
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        {/* Camera/Photo Display */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 800,
            aspectRatio: '16/9',
            background: '#000',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {!photo ? (
            <>
              {/* Hidden video element for camera feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  display: selectedFilter ? 'none' : 'block',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              {/* Live preview canvas with filter applied */}
              {selectedFilter && (
                <canvas
                  ref={livePreviewCanvasRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              )}
              {countdown && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.5)',
                    fontSize: 120,
                    fontWeight: 'bold',
                    color: '#fff',
                    animation: 'pulse 0.5s ease-in-out',
                    zIndex: 10,
                  }}
                >
                  {countdown}
                </div>
              )}
            </>
          ) : (
            <img
              src={photo}
              alt="Captured photo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Filter Selection */}
        {!photo && (
          <div style={{ width: '100%', maxWidth: 800 }}>
            <h3 style={{ color: '#f4f6f8', marginBottom: 12, fontSize: 18 }}>
              Choose a Filter:
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
              }}
            >
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter)}
                  style={{
                    padding: 12,
                    background:
                      selectedFilter?.id === filter.id
                        ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                        : 'rgba(255,255,255,0.1)',
                    border:
                      selectedFilter?.id === filter.id
                        ? '3px solid #60a5fa'
                        : '2px solid rgba(255,255,255,0.2)',
                    borderRadius: 12,
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Preview Image */}
                  <div style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: '#000',
                    position: 'relative',
                  }}>
                    {filterPreviews[filter.id] ? (
                      <img
                        src={filterPreviews[filter.id]}
                        alt={filter.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 48,
                      }}>
                        {filter.emoji}
                      </div>
                    )}
                    {/* Hidden canvas for preview generation */}
                    <canvas
                      ref={el => previewCanvasRefs.current[filter.id] = el}
                      style={{ display: 'none' }}
                    />
                  </div>

                  {/* Filter Name */}
                  <span style={{ fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
                    {filter.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          {!photo ? (
            <button
              onClick={capturePhoto}
              disabled={countdown !== null || !stream}
              style={{
                padding: '16px 48px',
                background: (countdown || !stream)
                  ? 'rgba(100,100,100,0.5)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: 12,
                color: '#fff',
                fontSize: 20,
                fontWeight: 700,
                cursor: (countdown || !stream) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
              title={!stream ? 'Waiting for camera...' : 'Take a photo'}
            >
              📸 {!stream ? 'Starting Camera...' : 'Take Photo'}
            </button>
          ) : (
            <>
              <button
                onClick={retakePhoto}
                style={{
                  padding: '16px 32px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 12,
                  color: '#fff',
                  fontSize: 18,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🔄 Retake
              </button>
              <button
                onClick={downloadPhoto}
                style={{
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  border: 'none',
                  borderRadius: 12,
                  color: '#fff',
                  fontSize: 18,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                💾 Download
              </button>
              <button
                onClick={sharePhoto}
                style={{
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  border: 'none',
                  borderRadius: 12,
                  color: '#fff',
                  fontSize: 18,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                📤 Share
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
