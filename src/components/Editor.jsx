// src/components/Editor.jsx
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid'; // s Requires npm install uuid@9.0.1
import { useBackgroundImages } from '../hooks/useBackgroundImages';

export default function Editor({
  mapMode,
  slug,
  form,
  setForm,
  hotdogSuggestions = [],
  onCancel,
  onOpenShare,
  photoBackgroundsEnabled = true,
  loyaltyEnabled = true,
}) {
  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const digitsOnly = String(form.loyaltyPhone || '').replace(/\D+/g, '');
  const phoneLooksValid = digitsOnly.length >= 10 && digitsOnly.length <= 15;

  const [photoPreview, setPhotoPreview] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Background images
  const { backgrounds } = useBackgroundImages();
  const [selectedBg, setSelectedBg] = useState(null);

  // Start camera on user interaction
  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera not supported in this browser');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch((e) => setCameraError(`Failed to play video: ${e.message}`));
          setIsCameraReady(true);
        };
        streamRef.current = stream;
      } else {
        setCameraError('Video element not available');
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (e) {
      setCameraError('Camera access failed. Please allow permissions or try again.');
      console.error('Camera error:', e);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
    setPhotoPreview(null);
  };

  // Capture photo and upload to Supabase
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
        // Load background image
        const bgImage = new Image();
        bgImage.crossOrigin = 'anonymous';

        await new Promise((resolve, reject) => {
          bgImage.onload = resolve;
          bgImage.onerror = reject;
          bgImage.src = selectedBg.url;
        });

        // Draw background first (scaled to canvas size)
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

        // Draw video on top with some transparency or use CSS blend mode
        ctx.globalAlpha = 0.7; // Make video slightly transparent
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
      } else {
        // No background - just draw the video
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      const dataUrl = canvas.toDataURL('image/jpeg');
      setPhotoPreview(dataUrl);

      // Upload to Supabase
      const fileName = `pin-${slug || (typeof uuidv4 === 'function' ? uuidv4() : Date.now())}.jpg`;
      const blob = await (await fetch(dataUrl)).blob();
      const { error } = await supabase.storage
        .from('pin-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });
      if (error) throw error;
      const publicUrl = supabase.storage.from('pin-photos').getPublicUrl(fileName).data.publicUrl;
      update({ photoUrl: publicUrl });
      stopCamera();
    } catch (e) {
      setCameraError(`Failed to upload photo: ${e.message}`);
      console.error('Photo upload error:', e);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const commonSlugBadge = (
    <div className="slug-badge" title="This is the permanent ID for your pin" style={{
      background: '#16181d',
      border: '1px solid #2a2f37',
      borderRadius: 999,
      padding: '8px 12px',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      color: 'var(--muted)',
      whiteSpace: 'nowrap',
      textAlign: 'center',
    }}>
      {slug ? `🆔 ${slug}` : '🆔 generating…'}
    </div>
  );

  const ActionButtons = (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
      <button onClick={onOpenShare}>Add My Pin</button>
      <button className="cancel" onClick={onCancel}>Cancel</button>
    </div>
  );

  const IdAndActionsRow = (
    <div style={{
      gridColumn: '1 / -1',
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      alignItems: 'center',
      gap: 10,
    }}>
      <button onClick={startCamera} disabled={isCameraReady || !!photoPreview} aria-label="Start camera">📸 Start Camera</button>
      {commonSlugBadge}
      {ActionButtons}
    </div>
  );

  const InlineFieldsChicago = (
    <div style={{
      gridColumn: '1 / -1',
      display: 'grid',
      gap: 10,
      gridTemplateColumns: 'minmax(180px,1fr) minmax(180px,1fr) minmax(200px,1fr) minmax(260px,2fr)',
    }}>
      <input placeholder="Your name (optional)" value={form.name || ''} onChange={(e) => update({ name: e.target.value })} aria-label="Your name" />
      <input placeholder="Neighborhood (optional)" value={form.neighborhood || ''} onChange={(e) => update({ neighborhood: e.target.value })} aria-label="Neighborhood" />
      <div style={{ display: 'contents' }}>
        <input list="hotdog-stand-suggestions" placeholder="Favorite hot dog stand (search or create)" value={form.hotdog || ''} onChange={(e) => update({ hotdog: e.target.value })} aria-label="Favorite hot dog stand" />
        <datalist id="hotdog-stand-suggestions">
          {hotdogSuggestions.map((s) => <option key={s} value={s} />)}
        </datalist>
      </div>
      <input placeholder="Leave a note for other guests (optional, 280 chars)" maxLength={280} value={form.note || ''} onChange={(e) => update({ note: e.target.value })} aria-label="Note" />
    </div>
  );

  const InlineFieldsGlobal = (
    <div style={{
      gridColumn: '1 / -1',
      display: 'grid',
      gap: 10,
      gridTemplateColumns: 'minmax(180px,1fr) minmax(200px,1fr) minmax(260px,2fr)',
    }}>
      <input placeholder="Your name (optional)" value={form.name || ''} onChange={(e) => update({ name: e.target.value })} aria-label="Your name" />
      <div style={{ display: 'contents' }}>
        <input list="hotdog-stand-suggestions" placeholder="Favorite hot dog stand (search or create)" value={form.hotdog || ''} onChange={(e) => update({ hotdog: e.target.value })} aria-label="Favorite hot dog stand" />
        <datalist id="hotdog-stand-suggestions">
          {hotdogSuggestions.map((s) => <option key={s} value={s} />)}
        </datalist>
      </div>
      <input placeholder="Leave a note for other guests (optional, 280 chars)" maxLength={280} value={form.note || ''} onChange={(e) => update({ note: e.target.value })} aria-label="Note" />
    </div>
  );

  const PhotoSection = (
    <div style={{
      gridColumn: '1 / -1',
      border: '1px solid #2a2f37',
      borderRadius: 12,
      padding: 12,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02))',
      display: 'grid',
      gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>📸</span>
        <strong>Add a photo (optional)</strong>
      </div>
      <div style={{ color: '#a7b0b8', fontSize: 13 }}>
        Snap a photo of your hot dog spot or upload one.
      </div>
      {cameraError && <div style={{ color: '#ef4444' }} role="alert">{cameraError}</div>}

      {/* Background Carousel */}
      {photoBackgroundsEnabled && isCameraReady && !photoPreview && backgrounds.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 13, color: '#a7b0b8', marginBottom: 8 }}>
            Select a background (optional):
          </div>
          <div style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            padding: 8,
            background: '#0f1115',
            borderRadius: 8,
          }}>
            <button
              onClick={() => setSelectedBg(null)}
              style={{
                minWidth: 80,
                height: 60,
                border: selectedBg === null ? '2px solid #0ea5e9' : '1px solid #2a2f37',
                borderRadius: 6,
                background: '#1a1d23',
                color: '#fff',
                fontSize: 11,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
                  border: selectedBg?.id === bg.id ? '2px solid #0ea5e9' : '1px solid #2a2f37',
                  borderRadius: 6,
                  padding: 0,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  background: 'transparent',
                }}
              >
                <img
                  src={bg.url}
                  alt={bg.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </button>
            ))}
          </div>
          {selectedBg && (
            <div style={{ fontSize: 11, color: '#0ea5e9', marginTop: 4 }}>
              Background: {selectedBg.name}
            </div>
          )}
        </div>
      )}

      {isCameraReady && !photoPreview && (
        <video ref={videoRef} style={{ maxWidth: '300px', maxHeight: '200px' }} aria-hidden="true" />
      )}
      {photoPreview && <img src={photoPreview} alt="Photo preview" style={{ maxWidth: '300px', maxHeight: '200px' }} />}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {isCameraReady && !photoPreview && (
        <button onClick={capturePhoto} aria-label="Capture photo">Take Photo</button>
      )}
      {photoPreview && (
        <button onClick={() => { setPhotoPreview(null); startCamera(); }} aria-label="Retake photo">Retake Photo</button>
      )}
    </div>
  );

  const LoyaltySection = loyaltyEnabled ? (
    <div style={{
      gridColumn: '1 / -1',
      border: '1px solid #2a2f37',
      borderRadius: 12,
      padding: 12,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02))',
      display: 'grid',
      gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>⭐</span>
        <strong>Link your loyalty phone (optional)</strong>
      </div>
      <div style={{
        display: 'grid',
        gap: 8,
        gridTemplateColumns: 'minmax(220px,1fr) auto',
        alignItems: 'center',
      }}>
        <input type="tel" inputMode="tel" placeholder="(312) 555-1234" value={form.loyaltyPhone || ''} onChange={(e) => update({ loyaltyPhone: e.target.value })} aria-label="Loyalty phone number" />
        <span style={{ fontSize: 13, color: phoneLooksValid ? '#9AE6B4' : '#a7b0b8' }}>
          {phoneLooksValid ? '⭐ You\'ll earn a star for linking' : 'Enter at least 10 digits'}
        </span>
      </div>
    </div>
  ) : null;

  if (mapMode === 'chicago') {
    return (
      <div className="form" style={{
        display: 'grid',
        gap: 10,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))',
        overflow: 'visible',
        paddingTop: 2,
      }}>
        {IdAndActionsRow}
        <div style={{
          gridColumn: '1 / -1',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          alignItems: 'center',
          gap: 10,
        }}>
          {['cubs', 'whitesox', 'other'].map((t) => (
            <button key={t} onClick={() => update({ team: t })} style={{ background: form.team === t ? '#0ea5e9' : 'transparent' }}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        {InlineFieldsChicago}
        {LoyaltySection}
      </div>
    );
  }

  return (
    <div className="form" style={{
      display: 'grid',
      gap: 10,
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))',
      overflow: 'visible',
      paddingTop: 2,
    }}>
      {IdAndActionsRow}
      {InlineFieldsGlobal}
      {LoyaltySection}
    </div>
  );
}