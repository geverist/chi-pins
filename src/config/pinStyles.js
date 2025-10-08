// src/config/pinStyles.js
// Custom pin styles for Chicago teams and affiliations

export const PIN_STYLES = {
  bears: {
    id: 'bears',
    name: 'Bears',
    emoji: '🐻',
    colors: {
      primary: '#0B162A', // Navy blue
      secondary: '#C83803', // Orange
    },
    icon: '🐻',
  },
  bulls: {
    id: 'bulls',
    name: 'Bulls',
    emoji: '🐂',
    colors: {
      primary: '#CE1141', // Red
      secondary: '#000000', // Black
    },
    icon: '🐂',
  },
  cubs: {
    id: 'cubs',
    name: 'Cubs',
    emoji: '⚾',
    colors: {
      primary: '#0E3386', // Cubs blue
      secondary: '#CC3433', // Red
    },
    icon: '⚾',
  },
  whitesox: {
    id: 'whitesox',
    name: 'White Sox',
    emoji: '⚪',
    colors: {
      primary: '#27251F', // Black
      secondary: '#C4CED4', // Silver
    },
    icon: '⚪',
  },
  blackhawks: {
    id: 'blackhawks',
    name: 'Blackhawks',
    emoji: '🏒',
    colors: {
      primary: '#CF0A2C', // Red
      secondary: '#000000', // Black
    },
    icon: '🏒',
  },
  chicagostar: {
    id: 'chicagostar',
    name: 'Chicago Star',
    emoji: '⭐',
    colors: {
      primary: '#B3DDF2', // Chicago flag light blue
      secondary: '#FF0000', // Red
    },
    icon: '⭐',
  },
};

// Default style (hotdog - existing)
export const DEFAULT_PIN_STYLE = 'hotdog';

// Get all available styles as array
export const AVAILABLE_PIN_STYLES = Object.values(PIN_STYLES);

// Get style by id
export function getPinStyle(styleId) {
  return PIN_STYLES[styleId] || null;
}

// Get pin color based on style
export function getPinColor(pin) {
  if (pin.pinStyle && PIN_STYLES[pin.pinStyle]) {
    return PIN_STYLES[pin.pinStyle].colors.primary;
  }

  // Fall back to team color for backward compatibility
  if (pin.team === 'hotdog') return '#ef4444';
  if (pin.team === 'beef') return '#8b4513';
  return '#3b82f6'; // default blue
}

// Get pin icon/emoji based on style
export function getPinIcon(pin) {
  if (pin.pinStyle && PIN_STYLES[pin.pinStyle]) {
    return PIN_STYLES[pin.pinStyle].icon;
  }

  // Fall back to hotdog/beef for backward compatibility
  if (pin.hotdog) return '🌭';
  return '📍';
}
