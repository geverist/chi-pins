// src/hooks/useBusinessHours.js
import { useState, useEffect } from 'react';
import { useAdminSettings } from '../state/useAdminSettings';

/**
 * Hook to determine if the kiosk is within business hours
 * Returns { isOpen, nextChange, businessHoursEnabled }
 */
export function useBusinessHours() {
  const { settings } = useAdminSettings();
  const [isOpen, setIsOpen] = useState(true);
  const [nextChange, setNextChange] = useState(null);

  useEffect(() => {
    if (!settings.businessHoursEnabled) {
      setIsOpen(true);
      setNextChange(null);
      return;
    }

    const checkBusinessHours = () => {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
      const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

      // Get open/close times for today
      const openTime = settings.businessHoursOpen || '09:00'; // Default 9 AM
      const closeTime = settings.businessHoursClose || '21:00'; // Default 9 PM
      const daysOpen = settings.businessHoursDays || [1, 2, 3, 4, 5]; // Default Mon-Fri

      // Parse time strings (HH:MM)
      const [openHour, openMin] = openTime.split(':').map(Number);
      const [closeHour, closeMin] = closeTime.split(':').map(Number);
      const openMinutes = openHour * 60 + openMin;
      const closeMinutes = closeHour * 60 + closeMin;

      // Check if today is a business day
      const isTodayOpen = daysOpen.includes(currentDay);

      // Check if within business hours
      const withinHours = currentTime >= openMinutes && currentTime < closeMinutes;
      const shouldBeOpen = isTodayOpen && withinHours;

      console.log('[BusinessHours]', {
        currentDay,
        currentTime,
        openMinutes,
        closeMinutes,
        isTodayOpen,
        withinHours,
        shouldBeOpen,
      });

      setIsOpen(shouldBeOpen);

      // Calculate next change time
      if (shouldBeOpen) {
        // Currently open, next change is closing time
        const closeDate = new Date(now);
        closeDate.setHours(closeHour, closeMin, 0, 0);
        setNextChange(closeDate);
      } else {
        // Currently closed, find next opening time
        let daysAhead = 0;
        let foundNextOpen = false;

        // Check up to 7 days ahead
        for (let i = 0; i < 7; i++) {
          const checkDay = (currentDay + i) % 7;
          if (daysOpen.includes(checkDay)) {
            const openDate = new Date(now);
            openDate.setDate(now.getDate() + i);
            openDate.setHours(openHour, openMin, 0, 0);

            // If it's today but before opening time, use today
            // If it's today but after closing, check tomorrow
            if (i === 0 && currentTime < openMinutes) {
              setNextChange(openDate);
              foundNextOpen = true;
              break;
            } else if (i > 0) {
              setNextChange(openDate);
              foundNextOpen = true;
              break;
            }
          }
        }

        if (!foundNextOpen) {
          setNextChange(null);
        }
      }
    };

    // Check immediately
    checkBusinessHours();

    // Check every minute
    const interval = setInterval(checkBusinessHours, 60000);

    return () => clearInterval(interval);
  }, [
    settings.businessHoursEnabled,
    settings.businessHoursOpen,
    settings.businessHoursClose,
    settings.businessHoursDays,
  ]);

  return {
    isOpen,
    nextChange,
    businessHoursEnabled: settings.businessHoursEnabled || false,
    openTime: settings.businessHoursOpen || '09:00',
    closeTime: settings.businessHoursClose || '21:00',
    daysOpen: settings.businessHoursDays || [1, 2, 3, 4, 5],
  };
}
