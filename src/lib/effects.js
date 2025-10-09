// src/lib/effects.js
// Visual and audio effects library

/**
 * Play a pin drop sound effect
 */
export function playPinDropSound() {
  try {
    // Create audio context for web audio API
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();

    // Create oscillator for a "ding" sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Pin drop sound: starts high, drops low
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2);

    // Fade out
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (err) {
    console.warn('Audio not supported:', err);
  }
}

/**
 * Create confetti animation
 * @param {HTMLElement} container - Container element for confetti
 * @param {Object} options - Animation options
 */
// Track all active confetti pieces globally so we can clean them up immediately
const activeConfettiPieces = new Set();

/**
 * Clean up all active confetti immediately
 */
export function clearAllConfetti() {
  activeConfettiPieces.forEach(piece => {
    if (piece && piece.parentNode) {
      piece.remove();
    }
  });
  activeConfettiPieces.clear();
}

export function showConfetti(container = document.body, options = {}) {
  const {
    count = 100, // Increased from 50 for more confetti
    duration = 8000, // Increased duration for slower cleanup
    colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
    screensaver = false // New: screensaver mode for burn-in prevention
  } = options;

  const confettiPieces = [];

  for (let i = 0; i < count; i++) {
    const confetti = document.createElement('div');
    confetti.style.position = 'fixed';
    confetti.style.width = '20px'; // Bigger: 20px instead of 10px
    confetti.style.height = '20px'; // Bigger: 20px instead of 10px
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

    // Screensaver mode: spawn from random positions across entire screen
    if (screensaver) {
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.top = Math.random() * 100 + '%';
    } else {
      // Celebration mode: fall from top
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.top = '-20px'; // Adjusted for larger size
    }

    confetti.style.opacity = '1';
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    confetti.style.pointerEvents = 'none';
    confetti.style.zIndex = '99999';
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';

    container.appendChild(confetti);
    confettiPieces.push(confetti);
    activeConfettiPieces.add(confetti);

    // Screensaver mode: slow continuous drift across screen
    if (screensaver) {
      const driftDistance = 300 + Math.random() * 200;
      const driftDuration = 12000 + Math.random() * 6000; // Very slow: 12-18s
      const horizontalDrift = (Math.random() - 0.5) * driftDistance;
      const verticalDrift = (Math.random() - 0.5) * driftDistance;
      const rotation = Math.random() * 720;

      confetti.animate([
        {
          transform: `translate(0, 0) rotate(0deg)`,
          opacity: 0.8
        },
        {
          transform: `translate(${horizontalDrift}px, ${verticalDrift}px) rotate(${rotation}deg)`,
          opacity: 0.4
        },
        {
          transform: `translate(0, 0) rotate(${rotation * 2}deg)`,
          opacity: 0.8
        }
      ], {
        duration: driftDuration,
        easing: 'ease-in-out',
        iterations: Infinity // Loop forever in screensaver mode
      });
    } else {
      // Celebration mode: fall from top
      const fallDistance = window.innerHeight + 50;
      const fallDuration = 5000 + Math.random() * 3000; // Much slower: 5000-8000ms (almost double previous speed)
      const horizontalDrift = (Math.random() - 0.5) * 200;
      const rotation = Math.random() * 720;

      confetti.animate([
        {
          transform: `translateY(0) translateX(0) rotate(0deg)`,
          opacity: 1
        },
        {
          transform: `translateY(${fallDistance}px) translateX(${horizontalDrift}px) rotate(${rotation}deg)`,
          opacity: 0
        }
      ], {
        duration: fallDuration,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      });
    }
  }

  // Cleanup (only in celebration mode - screensaver loops forever until cleared)
  if (!screensaver) {
    setTimeout(() => {
      confettiPieces.forEach(piece => {
        piece.remove();
        activeConfettiPieces.delete(piece);
      });
    }, duration);
  }
}

/**
 * Animate element with bounce effect
 * @param {HTMLElement} element
 */
export function bounceAnimation(element) {
  if (!element) return;

  element.animate([
    { transform: 'scale(1)' },
    { transform: 'scale(1.2)' },
    { transform: 'scale(0.95)' },
    { transform: 'scale(1.05)' },
    { transform: 'scale(1)' }
  ], {
    duration: 500,
    easing: 'ease-out'
  });
}

/**
 * Smooth fade in/out transitions
 */
export const transitions = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 }
  },

  slideUp: {
    initial: { opacity: 0, transform: 'translateY(20px)' },
    animate: { opacity: 1, transform: 'translateY(0)' },
    exit: { opacity: 0, transform: 'translateY(-20px)' },
    transition: { duration: 0.3 }
  },

  slideDown: {
    initial: { opacity: 0, transform: 'translateY(-20px)' },
    animate: { opacity: 1, transform: 'translateY(0)' },
    exit: { opacity: 0, transform: 'translateY(20px)' },
    transition: { duration: 0.3 }
  },

  scale: {
    initial: { opacity: 0, transform: 'scale(0.9)' },
    animate: { opacity: 1, transform: 'scale(1)' },
    exit: { opacity: 0, transform: 'scale(0.9)' },
    transition: { duration: 0.2 }
  }
};

/**
 * Get holiday theme based on current date
 * @returns {Object} Theme configuration
 */
export function getHolidayTheme() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();

  // St. Patrick's Day (March 17)
  if (month === 3 && day >= 15 && day <= 18) {
    return {
      name: 'St. Patrick\'s Day',
      primaryColor: '#059669',
      accentColor: '#10b981',
      emoji: '🍀',
      confettiColors: ['#059669', '#10b981', '#34d399', '#fff']
    };
  }

  // Independence Day (July 4)
  if (month === 7 && day >= 2 && day <= 6) {
    return {
      name: 'Independence Day',
      primaryColor: '#dc2626',
      accentColor: '#3b82f6',
      emoji: '🎆',
      confettiColors: ['#dc2626', '#3b82f6', '#fff']
    };
  }

  // Halloween (October 31)
  if (month === 10 && day >= 28 && day <= 31) {
    return {
      name: 'Halloween',
      primaryColor: '#f97316',
      accentColor: '#7c3aed',
      emoji: '🎃',
      confettiColors: ['#f97316', '#7c3aed', '#000']
    };
  }

  // Christmas (December 20-26)
  if (month === 12 && day >= 20 && day <= 26) {
    return {
      name: 'Christmas',
      primaryColor: '#dc2626',
      accentColor: '#059669',
      emoji: '🎄',
      confettiColors: ['#dc2626', '#059669', '#fbbf24', '#fff']
    };
  }

  // New Year's (December 31 - January 2)
  if ((month === 12 && day >= 31) || (month === 1 && day <= 2)) {
    return {
      name: 'New Year',
      primaryColor: '#fbbf24',
      accentColor: '#8b5cf6',
      emoji: '🎉',
      confettiColors: ['#fbbf24', '#8b5cf6', '#ec4899', '#3b82f6']
    };
  }

  // Cubs Opening Day (typically early April)
  if (month === 4 && day >= 1 && day <= 10) {
    return {
      name: 'Cubs Opening Day',
      primaryColor: '#0e3386',
      accentColor: '#cc3433',
      emoji: '⚾',
      confettiColors: ['#0e3386', '#cc3433', '#fff']
    };
  }

  return null;
}

/**
 * Apply smooth CSS transitions to element
 * @param {HTMLElement} element
 * @param {string} property - CSS property to transition
 * @param {string} duration - Duration (e.g., '0.3s')
 */
export function addTransition(element, property = 'all', duration = '0.3s') {
  if (!element) return;
  element.style.transition = `${property} ${duration} ease-in-out`;
}
