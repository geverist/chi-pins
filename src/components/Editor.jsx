// src/components/Editor.jsx
import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';
import PhotoCaptureModal from './PhotoCaptureModal';
import VoiceInput from './VoiceInput';
import { AVAILABLE_PIN_STYLES } from '../config/pinStyles';
import { usePinStyleCounts } from '../hooks/usePinStyleCounts';

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

  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  const { counts } = usePinStyleCounts();

  // Calculate total characters for Vestaboard
  // Vestaboard is 22 chars wide x 6 rows = 132 chars total
  // Layout: Line 1: name (or slug), Line 2+: note, optional: neighborhood, team (if room)
  const VESTABOARD_WIDTH = 22;
  const VESTABOARD_ROWS = 6;
  const VESTABOARD_LIMIT = VESTABOARD_WIDTH * VESTABOARD_ROWS; // 132

  const nameOrSlug = (form.name || slug || '').substring(0, VESTABOARD_WIDTH);
  const nameLength = nameOrSlug.length;
  const noteLength = (form.note || '').length;
  const neighborhoodLength = (form.neighborhood || '').length;
  const teamLength = form.team ? form.team.length : 0;

  // Calculate how many rows each part needs (wraps at 22 chars per line)
  const nameRows = nameLength > 0 ? 1 : 0;
  const noteRows = noteLength > 0 ? Math.ceil(noteLength / VESTABOARD_WIDTH) : 0;
  const neighborhoodRows = neighborhoodLength > 0 ? Math.ceil(neighborhoodLength / VESTABOARD_WIDTH) : 0;
  const teamRows = teamLength > 0 ? 1 : 0;

  // Calculate total rows needed
  let usedRows = nameRows + noteRows;
  const neighborhoodFits = (usedRows + neighborhoodRows) <= VESTABOARD_ROWS;
  if (neighborhoodFits && neighborhoodLength > 0) {
    usedRows += neighborhoodRows;
  }
  const teamFits = (usedRows + teamRows) <= VESTABOARD_ROWS && teamLength > 0;
  if (teamFits) {
    usedRows += teamRows;
  }

  const totalChars = nameLength + noteLength + (neighborhoodFits ? neighborhoodLength : 0) + (teamFits ? teamLength : 0);
  const charsRemaining = VESTABOARD_LIMIT - totalChars;
  const isOverLimit = usedRows > VESTABOARD_ROWS;

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

  const CharCounter = (
    <div style={{
      fontSize: 13,
      color: isOverLimit ? '#f87171' : usedRows > 5 ? '#fbbf24' : '#9ca3af',
      fontWeight: isOverLimit ? 600 : 400,
      whiteSpace: 'nowrap',
    }}>
      {isOverLimit ? '⚠️ ' : ''}
      {usedRows}/{VESTABOARD_ROWS} rows
      {neighborhoodFits && neighborhoodLength > 0 ? ' +area' : ''}
      {teamFits && form.team ? ' +team' : ''}
      {isOverLimit && ' (too long)'}
    </div>
  );

  const ActionButtons = (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
      <button onClick={onOpenShare} disabled={isOverLimit} style={{ opacity: isOverLimit ? 0.5 : 1, cursor: isOverLimit ? 'not-allowed' : 'pointer' }}>
        Add My Pin
      </button>
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
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={() => setPhotoModalOpen(true)}
          disabled={!!form.photoUrl}
          aria-label="Add photo"
          title={form.photoUrl ? 'Photo attached' : 'Add photo'}
          style={{
            background: !form.photoUrl ? '#0ea5e9' : '#22c55e',
            padding: '8px 12px',
            fontSize: 20,
            minWidth: 'auto',
            border: 'none',
            borderRadius: 6,
            cursor: form.photoUrl ? 'default' : 'pointer',
          }}
        >
          {form.photoUrl ? '✓' : '📸'}
        </button>
      </div>
      {commonSlugBadge}
      {ActionButtons}
    </div>
  );

  // Camera is now in a modal, no inline camera section needed

  const InlineFieldsChicago = (
    <div style={{
      gridColumn: '1 / -1',
      display: 'grid',
      gap: 10,
      gridTemplateColumns: 'minmax(180px,1fr) minmax(180px,1fr) minmax(200px,1fr) minmax(260px,2fr)',
    }}>
      <VoiceInput placeholder="Your name (optional)" value={form.name || ''} onChange={(e) => update({ name: e.target.value })} ariaLabel="Your name" />
      <VoiceInput placeholder="Neighborhood (optional)" value={form.neighborhood || ''} onChange={(e) => update({ neighborhood: e.target.value })} ariaLabel="Neighborhood" />
      <div style={{ display: 'contents' }}>
        <VoiceInput list="hotdog-stand-suggestions" placeholder="Favorite hot dog stand (search or create)" value={form.hotdog || ''} onChange={(e) => update({ hotdog: e.target.value })} ariaLabel="Favorite hot dog stand" />
        <datalist id="hotdog-stand-suggestions">
          {hotdogSuggestions.map((s) => <option key={s} value={s} />)}
        </datalist>
      </div>
      <VoiceInput placeholder="Leave a note for other guests (optional)" value={form.note || ''} onChange={(e) => update({ note: e.target.value })} ariaLabel="Note" />
    </div>
  );

  const InlineFieldsGlobal = (
    <div style={{
      gridColumn: '1 / -1',
      display: 'grid',
      gap: 10,
      gridTemplateColumns: 'minmax(180px,1fr) minmax(200px,1fr) minmax(260px,2fr)',
    }}>
      <VoiceInput placeholder="Your name (optional)" value={form.name || ''} onChange={(e) => update({ name: e.target.value })} ariaLabel="Your name" />
      <div style={{ display: 'contents' }}>
        <VoiceInput list="hotdog-stand-suggestions" placeholder="Favorite hot dog stand (search or create)" value={form.hotdog || ''} onChange={(e) => update({ hotdog: e.target.value })} ariaLabel="Favorite hot dog stand" />
        <datalist id="hotdog-stand-suggestions">
          {hotdogSuggestions.map((s) => <option key={s} value={s} />)}
        </datalist>
      </div>
      <VoiceInput placeholder="Leave a note for other guests (optional)" value={form.note || ''} onChange={(e) => update({ note: e.target.value })} ariaLabel="Note" />
    </div>
  );


  // Loyalty section moved to PinShareModal to free up space in editor
  const LoyaltySection = null;

  if (mapMode === 'chicago') {
    return (
      <>
        <div className="form" style={{
          display: 'grid',
          gap: 10,
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))',
          overflow: 'visible',
          paddingTop: 2,
        }}>
          {IdAndActionsRow}

          {/* Pin Style Selector - Horizontal Swiper */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
              Choose Your Pin Style <span style={{ fontSize: 12, color: '#a7b0b8', fontWeight: 400 }}>(Swipe to see more →)</span>
            </label>
            <Swiper
              modules={[FreeMode]}
              spaceBetween={12}
              slidesPerView="auto"
              freeMode={true}
              style={{ padding: '4px 0' }}
            >
              {AVAILABLE_PIN_STYLES.map((style) => {
                const count = counts[style.id] || 0;
                return (
                  <SwiperSlide
                    key={style.id}
                    style={{ width: 'auto' }}
                  >
                    <button
                      onClick={() => update({ pinStyle: form.pinStyle === style.id ? null : style.id })}
                      style={{
                        background: form.pinStyle === style.id ? style.colors.primary : 'rgba(255, 255, 255, 0.05)',
                        border: `2px solid ${form.pinStyle === style.id ? style.colors.primary : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: 8,
                        padding: '12px 16px',
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        color: form.pinStyle === style.id ? '#fff' : '#a7b0b8',
                        whiteSpace: 'nowrap',
                        minWidth: 'auto',
                      }}
                    >
                      <span style={{ fontSize: 28 }}>{style.emoji}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{style.name}</span>
                        {count > 0 && (
                          <span style={{
                            fontSize: 10,
                            opacity: 0.7,
                            fontWeight: 400,
                          }}>
                            {count} pin{count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </button>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </div>

          {InlineFieldsChicago}
          {LoyaltySection}
        </div>

        <PhotoCaptureModal
          open={photoModalOpen}
          onClose={() => setPhotoModalOpen(false)}
          onPhotoTaken={(photoUrl) => update({ photoUrl })}
          slug={slug}
        />
      </>
    );
  }

  return (
    <>
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

      <PhotoCaptureModal
        open={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        onPhotoTaken={(photoUrl) => update({ photoUrl })}
        slug={slug}
      />
    </>
  );
}