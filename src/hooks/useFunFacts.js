// src/hooks/useFunFacts.js
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Loads fun facts from Supabase if available; falls back to provided defaults.
 * Now supports array values for random selection.
 * Returns a plain object: { key -> fact (or array of facts) }
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

/**
 * Get a random fun fact for a location
 * @param {object} facts - Facts object from useFunFacts
 * @param {string} key - Location key
 * @returns {string|null} - Random fact or null if not found
 */
export function getRandomFact(facts, key) {
  const fact = facts[key]
  if (!fact) return null

  // If it's an array, return a random item
  if (Array.isArray(fact)) {
    const randomIndex = Math.floor(Math.random() * fact.length)
    return fact[randomIndex]
  }

  // Otherwise return the string directly
  return fact
}
