
// src/hooks/usePins.js
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAdminSettings } from '../state/useAdminSettings';

const MAX_ROWS = 1000;

export function usePins(mainMapRef) {
  const { settings } = useAdminSettings();
  const [pins, setPins] = useState([]);
  const newest = useRef(null); // ISO timestamp string of latest row (created_at)
  const seen = useRef(new Set()); // de-dupe guard
  const channelRef = useRef(null);
  const offlineQueue = useRef([]); // Offline pin save queue
  const mountCount = useRef(0); // Track mount count

  const keyFor = (r) =>
    r?.id ??
    r?.slug ??
    (Number.isFinite(r?.lat) && Number.isFinite(r?.lng) ? `${r.lat},${r.lng}` : null);

  const bumpNewest = (rowsOrRow) => {
    const pickTs = (x) => (Array.isArray(x) ? x[0]?.created_at : x?.created_at);
    const ts = pickTs(rowsOrRow);
    if (!ts) return;
    if (!newest.current || ts > newest.current) newest.current = ts;
  };

  // Merge helper: de-dupe, sort desc by created_at, cap size
  const mergeRows = (prev, incoming) => {
    const out = [...prev];
    let duplicates = 0;
    let added = 0;

    for (const r of incoming) {
      const k = keyFor(r);
      if (!k) continue;

      if (seen.current.has(k)) {
        duplicates++;
        const idx = out.findIndex((x) => keyFor(x) === k);
        if (idx !== -1) {
          const old = out[idx];
          const newer =
            (r.created_at || '') > (old.created_at || '') ||
            (r.updated_at || '') > (old.updated_at || '') ||
            !(old.updated_at || r.updated_at);
          if (newer) out[idx] = r;
        }
        continue;
      }

      seen.current.add(k);
      out.unshift(r);
      added++;
    }

    out.sort((a, b) => (b?.created_at || '').localeCompare(a?.created_at || ''));
    if (out.length > MAX_ROWS) out.length = MAX_ROWS;

    console.log(`mergeRows: prev=${prev.length}, incoming=${incoming.length}, duplicates=${duplicates}, added=${added}, final=${out.length}`);
    return out;
  };

  // Remove helper (for DELETE events)
  const removeByKey = (prev, k) => {
    if (!k) return prev;
    if (!seen.current.has(k)) return prev;
    seen.current.delete(k);
    return prev.filter((x) => keyFor(x) !== k);
  };

  // Initial load + realtime
  useEffect(() => {
    let cancelled = false;

    // Always clear on mount to ensure fresh load
    console.log('usePins: Clearing seen set for fresh load');
    seen.current.clear();
    newest.current = null;
    setPins([]);

    const load = async () => {
      try {
        // Fetch all pins in batches to avoid Supabase pagination limits
        const allData = [];
        let offset = 0;
        const batchSize = 1000;
        let hasMore = true;

        // Apply date filtering based on admin settings
        const monthsBack = settings?.showPinsSinceMonths ?? 999;
        const cutoffDate = monthsBack < 999
          ? (() => { const d = new Date(); d.setMonth(d.getMonth() - monthsBack); return d.toISOString(); })()
          : null;

        while (hasMore && !cancelled) {
          let query = supabase
            .from('pins')
            .select('*', { count: 'exact', head: false })
            .order('created_at', { ascending: false })
            .range(offset, offset + batchSize - 1);

          if (cutoffDate) {
            query = query.gte('created_at', cutoffDate);
          }

          const { data, error, count } = await query;

          if (error) {
            console.error('usePins: Error loading pins:', error);
            break;
          }

          if (data && data.length > 0) {
            allData.push(...data);
            offset += data.length;
            hasMore = data.length === batchSize && (count === null || offset < count);
            console.log(`usePins: Fetched batch ${Math.ceil(offset / batchSize)}, got ${data.length} pins, total so far: ${allData.length}`);
          } else {
            hasMore = false;
          }
        }

        if (!cancelled) {
          console.log(`usePins: Loaded ${allData.length} total pins from Supabase`);
          console.log(`usePins: seen.current.size = ${seen.current.size}`);
          const seeded = [];
          for (const r of allData) {
            const k = keyFor(r);
            if (k && !seen.current.has(k)) {
              seen.current.add(k);
              seeded.push(r);
            }
          }
          console.log(`usePins: After dedup, ${seeded.length} new pins added, seen.current.size = ${seen.current.size}`);
          bumpNewest(allData);
          setPins((prev) => mergeRows(prev, seeded));
        }
      } catch {
        // ignore; polling will retry
      }

      // Realtime: INSERT / UPDATE / DELETE
      try {
        const monthsBack = settings?.showPinsSinceMonths ?? 999;
        let cutoffDate;
        if (monthsBack < 999) {
          cutoffDate = new Date();
          cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);
        }

        channelRef.current = supabase
          .channel('public:pins')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pins' }, (payload) => {
            const row = payload?.new;
            const k = keyFor(row);
            if (!k) return;
            if (seen.current.has(k)) return;
            if (newest.current && row.created_at <= newest.current) {
              seen.current.add(k);
              return;
            }
            // Filter by date if configured
            if (cutoffDate && row.created_at < cutoffDate.toISOString()) {
              seen.current.add(k);
              return;
            }
            bumpNewest(row);
            setPins((prev) => mergeRows(prev, [row]));
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pins' }, (payload) => {
            const row = payload?.new;
            const k = keyFor(row);
            if (!k) return;
            // Filter by date if configured
            if (cutoffDate && row.created_at < cutoffDate.toISOString()) {
              return;
            }
            setPins((prev) => mergeRows(prev, [row]));
          })
          .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pins' }, (payload) => {
            const oldRow = payload?.old;
            const k = keyFor(oldRow);
            if (!k) return;
            setPins((prev) => removeByKey(prev, k));
          })
          .subscribe();
      } catch {
        // noop if mock client or realtime unavailable
      }
    };

    load();
    return () => {
      cancelled = true;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [mainMapRef, settings?.showPinsSinceMonths]);

  // Poll for new rows
  useEffect(() => {
    let timer;
    let stopped = false;

    const schedule = (ms) => {
      timer = setTimeout(poll, ms);
    };

    async function poll() {
      if (stopped) return schedule(5000);
      if (document.hidden) return schedule(15000);
      if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) {
        return schedule(8000);
      }

      try {
        let q = supabase
          .from('pins')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (newest.current) q = q.gt('created_at', newest.current);

        // Apply date filtering based on admin settings
        const monthsBack = settings?.showPinsSinceMonths ?? 999;
        if (monthsBack < 999) {
          const cutoffDate = new Date();
          cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);
          q = q.gte('created_at', cutoffDate.toISOString());
        }

        const { data, error } = await q;
        if (!error && Array.isArray(data) && data.length) {
          bumpNewest(data);
          setPins((prev) => mergeRows(prev, data));
        }
      } catch {
        // network hiccup
      } finally {
        schedule(document.hidden ? 15000 : 3000);
      }
    }

    const onVis = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        poll();
      }
    };
    const onOnline = () => {
      clearTimeout(timer);
      poll();
      // Sync offline queue
      syncOfflineQueue();
    };
    const onOffline = () => {};

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    poll();

    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [mainMapRef]);

  // Offline queuing for pin saves
  const addPin = async (pin) => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      offlineQueue.current.push(pin);
      localStorage.setItem('pin-queue', JSON.stringify(offlineQueue.current));
      setPins((prev) => mergeRows(prev, [pin]));
      return pin;
    }
    try {
      const { data, error } = await supabase.from('pins').insert([pin]).select();
      if (error) throw error;
      const inserted = data?.[0] || pin;
      setPins((prev) => mergeRows(prev, [inserted]));
      return inserted;
    } catch (err) {
      console.error('Pin save failed:', err);
      offlineQueue.current.push(pin);
      localStorage.setItem('pin-queue', JSON.stringify(offlineQueue.current));
      setPins((prev) => mergeRows(prev, [pin]));
      return pin;
    }
  };

  // Sync offline queue when back online
  const syncOfflineQueue = async () => {
    if (offlineQueue.current.length === 0) return;
    const queue = [...offlineQueue.current];
    offlineQueue.current = [];
    localStorage.setItem('pin-queue', JSON.stringify(offlineQueue.current));
    for (const pin of queue) {
      try {
        const { data, error } = await supabase.from('pins').insert([pin]).select();
        if (error) throw error;
        setPins((prev) => mergeRows(prev, [data?.[0] || pin]));
      } catch (err) {
        console.error('Offline sync failed for pin:', err);
        offlineQueue.current.push(pin);
        localStorage.setItem('pin-queue', JSON.stringify(offlineQueue.current));
      }
    }
  };

  // Load offline queue on mount
  useEffect(() => {
    const queue = localStorage.getItem('pin-queue');
    if (queue) {
      offlineQueue.current = JSON.parse(queue) || [];
      if (offlineQueue.current.length > 0 && navigator.onLine) {
        syncOfflineQueue();
      }
    }
  }, []);

  const hotdogSuggestions = useMemo(() => {
    const set = new Set();
    for (const p of pins) {
      const s = (p?.hotdog || '').trim();
      if (s) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [pins]);

  return { pins, setPins: addPin, hotdogSuggestions };
}