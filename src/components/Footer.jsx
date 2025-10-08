// src/components/Footer.jsx
import { memo, useEffect, useRef } from 'react';
import Editor from './Editor';
import { btn3d } from '../lib/styles';
import { useLayoutStack } from '../hooks/useLayoutStack';

const DOWNLOADING_BAR_HEIGHT = 72; // Must match OfflineMapDownloader.jsx
const NOW_PLAYING_HEIGHT = 48; // NowPlayingBanner height (desktop)

function Footer({
  isMobile,
  draft,
  exploring,
  mapMode,
  mapReady,
  navSettings,
  enabledCount,
  setGamesOpen,
  setJukeboxOpen,
  setOrderMenuOpen,
  setPhotoBoothOpen,
  setThenAndNowOpen,
  setCommentsOpen,
  setRecommendationsOpen,
  setAppointmentCheckInOpen,
  setReservationCheckInOpen,
  setGuestBookOpen,
  setExploring,
  setShowAttractor,
  setVoiceAssistantVisible,
  handleFooterClick,
  handleFooterTouch,
  // Editor props
  slug,
  form,
  setForm,
  hotdogSuggestions,
  cancelEditing,
  setShareOpen,
  adminSettings,
  downloadingBarVisible = false,
  nowPlayingVisible = false,
}) {
  const { layout, updateHeight } = useLayoutStack();
  const footerRef = useRef(null);

  // Report heights to layout system
  useEffect(() => {
    const nowPlayingHeight = nowPlayingVisible ? NOW_PLAYING_HEIGHT : 0;
    console.log('[Footer] Reporting now playing height:', JSON.stringify({ nowPlayingHeight, nowPlayingVisible }));
    updateHeight('nowPlayingHeight', nowPlayingHeight);
    if (footerRef.current) {
      updateHeight('footerHeight', footerRef.current.offsetHeight);
    }
  }, [nowPlayingVisible, updateHeight]);

  if (isMobile) {
    console.log('[Footer] Hidden on mobile');
    return null;
  }

  // Footer sits above downloading bar and now playing bar
  // Use actual measured heights from layout stack
  const downloadingHeight = layout.downloadingBarHeight || 0;
  const nowPlayingHeightValue = layout.nowPlayingHeight || 0;
  const bottomPosition = downloadingHeight + nowPlayingHeightValue;

  console.log('[Footer] Positioned above bottom bars:', JSON.stringify({
    bottomPosition,
    downloadingHeight,
    nowPlayingHeight: nowPlayingHeightValue,
    downloadingBarVisible,
    nowPlayingVisible
  }));

  return (
    <footer
      ref={footerRef}
      style={{
        position: 'fixed',
        bottom: `${bottomPosition}px`,
        left: 0,
        right: 0,
        padding: '12px 16px',
        // transition: 'bottom 0.3s ease', // TEMPORARILY DISABLED FOR DEBUGGING
        zIndex: 50, // Above map (0), below download bar (200) and NowPlayingBanner (250)
        background: 'rgba(17, 24, 39, 0.95)', // Semi-transparent dark background
        backdropFilter: 'blur(8px)',
        // Debug border
        borderTop: '3px solid red',
        borderBottom: '3px solid blue',
      }}
      onClick={handleFooterClick}
      onTouchStart={handleFooterTouch}
      aria-label="Footer controls"
    >
      {!draft ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* Top row: Games, Jukebox, Order Now, Photo Booth, Then & Now, Leave Feedback, and new items */}
          {(navSettings.games_enabled || navSettings.jukebox_enabled || navSettings.order_enabled || navSettings.photobooth_enabled || navSettings.thenandnow_enabled || navSettings.comments_enabled || navSettings.recommendations_enabled || navSettings.appointment_checkin_enabled || navSettings.reservation_checkin_enabled || navSettings.guestbook_enabled) && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 8,
                flexWrap: 'nowrap',
                overflow: 'hidden',
                minWidth: 0,
              }}
              data-no-admin-tap
            >
              {navSettings.games_enabled && (
                <button
                  onClick={() => {
                    setGamesOpen(true);
                    setVoiceAssistantVisible?.(false);
                  }}
                  style={btn3d(false)}
                  className="btn-kiosk"
                  aria-label="Play Games"
                >
                  🎮 Games
                </button>
              )}
              {navSettings.jukebox_enabled && (
                <button
                  onClick={() => {
                    setJukeboxOpen(true);
                    setVoiceAssistantVisible?.(false);
                  }}
                  style={btn3d(false)}
                  className="btn-kiosk"
                  aria-label="Open Jukebox"
                >
                  🎵 Jukebox
                </button>
              )}
              {navSettings.order_enabled && (
                <button
                  onClick={() => {
                    setOrderMenuOpen(true);
                    setVoiceAssistantVisible?.(false);
                  }}
                  style={btn3d(false)}
                  className="btn-kiosk"
                  aria-label="Order from Chicago Mike's"
                >
                  🍕 Order Now
                </button>
              )}
              {navSettings.photobooth_enabled && (
                <button
                  onClick={() => {
                    setPhotoBoothOpen(true);
                    setVoiceAssistantVisible?.(false);
                  }}
                  style={btn3d(false)}
                  className="btn-kiosk"
                  aria-label="Photo Booth"
                >
                  📸 Photo Booth
                </button>
              )}
              {navSettings.thenandnow_enabled && (
                <button
                  onClick={() => {
                    setThenAndNowOpen(true);
                    setVoiceAssistantVisible?.(false);
                  }}
                  style={btn3d(false)}
                  className="btn-kiosk"
                  aria-label="Then & Now Photos"
                >
                  🏛️ Then&Now
                </button>
              )}
              {navSettings.comments_enabled && (
                <button
                  onClick={() => {
                    setCommentsOpen(true);
                    setVoiceAssistantVisible?.(false);
                  }}
                  style={btn3d(false)}
                  className="btn-kiosk"
                  aria-label="Leave Feedback"
                >
                  💬 Feedback
                </button>
              )}
              {navSettings.recommendations_enabled && (
                <button
                  onClick={() => {
                    setRecommendationsOpen(true);
                    setVoiceAssistantVisible?.(false);
                  }}
                  style={btn3d(false)}
                  className="btn-kiosk"
                  aria-label="Local Recommendations"
                >
                  🗺️ Explore
                </button>
              )}
              {navSettings.appointment_checkin_enabled && (
                <button
                  onClick={() => {
                    setAppointmentCheckInOpen(true);
                    setVoiceAssistantVisible?.(false);
                  }}
                  style={btn3d(false)}
                  className="btn-kiosk"
                  aria-label="Appointment Check-In"
                >
                  📋 Check-In
                </button>
              )}
              {navSettings.reservation_checkin_enabled && (
                <button
                  onClick={() => {
                    setReservationCheckInOpen(true);
                    setVoiceAssistantVisible?.(false);
                  }}
                  style={btn3d(false)}
                  className="btn-kiosk"
                  aria-label="Reservation Check-In"
                >
                  🍽️ Reservation
                </button>
              )}
              {navSettings.guestbook_enabled && (
                <button
                  onClick={() => {
                    setGuestBookOpen(true);
                    setVoiceAssistantVisible?.(false);
                  }}
                  style={btn3d(false)}
                  className="btn-kiosk"
                  aria-label="Guest Book"
                >
                  📖 Guest Book
                </button>
              )}
              {navSettings.explore_enabled && (
                <>
                  {!exploring ? (
                    <button
                      onClick={() => {
                        setExploring(true);
                        setShowAttractor(false);
                        setVoiceAssistantVisible?.(false);
                      }}
                      style={btn3d(false)}
                      className="btn-kiosk"
                      aria-label="Explore community pins"
                    >
                      🔎 Pins
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setExploring(false);
                        setVoiceAssistantVisible?.(false);
                      }}
                      style={btn3d(false)}
                      className="btn-kiosk"
                      aria-label="Close explore mode"
                    >
                      ✖ Close
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <Editor
          mapMode={mapMode}
          slug={slug}
          form={form}
          setForm={setForm}
          hotdogSuggestions={hotdogSuggestions}
          onCancel={cancelEditing}
          onOpenShare={() => setShareOpen(true)}
          photoBackgroundsEnabled={adminSettings.photoBackgroundsEnabled}
          loyaltyEnabled={adminSettings.loyaltyEnabled}
        />
      )}
    </footer>
  );
}

export default memo(Footer);
