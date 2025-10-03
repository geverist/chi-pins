// DEPRECATED: This file is now a stub.
// Slug keywords are loaded from Supabase via useSlugKeywords hook.
// This fallback list is used only when Supabase is unavailable.

// Minimal fallback for backward compatibility
const FALLBACK_KEYWORDS = [
  'Jordan', 'Pippen', 'Wrigley', 'Belmont', 'Logan Square', 'Deep Dish',
  'Italian Beef', 'Chicago Dog', 'Bean', 'Willis Tower', 'Navy Pier',
  'Cubs', 'Bears', 'Bulls', 'Sox', 'Hawks', 'Lakefront', 'Riverwalk',
]

// Deduped, trimmed, safe for display & slugging
function normalize(w) {
  return String(w || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/['']/g, "") // normalize apostrophes
}

export const WORD_BANK = Array.from(
  new Set(FALLBACK_KEYWORDS.map(normalize).filter(Boolean))
)
