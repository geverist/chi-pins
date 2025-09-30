import { jwtDecode } from 'jwt-decode'

/**
 * Parse ?table=<name>&t=<jwt> from either a URLSearchParams or a raw "?a=b" string.
 * - Defaults table to "pins"
 * - Whitelists allowed tables
 * - Drops expired tokens (exp)
 */
export function parseTableToken(input) {
  const sp = input instanceof URLSearchParams
    ? input
    : new URLSearchParams(typeof input === 'string' ? input.replace(/^\?/, '') : '')

  // table
  const rawTable = (sp.get('table') || '').trim().toLowerCase()
  const allowed = new Set(['pins']) // add more if you support them
  const table = allowed.has(rawTable) ? rawTable : 'pins'

  // token
  const token = (sp.get('t') || '').trim()
  let claims = null

  if (token) {
    try {
      const c = jwtDecode(token)
      // if exp present and in the past, treat as invalid
      if (typeof c?.exp === 'number') {
        const now = Math.floor(Date.now() / 1000)
        if (c.exp <= now) {
          return { table, token: '', claims: null }
        }
      }
      claims = c || null
    } catch {
      // ignore malformed tokens
    }
  }

  return { table, token, claims }
}
