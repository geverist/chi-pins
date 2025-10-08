// src/components/Footer.jsx
import { memo } from 'react';
import Editor from './Editor';
import { btn3d } from '../lib/styles';

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
  if (isMobile) return null;

  // Calculate bottom margin based on which bars are visible
  let bottomMargin = 0;
  if (downloadingBarVisible) bottomMargin += DOWNLOADING_BAR_HEIGHT;
  if (nowPlayingVisible) bottomMargin += NOW_PLAYING_HEIGHT;

  return (
    <footer
      style={{
        padding: '12px 16px',
        marginBottom: `${bottomMargin}px`,
        transition: 'margin-bottom 0.3s ease',
        position: 'relative',
        zIndex: 50, // Above map (0), below download bar (200) and NowPlayingBanner (250)
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
                gap: 18,
                flexWrap: 'wrap',
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
                  🏛️ Then & Now
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
                  💬 Leave Feedback
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
                  🗺️ Recommendations
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
                      🔎 Explore Pins
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
                      ✖ Close Explore
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
