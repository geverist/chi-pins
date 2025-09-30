// src/hooks/useFunFacts.js
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Loads fun facts from Supabase if available; falls back to provided defaults.
 * Returns a plain object: { key -> fact }
 */
export function useFunFacts(defaults = {}) {
  const [facts, setFacts] = useState(defaults || {})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('fun_facts')
          .select('key,fact')
          .order('key', { ascending: true })
          .limit(1000)

        if (!cancelled && !error && Array.isArray(data)) {
          const obj = Object.create(null)
          for (const row of data) {
            const k = String(row.key || '').trim().toLowerCase()
            if (k) obj[k] = String(row.fact || '').trim()
          }
          if (Object.keys(obj).length) setFacts(obj)
        }
      } catch {
        // ignore and keep defaults
      }
    })()
    return () => { cancelled = true }
  }, [])

  return facts
}
