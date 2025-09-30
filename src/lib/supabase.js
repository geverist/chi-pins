// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const USE_MOCK = import.meta.env.VITE_USE_SUPABASE_MOCK === '1' // optional flag

function makeMock() {
  console.warn('[Pinboard] Supabase env missing — using mock client (no network).')

  // rowsByTable keeps isolated arrays per table
  const rowsByTable = new Map()
  const listeners = [] // very lightweight "realtime" insert listeners

  const tableRows = (t) => {
    if (!rowsByTable.has(t)) rowsByTable.set(t, [])
    return rowsByTable.get(t)
  }

  const makeInserted = (rec) => ({
    id:
      (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    created_at: new Date().toISOString(),
    ...rec,
  })

  function buildQuery(table) {
    let _filters = {}
    let _gt = {}
    let _order = { col: undefined, ascending: true }
    let _limit

    const api = {
      select: async (_cols = '*', opts = {}) => {
        let data = tableRows(table).slice()

        // eq filters
        for (const [k, v] of Object.entries(_filters)) {
          data = data.filter(r => r?.[k] === v)
        }
        // gt filters
        for (const [k, v] of Object.entries(_gt)) {
          data = data.filter(r => (r?.[k]) > v)
        }
        // order
        if (_order.col) {
          const { col, ascending } = _order
          data.sort((a, b) => {
            if (a?.[col] === b?.[col]) return 0
            return (a?.[col] > b?.[col] ? 1 : -1) * (ascending === false ? -1 : 1)
          })
        }
        // limit
        if (_limit != null) data = data.slice(0, _limit)

        if (opts.head) return { data: null, count: data.length, error: null }
        return { data, error: null, count: opts.count ? data.length : null }
      },

      insert: async (recs = []) => {
        const inserted = recs.map(makeInserted)
        const arr = tableRows(table)
        for (const row of inserted) arr.unshift(row)

        // simulate realtime INSERT to any listeners
        for (const row of inserted) {
          const payload = { eventType: 'INSERT', new: row, table, schema: 'public' }
          listeners.forEach(cb => cb(payload))
        }
        return { data: inserted, error: null }
      },

      delete: async () => {
        const arr = tableRows(table)
        if (_filters.id) {
          for (let i = arr.length - 1; i >= 0; i--) {
            if (arr[i]?.id === _filters.id) arr.splice(i, 1)
          }
        }
        return { data: [], error: null }
      },

      order(col, opts = {}) { _order = { col, ascending: opts.ascending }; return api },
      limit(n) { _limit = n; return api },
      eq(col, val) { _filters[col] = val; return api },
      gt(col, val) { _gt[col] = val; return api },
    }
    return api
  }

  function channel(_name) {
    return {
      on(_event, _filter, cb) { listeners.push(cb); return this },
      subscribe() { return { unsubscribe() {} } },
    }
  }

  return {
    from(table) { return buildQuery(table) },
    channel,
    removeChannel(_chan) {},
    rpc: async (_fn, _args) => ({ data: null, error: null }),
  }
}

export const supabase =
  (URL && KEY && !USE_MOCK)
    ? createClient(URL, KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            apikey: KEY,
            Authorization: `Bearer ${KEY}`,
          },
        },
      })
    : (import.meta.env.DEV || USE_MOCK)
      ? makeMock()
      : (() => {
          const msg = '[Pinboard] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in production.'
          console.error(msg)
          throw new Error(msg)
        })()
