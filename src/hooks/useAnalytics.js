// src/hooks/useAnalytics.js
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useKioskCluster } from './useKioskCluster';

// Generate or retrieve session ID
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
    sessionStorage.setItem('analytics_session_start', Date.now().toString());
  }
  return sessionId;
};

/**
 * Hook to track analytics events and user interactions
 */
export function useAnalytics() {
  const { currentLocation } = useKioskCluster();
  const sessionId = useRef(getSessionId());
  const featuresUsed = useRef(new Set());

  // Track session start
  useEffect(() => {
    const startSession = async () => {
      const deviceType = window.innerWidth < 768 ? 'mobile' :
                        window.innerWidth < 1024 ? 'tablet' : 'kiosk';

      try {
        await supabase
          .from('analytics_sessions')
          .insert({
            session_id: sessionId.current,
            location_id: currentLocation?.id || null,
            device_type: deviceType,
            started_at: new Date().toISOString()
          });
      } catch (err) {
        console.error('[Analytics] Failed to start session:', err);
      }
    };

    startSession();

    // Track session end on page unload
    const endSession = async () => {
      const startTime = parseInt(sessionStorage.getItem('analytics_session_start') || '0');
      const duration = Math.floor((Date.now() - startTime) / 1000);

      try {
        await supabase
          .from('analytics_sessions')
          .update({
            ended_at: new Date().toISOString(),
            duration_seconds: duration,
            events_count: featuresUsed.current.size,
            features_used: Array.from(featuresUsed.current)
          })
          .eq('session_id', sessionId.current);
      } catch (err) {
        console.error('[Analytics] Failed to end session:', err);
      }
    };

    window.addEventListener('beforeunload', endSession);
    return () => {
      window.removeEventListener('beforeunload', endSession);
      endSession(); // Also end on unmount
    };
  }, [currentLocation]);

  // Track an event
  const trackEvent = useCallback(async (eventType, eventCategory, metadata = {}) => {
    try {
      await supabase
        .from('analytics_events')
        .insert({
          event_type: eventType,
          event_category: eventCategory,
          user_session_id: sessionId.current,
          location_id: currentLocation?.id || null,
          metadata: metadata
        });

      featuresUsed.current.add(eventType);
      console.log(`[Analytics] Tracked: ${eventType}`, metadata);
    } catch (err) {
      console.error('[Analytics] Failed to track event:', err);
    }
  }, [currentLocation]);

  // Track popular item interaction
  const trackPopularItem = useCallback(async (itemType, itemId, itemName) => {
    try {
      await supabase.rpc('track_popular_item', {
        p_item_type: itemType,
        p_item_id: itemId,
        p_item_name: itemName,
        p_location_id: currentLocation?.id || null
      });
    } catch (err) {
      console.error('[Analytics] Failed to track popular item:', err);
    }
  }, [currentLocation]);

  // Track words for word cloud
  const trackWords = useCallback(async (text, category) => {
    if (!text) return;

    // Extract meaningful words (3+ chars, not common words)
    const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'was', 'were', 'been', 'are']);
    const words = text
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length >= 3 && !stopWords.has(word));

    try {
      for (const word of words) {
        await supabase.rpc('update_word_frequency', {
          word_text: word,
          word_category: category,
          word_location_id: currentLocation?.id || null
        });
      }
    } catch (err) {
      console.error('[Analytics] Failed to track words:', err);
    }
  }, [currentLocation]);

  // Convenience methods for common events
  const track = {
    pinCreated: (pinData) => {
      trackEvent('pin_created', 'content', {
        lat: pinData.lat,
        lng: pinData.lng,
        has_message: !!pinData.message,
        team: pinData.team
      });
      if (pinData.message) {
        trackWords(pinData.message, 'pin_message');
      }
    },

    gamePlayed: (game, score) => {
      trackEvent('game_played', 'game', { game, score });
      trackPopularItem('game', game, `${game} game`);
    },

    jukeboxPlay: (song) => {
      trackEvent('jukebox_play', 'engagement', {
        song: song.title,
        artist: song.artist
      });
      trackPopularItem('song', song.url, song.title);
    },

    photoTaken: (filter) => {
      trackEvent('photo_taken', 'engagement', { filter });
    },

    orderPlaced: (orderData) => {
      trackEvent('order_placed', 'conversion', orderData);
    },

    featureOpened: (feature) => {
      trackEvent('feature_opened', 'navigation', { feature });
    },

    commentSubmitted: (comment) => {
      trackEvent('comment_submitted', 'engagement', {
        has_text: !!comment.text
      });
      if (comment.text) {
        trackWords(comment.text, 'comment');
      }
    },

    thenAndNowViewed: (location) => {
      trackEvent('then_and_now_viewed', 'engagement', { location });
    },

    locationSwitched: (fromLocation, toLocation) => {
      trackEvent('location_switched', 'navigation', {
        from: fromLocation,
        to: toLocation
      });
    }
  };

  return {
    trackEvent,
    trackPopularItem,
    trackWords,
    track,
    sessionId: sessionId.current
  };
}
