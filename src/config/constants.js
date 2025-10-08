// src/config/constants.js
// Application-wide constants

// Timeouts and Durations (in milliseconds)
export const IDLE_TIMEOUT_MS = 60_000; // 60 seconds - how long before idle state triggers
export const CONFETTI_SCREENSAVER_MS = 15_000; // 15 seconds - how long before confetti starts
export const CONFETTI_INTERVAL_MS = 6_000; // 6 seconds - time between confetti bursts
export const MAP_INVALIDATE_DELAY_MS = 300; // Delay before calling invalidateSize on map
export const FULLSCREEN_RETRY_DELAY_MS = 500; // Delay before retrying fullscreen entry
export const RESIZE_DEBOUNCE_MS = 300; // Debounce delay for resize handler

// Z-Index Layers
export const Z_INDEX = {
  FOOTER: 50,
  OFFLINE_DOWNLOAD_BAR: 200,
  NOW_PLAYING_BANNER: 250,
  VOICE_ASSISTANT: 300,
  ATTRACTOR_OVERLAY: 400,
  MODALS: 9000,
  CONFETTI: 99999,
};

// UI Positioning
export const UI_POSITION = {
  ATTRACTOR_TOP: '12vh', // Attractor overlay padding from top
  VOICE_UI_TOP: '70%', // Voice microphone vertical position
  FOOTER_APPROXIMATE_START: '85%', // Where footer starts on screen
};

// Confetti Settings
export const CONFETTI = {
  COUNT: 50, // Number of confetti pieces per burst
  SIZE: 20, // Size in pixels (width and height)
  FALL_DURATION_MIN: 3500, // Minimum fall duration in ms
  FALL_DURATION_MAX: 6000, // Maximum fall duration in ms
  CLEANUP_DELAY: 4000, // How long before cleaning up DOM elements
  HORIZONTAL_DRIFT: 200, // Maximum horizontal drift in pixels
};

// Touch/Tap Interaction
export const TOUCH = {
  TRIPLE_TAP_WINDOW_MS: 1500, // Time window for 3 taps to trigger admin
  SEQUENCE_TIMEOUT_MS: 3000, // Timeout for touch sequence completion
};

// API/Network
export const API = {
  WEATHER_REFRESH_INTERVAL_MS: 30 * 60 * 1000, // 30 minutes
};

// Map Settings
export const MAP = {
  CHI_MIN_ZOOM: 9, // Minimum zoom for Chicago
  CHI_MAX_ZOOM: 18, // Maximum zoom for Chicago
  GLOBAL_MAX_ZOOM: 18, // Maximum zoom for global mode
  MOBILE_DEFAULT_ZOOM: 11, // Default zoom for mobile (Chicago proper)
  DESKTOP_DEFAULT_ZOOM: 9, // Default zoom for desktop (full metro)
};

// Pin Settings
export const PIN = {
  INITIAL_RADIUS_MILES: 50, // Initial search radius for pins
  HOTDOG_OPTIONS: [
    'No Hotdog',
    'Deep Dish',
    'Regular Pizza',
    'Italian Beef',
    'Chicago Dog',
    'Maxwell Street Polish',
    'Jibarito',
    'Other',
  ],
};

// Storage Keys
export const STORAGE_KEYS = {
  KIOSK_MODE: 'kioskMode',
  SELECTED_LOCATION: 'selectedLocation',
  INDUSTRY_DEMO: 'industryDemo',
  ADMIN_SETTINGS: 'adminSettings',
};
