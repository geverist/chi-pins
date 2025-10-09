// src/hooks/usePinStyleCounts.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function usePinStyleCounts() {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCounts() {
      try {
        const { data, error } = await supabase
          .from('pins')
          .select('pinStyle');

        if (error) {
          console.error('Error fetching pin style counts:', error);
          return;
        }

        // Count occurrences of each pin style
        const countMap = {};
        data.forEach(pin => {
          if (pin.pinStyle) {
            countMap[pin.pinStyle] = (countMap[pin.pinStyle] || 0) + 1;
          }
        });

        setCounts(countMap);
      } catch (err) {
        console.error('Error in usePinStyleCounts:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCounts();
  }, []);

  return { counts, loading };
}
