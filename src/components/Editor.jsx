// src/components/Editor.jsx (updated full component)
import { useState, useRef, useEffect } from 'react'; // Add useRef, useEffect if not present
import { supabase } from '../lib/supabase'; // Assume imported or add

export default function Editor({
  mapMode,
  slug,
  form,
  setForm,
  hotdogSuggestions = [],
  onCancel,
  onOpenShare,
}) {
  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const digitsOnly = String(form.loyaltyPhone || '').replace(/\D+/g, '');
  const phoneLooksValid = digitsOnly.length >= 10 && digitsOnly.length <= 15;

  // New: Camera state
  const [photoPreview, setPhotoPreview] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);

  const capturePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      const track = stream.getVideoTracks()[0];
      const imageCapture = new ImageCapture(track);
      const blob = await imageCapture.takePhoto();
      const previewUrl = URL.createObjectURL(blob);
      setPhotoPreview(previewUrl);

      // Upload to Supabase
      const fileName = `pin-${slug || Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('pin-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });
      if (error) throw error;
      const publicUrl = supabase.storage.from('pin-photos').getPublicUrl(fileName).data.publicUrl;
      update({ photoUrl: publicUrl }); // Save URL to form for pin insert
      track.stop();
    } catch (e) {
      setCameraError('Camera access failed. Allow permissions or upload a file.');
      console.error('Camera error:', e);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
      const fileName = `pin-${slug || Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('pin-photos')
        .upload(fileName, file, { contentType: file.type });
      if (!error) {
        const publicUrl = supabase.storage.from('pin-photos').getPublicUrl(fileName).data.publicUrl;
        update({ photoUrl: publicUrl });
      }
    }
  };

  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
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
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      gap: 10,
    }}>
      <div style={{ visibility: 'hidden' }} /> {/* Invisible placeholder to balance the center */}
      {commonSlugBadge}
      {ActionButtons}
    </div>
  );

  // Single row for name / neighborhood / hotdog / notes (with notes given more width)
  const InlineFieldsChicago = (
    <div style={{
      gridColumn: '1 / -1',
      display: 'grid',
      gap: 10,
      // Make the last track (notes) wider to fill the row
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

  // Global: no neighborhood, so just 3 columns with the last (notes) wider
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

  // New: Photo section (add after inline fields in both modes)
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
      <video ref={videoRef} style={{ display: photoPreview ? 'none' : 'block', maxWidth: '300px', maxHeight: '200px' }} aria-hidden="true" />
      {photoPreview && <img src={photoPreview} alt="Photo preview" style={{ maxWidth: '300px', maxHeight: '200px' }} />}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={capturePhoto} aria-label="Take photo with camera">Take Photo</button>
        <input type="file" accept="image/*" onChange={handleFileUpload} aria-label="Upload photo from device" />
      </div>
    </div>
  );

  if (mapMode === 'chicago') {
    return (
      <div className="form" style={{
        display: 'grid',
        gap: 10,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))',
        maxHeight: '48vh',
        overflow: 'auto',
        paddingTop: 2,
      }}>
        {IdAndActionsRow}
        {/* Header row: Teams | ID badge | Actions */}
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
        {PhotoSection} /* New: Add here */
        /* ⭐ Loyalty phone (optional) */
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
          <div style={{ color: '#a7b0b8', fontSize: 13 }}>
            Add the phone number tied to your loyalty account to earn a star with this pin.
          </div>
          <div style={{
            display: 'grid',
            gap: 8,
            gridTemplateColumns: 'minmax(220px, 1fr) auto',
            alignItems: 'center',
          }}>
            <input type="tel" inputMode="tel" placeholder="(312) 555-1234" value={form.loyaltyPhone || ''} onChange={(e) => update({ loyaltyPhone: e.target.value })} aria-label="Loyalty phone number" />
            <span style={{ fontSize: 13, color: phoneLooksValid ? '#9AE6B4' : '#a7b0b8' }}>
              {phoneLooksValid ? '⭐ You’ll earn a star for linking' : 'Enter at least 10 digits'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // GLOBAL (no team, no neighborhood)
  return (
    <div className="form" style={{
      display: 'grid',
      gap: 10,
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))',
      maxHeight: '48vh',
      overflow: 'auto',
      paddingTop: 2,
    }}>
      {IdAndActionsRow}
      {InlineFieldsGlobal}
      {PhotoSection} /* New: Add here */
      /* ⭐ Loyalty phone (optional) */
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
        <div style={{ color: '#a7b0b8', fontSize: 13 }}>
          Add the phone number tied to your loyalty account to earn a star with this pin.
        </div>
        <div style={{
          display: 'grid',
          gap: 8,
          gridTemplateColumns: 'minmax(220px, 1fr) auto',
          alignItems: 'center',
        }}>
          <input type="tel" inputMode="tel" placeholder="(312) 555-1234" value={form.loyaltyPhone || ''} onChange={(e) => update({ loyaltyPhone: e.target.value })} aria-label="Loyalty phone number" />
          <span style={{ fontSize: 13, color: phoneLooksValid ? '#9AE6B4' : '#a7b0b8' }}>
            {phoneLooksValid ? '⭐ You’ll earn a star for linking' : 'Enter at least 10 digits'}
          </span>
        </div>
      </div>
    </div>
  );
}