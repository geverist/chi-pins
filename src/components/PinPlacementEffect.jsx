// src/components/PinPlacementEffect.jsx
import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * Visual effect component that shows a celebratory animation when a pin is placed
 * Creates a ripple/pulse effect at the pin location
 */
export default function PinPlacementEffect({ lat, lng, trigger }) {
  const map = useMap();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!map || !trigger || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setIsAnimating(true);

    // Create ripple circles at the pin location (water-like physics)
    const createRipple = (delay = 0, scale = 1, rippleIndex = 0) => {
      setTimeout(() => {
        // Create a circle marker for the ripple effect
        // Use L.circleMarker (pixel-based) instead of L.circle (meter-based) to ensure perfect circles
        const ripple = L.circleMarker([lat, lng], {
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.35,
          weight: 2,
          radius: 5 * scale, // Start smaller for more natural expansion (in pixels)
        }).addTo(map);

        // Animate the ripple expanding and fading with realistic water physics
        let radius = 5 * scale;
        let opacity = 0.6;
        const maxRadius = 60 * scale; // Max radius in pixels (60px for visible ripple effect)
        let currentStep = 0;
        const totalSteps = 50; // More steps for smoother animation

        // Water physics: ripples start fast and slow down exponentially
        const animate = () => {
          currentStep++;
          const progress = currentStep / totalSteps;

          // Exponential slowdown (water ripple physics)
          // Early ripples move faster, later ripples slow down dramatically
          const speed = Math.pow(1 - progress, 2); // Quadratic deceleration
          const stepSize = ((maxRadius - 5 * scale) / totalSteps) * (speed * 2 + 0.5);

          radius += stepSize;
          opacity -= (0.6 / totalSteps) * (1.2 - progress * 0.5); // Fade slower at the end

          ripple.setRadius(radius);
          ripple.setStyle({
            fillOpacity: Math.max(0, opacity * 0.5),
            opacity: Math.max(0, opacity * 0.8),
          });

          if (opacity > 0 && radius < maxRadius && currentStep < totalSteps) {
            // Variable timing: start fast (5ms), slow down to (25ms)
            const nextDelay = 5 + (progress * 20);
            setTimeout(animate, nextDelay);
          } else {
            // Remove ripple when animation complete
            ripple.remove();
          }
        };

        animate();
      }, delay);
    };

    // Create more ripples with natural water-like spacing (7 ripples for realistic wave propagation)
    // Each ripple is larger and appears in sequence like real water ripples
    const rippleCount = 7;
    for (let i = 0; i < rippleCount; i++) {
      // Exponential spacing: ripples appear faster at first, then slow down
      const delay = Math.pow(i, 1.4) * 80; // Non-linear spacing (0, 80, 180, 310, 470, 655, 865 ms)
      const scale = 1 + (i * 0.25); // Each ripple slightly larger (1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5)
      createRipple(delay, scale, i);
    }

    // Create confetti-like markers that float up
    const createFloatingMarker = (delay = 0) => {
      setTimeout(() => {
        const offset = (Math.random() - 0.5) * 0.0002; // Random offset
        const startLat = lat + offset;
        const startLng = lng + offset;

        // Create a small circle that will float up
        const floater = L.circleMarker([startLat, startLng], {
          color: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 4)],
          fillColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 4)],
          fillOpacity: 0.8,
          weight: 2,
          radius: 4,
        }).addTo(map);

        // Animate floating up
        let currentLat = startLat;
        const floatSpeed = 0.00003;
        let currentOpacity = 0.8;
        const steps = 40;
        let currentStep = 0;

        const animateFloat = () => {
          currentStep++;
          currentLat += floatSpeed;
          currentOpacity -= 0.8 / steps;

          floater.setLatLng([currentLat, startLng]);
          floater.setStyle({
            fillOpacity: Math.max(0, currentOpacity),
            opacity: Math.max(0, currentOpacity),
          });

          if (currentStep < steps) {
            setTimeout(animateFloat, 30);
          } else {
            floater.remove();
          }
        };

        animateFloat();
      }, delay);
    };

    // Create 8 floating markers with staggered timing
    for (let i = 0; i < 8; i++) {
      createFloatingMarker(i * 100);
    }

    // Reset animation state after completion
    setTimeout(() => {
      setIsAnimating(false);
    }, 2000);

  }, [map, lat, lng, trigger]);

  return null; // This component doesn't render anything visible directly
}
