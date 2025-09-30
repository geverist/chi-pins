// src/hooks/useAppSettings.js
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Settings live in a 'settings' table with columns:
 *   key (text, PK), value (jsonb), updated_at (timestamptz default now())
 *
 * Example rows:
 * { key:'idleTimeoutMs', value: 60000 }
 * { key:'clusterMinZoom', value: 13 }
 * { key:'labelMinZoom', value: 13 }
 * { key:'pinMonthsBack', value: 0 }  // 0 = all time
 * { key:'globalPinsMode', value:'bubbles' } // 'bubbles' | 'pins' | 'both'
 * { key:'popularSpots', value: ["Gene & Jude's","Superdawg",...]}
 * { key:'funFacts', value: { chicago:"...", evanston:"...", ... } }
 * { key:'loyaltyEnabled', value: true }
 */
const DEFAULTS = {
  idleTimeoutMs: 60000,
  clusterMinZoom: 13,
  labelMinZoom: 13,
  pinMonthsBack: 0,
  globalPinsMode: 'bubbles', // preferred default you asked for
  popularSpots: [],
  funFacts: {},
  loyaltyEnabled: true,
}

export function useAppSettings() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    const { data, error } = await supabase.from('settings').select('key, value')
    if (error) { setError(error); setLoading(false); return }
    const next = { ...DEFAULTS }
    for (const row of data || []) {
      next[row.key] = row.value
    }
    setSettings(next)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const saveOne = useCallback(async (key, value) => {
    setSaving(true); setError(null)
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value }, { onConflict: 'key' })
    if (error) setError(error)
    setSaving(false)
    setSettings(s => ({ ...s, [key]: value }))
  }, [])

  const api = useMemo(() => ({
    settings, loading, saving, error, refresh, saveOne,
  }), [settings, loading, saving, error, refresh, saveOne])

  return api
}
