// src/components/WeatherWidget.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAdminSettings } from '../state/useAdminSettings';
import { isIndustryDemo } from '../config/industryConfigs';
import { useLayoutStack } from '../hooks/useLayoutStack';
import DraggableElement from './DraggableElement';
import { useLayoutEditor } from '../hooks/useLayoutEditor';

export default function WeatherWidget({ autoDismissOnEdit = false, isMobile = false }) {
  const { settings: adminSettings } = useAdminSettings();
  const { layout } = useLayoutStack();
  const { isEditorActive, handlePositionChange } = useLayoutEditor(isMobile);
  const widgetRef = useRef(null);
  const isDemoMode = isIndustryDemo();
  const newsTickerEnabled = adminSettings.newsTickerEnabled && adminSettings.newsTickerRssUrl;
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);

  // Calculate position based on layout stack
  // Add 10px gap below comments banner
  const topPosition = (layout.headerHeight || 0) + (layout.commentsBannerHeight || 0) + 10;

  // Debug logging
  console.log('[WeatherWidget] Layout values:', JSON.stringify({
    headerHeight: layout.headerHeight,
    commentsBannerHeight: layout.commentsBannerHeight,
    calculatedTop: topPosition
  }));

  // Auto-dismiss when user interacts with pins/editor
  useEffect(() => {
    if (autoDismissOnEdit) {
      setIsDismissed(true);
    }
  }, [autoDismissOnEdit]);

  const fetchWeather = useCallback(async () => {
    try {
      setLoading(true);
      // Using Open-Meteo API (no API key required)
      const lat = adminSettings.weatherLat || 41.8781;
      const lng = adminSettings.weatherLng || -87.6298;
      const timezone = adminSettings.weatherTimezone || 'America/Chicago';

      console.log('WeatherWidget - Fetching weather for:', { lat, lng, timezone });

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=${encodeURIComponent(timezone)}`
      );

      if (!response.ok) throw new Error('Weather fetch failed');

      const data = await response.json();
      setWeather(data.current);
      setError(null);
    } catch (err) {
      console.error('Weather error:', err);
      setError('Unable to load weather');
    } finally {
      setLoading(false);
    }
  }, [adminSettings.weatherLat, adminSettings.weatherLng, adminSettings.weatherTimezone]);

  useEffect(() => {
    console.log('WeatherWidget - useEffect triggered, fetching weather');
    fetchWeather();
    // Refresh every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  const getWeatherEmoji = (weatherCode) => {
    // WMO Weather interpretation codes
    if (weatherCode === 0) return '☀️';
    if (weatherCode <= 3) return '🌤️';
    if (weatherCode <= 48) return '🌫️';
    if (weatherCode <= 67) return '🌧️';
    if (weatherCode <= 77) return '❄️';
    if (weatherCode <= 82) return '🌧️';
    if (weatherCode <= 86) return '🌨️';
    if (weatherCode <= 99) return '⛈️';
    return '🌡️';
  };

  const getHotDogRecommendation = (temp, weatherCode) => {
    if (temp < 32) {
      return { item: 'Chili Cheese Dog', reason: "It's freezing! Warm up with our chili cheese dog! 🌶️" };
    } else if (temp < 45) {
      return { item: 'Classic Chicago Dog', reason: "Chilly day! Perfect for a hot Chicago dog! 🌭" };
    } else if (temp > 85) {
      return { item: 'Italian Beef Sandwich', reason: "Hot day! Cool down inside with our famous Italian beef! 🥖" };
    } else if (weatherCode >= 51 && weatherCode <= 67) {
      return { item: 'Combo Meal', reason: "Rainy day? Grab a combo and stay dry inside! ☔" };
    } else if (weatherCode >= 71 && weatherCode <= 77) {
      return { item: 'Hot Chocolate + Dog', reason: "Snowy weather! Hot cocoa & a hot dog! ☕" };
    } else {
      return { item: 'Daily Special', reason: "Beautiful day! Try our daily special! 😊" };
    }
  };

  if (isDismissed || error || !weather) {
    return null;
  }

  if (loading) {
    return (
      <div
        ref={widgetRef}
        style={{
          position: 'fixed',
          top: `${topPosition}px`,
          right: 20,
          background: 'linear-gradient(135deg, rgba(59,130,246,0.95) 0%, rgba(37,99,235,0.95) 100%)',
          borderRadius: 16,
          padding: '16px 20px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          minWidth: 200,
          zIndex: 900,
          pointerEvents: 'auto',
        }}
      >
        <div style={{ textAlign: 'center' }}>Loading weather...</div>
      </div>
    );
  }

  const recommendation = getHotDogRecommendation(weather.temperature_2m, weather.weather_code);

  const locationName = adminSettings.weatherLocation || 'Chicago, IL';

  // Default position for the weather widget
  const defaultPosition = {
    top: `${topPosition}px`,
    right: '20px',
    zIndex: 900,
  };

  const widgetContent = (
    <div
      ref={widgetRef}
      style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.95) 0%, rgba(37,99,235,0.95) 100%)',
        borderRadius: 16,
        padding: '16px 20px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.2)',
        backdropFilter: 'blur(10px)',
        color: '#fff',
        minWidth: 280,
        maxWidth: 320,
        pointerEvents: 'auto',
      }}
    >
      {/* Close button */}
      <button
        onClick={() => setIsDismissed(true)}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(0,0,0,0.3)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 'bold',
        }}
        title="Dismiss"
      >
        ✕
      </button>
      {/* Weather Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 48 }}>{getWeatherEmoji(weather.weather_code)}</span>
        <div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>
            {Math.round(weather.temperature_2m)}°F
          </div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            Feels like {Math.round(weather.apparent_temperature)}°F
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          fontSize: 12,
          marginBottom: 12,
          paddingBottom: 12,
          borderBottom: '1px solid rgba(255,255,255,0.3)',
        }}
      >
        <div>
          <div style={{ opacity: 0.8 }}>Humidity</div>
          <div style={{ fontWeight: 600 }}>{Math.round(weather.relative_humidity_2m)}%</div>
        </div>
        <div>
          <div style={{ opacity: 0.8 }}>Wind</div>
          <div style={{ fontWeight: 600 }}>{Math.round(weather.wind_speed_10m)} mph</div>
        </div>
      </div>

      {/* Hot Dog Recommendation */}
      <div
        style={{
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 10,
          padding: 12,
          border: '1px solid rgba(255,255,255,0.2)',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
          {recommendation.item}
        </div>
        <div style={{ fontSize: 12, opacity: 0.95, lineHeight: 1.4 }}>
          {recommendation.reason}
        </div>
      </div>

      {/* Location */}
      <div
        style={{
          marginTop: 8,
          fontSize: 11,
          opacity: 0.7,
          textAlign: 'center',
        }}
      >
        📍 {locationName}
      </div>
    </div>
  );

  return (
    <DraggableElement
      elementId="weatherWidget"
      defaultPosition={defaultPosition}
      enabled={isEditorActive}
      onPositionChange={handlePositionChange}
      isMobile={isMobile}
    >
      {widgetContent}
    </DraggableElement>
  );
}
