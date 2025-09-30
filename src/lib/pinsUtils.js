// lib/pinsUtils.js
import { supabase } from './supabase'

const WORDS_A = [
  'bridgeport','bronzeville','pilsen','hydepark','logan','wicker','avondale','uptown',
  'garfield','roosevelt','depaul','northwestern','millennium','greektown','stockyards',
  'prairie','riverwalk','lakefront','boulevard','magnificent'
]
const WORDS_B = [
  'jordan','payton','ditka','sandberg','banks','sosa','addison','wacker',
  'halsted','ashland','madison','jackson','cubs','whitesox','bears','bulls',
  'blackhawks','fire','skyscraper','bean'
].map(s => s.toLowerCase())

/** Safer random int (handles no-crypto environments gracefully). */
function safeRandInt(n) {
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      return crypto.getRandomValues(new Uint32Array(1))[0] % n
    }
  } catch {}
  // Fallback
  return Math.floor(Math.random() * n)
}

export function makeChiSlug() {
  const a = WORDS_A[safeRandInt(WORDS_A.length)]
  let b = WORDS_B[safeRandInt(WORDS_B.length)]
  if (a === b) b = WORDS_B[(safeRandInt(WORDS_B.length - 1) + 1) % WORDS_B.length]
  return `${a}-${b}`
}

/** Optional helper if callers pass arbitrary text. */
export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function withSuffix(base) {
  // short, low-collision suffix without making slugs too long
  const t = (Date.now() % 0x7fffffff).toString(36)
  const r = safeRandInt(36 * 36).toString(36).padStart(2, '0')
  return `${base}-${t}${r}`
}

/**
 * Ensure uniqueness by checking Supabase.
 * - Fast path: returns on first available slug.
 * - On network/DB error: falls back to a time-based suffix so the UI never stalls.
 */
export async function ensureUniqueSlug(baseSlug, maxTries = 8) {
  let slug = baseSlug || makeChiSlug()

  for (let i = 0; i < maxTries; i++) {
    try {
      const { count, error } = await supabase
        .from('pins')
        .select('slug', { count: 'exact', head: true })
        .eq('slug', slug)

      if (!error && (count ?? 0) === 0) return slug
      // collision → try a fresh combo
      slug = makeChiSlug()
    } catch {
      // If Supabase lookup fails (offline/mock), just return a suffixed slug
      return withSuffix(baseSlug || 'pin')
    }
  }

  // Worst case: give caller a unique-enough suffix
  return withSuffix(baseSlug || 'pin')
}

export function titleFromSlug(slug) {
  if (!slug) return ''
  return slug
    .split('-')
    .map(w => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}
