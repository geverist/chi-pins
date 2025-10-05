// src/components/PhotoCaptureModal.jsx
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { useBackgroundImages } from '../hooks/useBackgroundImages';

export default function PhotoCaptureModal({ open, onClose, onPhotoTaken, slug }) {
  const [photoPreview, setPhotoPreview] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const { backgrounds } = useBackgroundImages();
  const [selectedBg, setSelectedBg] = useState(null);

  // Start camera when modal opens
  useEffect(() => {
    if (!open) {
      stopCamera();
      setPhotoPreview(null);
      return;
    }

    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera not supported in this browser');
        return;
      }
      try {
        console.log('Requesting camera access...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        console.log('Camera stream obtained:', stream);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;

          // Set a timeout fallback in case metadata never loads
          const timeoutId = setTimeout(() => {
            console.log('Metadata timeout - forcing play');
            if (videoRef.current && !isCameraReady) {
              videoRef.current.play()
                .then(() => {
                  console.log('Video playing (via timeout)');
                  setIsCameraReady(true);
                })
                .catch((e) => console.error('Timeout play error:', e));
            }
          }, 2000);

          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded');
            clearTimeout(timeoutId);
            videoRef.current.play()
              .then(() => {
                console.log('Video playing');
                setIsCameraReady(true);
              })
              .catch((e) => {
                console.error('Play error:', e);
                setCameraError(`Failed to play video: ${e.message}`);
              });
          };

          // Also try to play immediately
          setTimeout(() => {
            if (videoRef.current && !isCameraReady) {
              console.log('Attempting immediate play');
              videoRef.current.play()
                .then(() => {
                  console.log('Immediate play succeeded');
                  setIsCameraReady(true);
                })
                .catch((e) => console.log('Immediate play failed (expected):', e.message));
            }
          }, 100);

        } else {
          console.warn('Video ref not ready, stopping stream');
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (e) {
        console.error('Camera error:', e);
        setCameraError(`Camera access failed: ${e.name} - ${e.message}. Please check browser permissions.`);
      }
    };

    startCamera();

    return () => stopCamera();
  }, [open]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) {
      setCameraError('Camera not ready. Please try again.');
      return;
    }
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // If a background is selected, composite it
      if (selectedBg) {
        const bgImage = new Image();
        bgImage.crossOrigin = 'anonymous';

        await new Promise((resolve, reject) => {
          bgImage.onload = resolve;
          bgImage.onerror = reject;
          bgImage.src = selectedBg.url;
        });

        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 0.7;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setPhotoPreview(dataUrl);
      stopCamera();
    } catch (e) {
      setCameraError(`Failed to capture photo: ${e.message}`);
      console.error('Photo capture error:', e);
    }
  };

  const uploadAndSubmit = async () => {
    if (!photoPreview) return;

    setIsUploading(true);
    try {
      const fileName = `pin-${slug || uuidv4()}.jpg`;
      const blob = await (await fetch(photoPreview)).blob();
      const { error } = await supabase.storage
        .from('pin-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (error) throw error;

      const publicUrl = supabase.storage.from('pin-photos').getPublicUrl(fileName).data.publicUrl;
      onPhotoTaken(publicUrl);
      onClose();
    } catch (e) {
      setCameraError(`Failed to upload photo: ${e.message}`);
      console.error('Photo upload error:', e);
    } finally {
      setIsUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#11141a',
          borderRadius: 16,
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          border: '1px solid #2a2f37',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #2a2f37',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h3 style={{ margin: 0, color: '#f3f5f7', fontSize: 20 }}>📸 Capture Photo</h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #2a2f37',
              borderRadius: 8,
              color: '#f3f5f7',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20 }}>
          {cameraError && (
            <div style={{
              padding: 12,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              color: '#f87171',
              marginBottom: 16,
            }}>
              {cameraError}
            </div>
          )}

          {/* Loading state */}
          {!isCameraReady && !photoPreview && !cameraError && (
            <div style={{
              padding: 40,
              textAlign: 'center',
              color: '#9ca3af',
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📸</div>
              <div>Starting camera...</div>
              <div style={{ fontSize: 12, marginTop: 8 }}>Please allow camera access if prompted</div>
            </div>
          )}

          {/* Background selector - only show if backgrounds are available */}
          {isCameraReady && !photoPreview && backgrounds.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#f3f5f7' }}>
                Select Background (optional)
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
                <button
                  onClick={() => setSelectedBg(null)}
                  style={{
                    minWidth: 80,
                    height: 60,
                    background: !selectedBg ? '#0ea5e9' : '#1a1d24',
                    border: '2px solid ' + (!selectedBg ? '#0ea5e9' : '#2a2f37'),
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#f3f5f7',
                    cursor: 'pointer',
                  }}
                >
                  None
                </button>
                {backgrounds.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setSelectedBg(bg)}
                    style={{
                      minWidth: 80,
                      height: 60,
                      padding: 0,
                      background: `url(${bg.thumbnail_url || bg.url}) center/cover`,
                      border: '2px solid ' + (selectedBg?.id === bg.id ? '#0ea5e9' : '#2a2f37'),
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                    title={bg.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Video preview */}
          {isCameraReady && !photoPreview && (
            <div>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  borderRadius: 12,
                  background: '#000',
                  maxHeight: '60vh',
                }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          )}

          {/* Photo preview */}
          {photoPreview && (
            <div>
              <img
                src={photoPreview}
                alt="Captured photo"
                style={{
                  width: '100%',
                  borderRadius: 12,
                  maxHeight: '60vh',
                  objectFit: 'contain',
                }}
              />
            </div>
          )}

          {/* Actions */}
          <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center' }}>
            {isCameraReady && !photoPreview && (
              <>
                <button
                  onClick={capturePhoto}
                  style={{
                    background: '#0ea5e9',
                    border: 'none',
                    borderRadius: 10,
                    color: '#fff',
                    padding: '14px 32px',
                    fontSize: 18,
                    fontWeight: 600,
                    cursor: 'pointer',
                    flex: 1,
                    maxWidth: 300,
                  }}
                >
                  📸 Take Picture
                </button>
                <button
                  onClick={onClose}
                  style={{
                    background: 'transparent',
                    border: '1px solid #2a2f37',
                    borderRadius: 10,
                    color: '#f3f5f7',
                    padding: '14px 24px',
                    fontSize: 16,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </>
            )}

            {photoPreview && (
              <>
                <button
                  onClick={uploadAndSubmit}
                  disabled={isUploading}
                  style={{
                    background: '#22c55e',
                    border: 'none',
                    borderRadius: 10,
                    color: '#fff',
                    padding: '14px 32px',
                    fontSize: 18,
                    fontWeight: 600,
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    opacity: isUploading ? 0.6 : 1,
                    flex: 1,
                    maxWidth: 300,
                  }}
                >
                  {isUploading ? 'Uploading...' : '✓ Use This Photo'}
                </button>
                <button
                  onClick={() => {
                    setPhotoPreview(null);
                    setCameraError(null);
                    // Restart camera
                    const startCamera = async () => {
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({
                          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
                        });
                        if (videoRef.current) {
                          videoRef.current.srcObject = stream;
                          videoRef.current.play();
                          streamRef.current = stream;
                          setIsCameraReady(true);
                        }
                      } catch (e) {
                        setCameraError('Failed to restart camera');
                      }
                    };
                    startCamera();
                  }}
                  disabled={isUploading}
                  style={{
                    background: 'transparent',
                    border: '1px solid #2a2f37',
                    borderRadius: 10,
                    color: '#f3f5f7',
                    padding: '14px 24px',
                    fontSize: 16,
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    opacity: isUploading ? 0.6 : 1,
                  }}
                >
                  🔄 Retake
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
