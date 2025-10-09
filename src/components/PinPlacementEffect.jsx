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

    // Create ripple circles at the pin location
    const createRipple = (delay = 0, scale = 1) => {
      setTimeout(() => {
        // Create a circle marker for the ripple effect
        const ripple = L.circle([lat, lng], {
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.3,
          weight: 3,
          radius: 10 * scale, // Start small
        }).addTo(map);

        // Animate the ripple expanding and fading
        let radius = 10 * scale;
        let opacity = 0.5;
        const maxRadius = 100 * scale;
        const animationSteps = 30;
        const stepDuration = 20; // ms

        const animate = () => {
          radius += (maxRadius - 10 * scale) / animationSteps;
          opacity -= 0.5 / animationSteps;

          ripple.setRadius(radius);
          ripple.setStyle({
            fillOpacity: Math.max(0, opacity * 0.6),
            opacity: Math.max(0, opacity),
          });

          if (opacity > 0 && radius < maxRadius) {
            setTimeout(animate, stepDuration);
          } else {
            // Remove ripple when animation complete
            ripple.remove();
          }
        };

        animate();
      }, delay);
    };

    // Create multiple ripples with staggered timing for dramatic effect
    createRipple(0, 1);
    createRipple(200, 1.3);
    createRipple(400, 1.6);

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
