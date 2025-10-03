// src/hooks/useSlugKeywords.js
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Fallback keywords in case Supabase is unavailable
const FALLBACK_KEYWORDS = [
  'Jordan', 'Pippen', 'Wrigley', 'Belmont', 'Logan Square', 'Deep Dish',
  'Italian Beef', 'Chicago Dog', 'Bean', 'Willis Tower', 'Navy Pier',
  'Cubs', 'Bears', 'Bulls', 'Sox', 'Hawks', 'Lakefront', 'Riverwalk',
]

/**
 * Loads slug keywords from Supabase
 * Falls back to hardcoded list if unavailable
 */
export function useSlugKeywords() {
  const [keywords, setKeywords] = useState(FALLBACK_KEYWORDS)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('slug_keywords')
          .select('word')
          .limit(1000)

        if (!cancelled && !error && Array.isArray(data) && data.length > 0) {
          const words = data.map(row => row.word).filter(Boolean)
          setKeywords(words)
        }
      } catch {
        // ignore and keep fallback
      }
    })()
    return () => { cancelled = true }
  }, [])

  return keywords
}
