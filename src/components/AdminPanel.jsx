// src/components/AdminPanel.jsx
// Refactored admin panel - delegates to modular tab components

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { AdminProvider } from './admin/hooks/useAdminContext'
import PinCodeModal from './PinCodeModal'
import PreviewBanner from './PreviewBanner'

// Extracted tab components
import KioskTab from './admin/tabs/KioskTab'
import AppearanceTab from './admin/tabs/AppearanceTab'
import ContentTab from './admin/tabs/ContentTab'
import FeaturesTab from './admin/tabs/FeaturesTab'
import MediaTab from './admin/tabs/MediaTab'
import SystemTab from './admin/tabs/SystemTab'

// Existing components (not refactored yet)
import AlertsTab from './AlertsTab'
import AnalyticsDashboard from './AnalyticsDashboard'
import MarketplaceAdmin from './MarketplaceAdmin'
import VoiceAgentTab from './VoiceAgentTab'
import KioskVoiceTab from './KioskVoiceTab'
import PerformanceTab from './PerformanceTab'
import VestaboardTab from './VestaboardTab'

// Shared components
import { s, tabStyles, TabBtn } from './admin/SharedComponents'

// Utilities
import { auditDatabase, autoFixDatabase, syncMissingData } from '../lib/databaseAudit'
import { getOfflineTileStorage } from '../lib/offlineTileStorage'
import { getSpotifyClient } from '../lib/spotifyClient'
import { sendTestEvent, getWebhookStatus } from '../lib/consoleWebhook'
import { useNavigationSettings } from '../hooks/useNavigationSettings'
import { useAdminSettings } from '../state/useAdminSettings'
import { ProximityMonitor } from './ProximityMonitor'

export default function AdminPanel({ open, onClose, isLayoutEditMode, setLayoutEditMode, proximityDetection }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [tab, setTab] = useState('kiosk')
  const [toast, setToast] = useState(null)

  const { settings: adminSettingsFromHook, save: saveAdminSettings } = useAdminSettings()
  const { settings: navSettingsFromHook, updateSettings: updateNavSettingsAPI } = useNavigationSettings()

  // Local state for navigation settings (saved via tabs)
  const [navSettings, setNavSettings] = useState(navSettingsFromHook)

  // Sync with hook
  useEffect(() => {
    setNavSettings(navSettingsFromHook)
  }, [navSettingsFromHook])

  // Reset authentication when panel closes
  useEffect(() => {
    if (!open) {
      setAuthenticated(false)
    }
  }, [open])

  // ESC closes
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Idle timer
  useEffect(() => {
    if (!open || !authenticated) return

    let idleTimer
    const resetIdleTimer = () => {
      clearTimeout(idleTimer)
      const timeoutSeconds = adminSettingsFromHook?.adminPanelIdleTimeout || 60
      idleTimer = setTimeout(() => {
        console.log('[AdminPanel] Idle timeout - closing admin panel')
        onClose()
      }, timeoutSeconds * 1000)
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, resetIdleTimer, { passive: true })
    })

    return () => {
      clearTimeout(idleTimer)
      events.forEach(event => {
        document.removeEventListener(event, resetIdleTimer)
      })
    }
  }, [open, authenticated, onClose, adminSettingsFromHook?.adminPanelIdleTimeout])

  // ---------- Content Tab State ----------
  const [popularSpots, setPopularSpots] = useState(() => {
    try {
      const raw = localStorage.getItem('adminPopularSpots')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  const updateSpot = (i, patch) => {
    setPopularSpots(prev => {
      const next = [...prev]
      next[i] = { ...next[i], ...patch }
      return next
    })
  }

  const removeSpot = (i) => {
    setPopularSpots(prev => prev.filter((_, idx) => idx !== i))
  }

  const addSpot = () => {
    setPopularSpots(prev => [...prev, { label: '', category: 'other', description: '' }])
  }

  // ---------- Moderation Tab State ----------
  const [pendingDeletes, setPendingDeletes] = useState(new Set())
  const [modLoading, setModLoading] = useState(false)
  const [modRows, setModRows] = useState([])
  const [search, setSearch] = useState('')

  const refreshModeration = async () => {
    setModLoading(true)
    try {
      const { data, error } = await supabase
        .from('pins')
        .select('id, slug, note, created_at')
        .ilike(search ? 'note' : 'slug', `%${search || ''}%`)
        .order('created_at', { ascending: false })
        .limit(100)
      if (!error) setModRows(data || [])
    } catch {}
    setModLoading(false)
  }

  const togglePendingDelete = (id) => {
    setPendingDeletes(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const deleteSelected = async () => {
    if (!pendingDeletes.size) return
    if (!confirm(`Delete ${pendingDeletes.size} pin(s)?`)) return
    try {
      await supabase.from('pins').delete().in('id', Array.from(pendingDeletes))
      await refreshModeration()
      setPendingDeletes(new Set())
    } catch {}
  }

  const ModerationTable = ({ rows, selected, onToggle }) => (
    <div style={{ overflowY: 'auto', maxHeight: 400 }}>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
            <th style={{ padding: 8, textAlign: 'left' }}>Select</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Slug</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Note</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={{ padding: 8 }}>
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() => onToggle(r.id)}
                />
              </td>
              <td style={{ padding: 8 }}>{r.slug}</td>
              <td style={{ padding: 8 }}>{r.note || '—'}</td>
              <td style={{ padding: 8, fontSize: 11 }}>{new Date(r.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  // ---------- System Tab State ----------
  const [dbAudit, setDbAudit] = useState(null)
  const [dbAuditLoading, setDbAuditLoading] = useState(false)
  const [dbAutoFixing, setDbAutoFixing] = useState(false)
  const [dbAutoFixResult, setDbAutoFixResult] = useState(null)
  const [kioskClusters, setKioskClusters] = useState([])
  const [kioskClustersLoading, setKioskClustersLoading] = useState(false)

  const [tileStorage] = useState(() => getOfflineTileStorage())
  const [tileStats, setTileStats] = useState(null)
  const [tileStatsLoading, setTileStatsLoading] = useState(false)
  const [chicagoDownloadProgress, setChicagoDownloadProgress] = useState(null)
  const [globalDownloadProgress, setGlobalDownloadProgress] = useState(null)
  const [metroDownloadProgress, setMetroDownloadProgress] = useState(null)
  const [chicagoDownloading, setChicagoDownloading] = useState(false)
  const [globalDownloading, setGlobalDownloading] = useState(false)
  const [metroDownloading, setMetroDownloading] = useState(false)

  // Database audit functions
  const runDatabaseAudit = async () => {
    setDbAuditLoading(true)
    try {
      const result = await auditDatabase()
      setDbAudit(result)
    } catch (err) {
      console.error('[AdminPanel] Database audit failed:', err)
    }
    setDbAuditLoading(false)
  }

  const runAutoFix = async () => {
    if (!dbAudit) return
    setDbAutoFixing(true)
    try {
      const result = await autoFixDatabase(dbAudit)
      setDbAutoFixResult(result)
      await runDatabaseAudit() // Re-audit after fix
    } catch (err) {
      console.error('[AdminPanel] Auto-fix failed:', err)
    }
    setDbAutoFixing(false)
  }

  const syncTableData = async (tableName) => {
    try {
      await syncMissingData(tableName)
      await runDatabaseAudit()
    } catch (err) {
      console.error(`[AdminPanel] Sync ${tableName} failed:`, err)
    }
  }

  // Tile functions
  const loadTileStats = async () => {
    setTileStatsLoading(true)
    try {
      const stats = await tileStorage.getStats()
      setTileStats(stats)
    } catch (err) {
      console.error('[AdminPanel] Load tile stats failed:', err)
    }
    setTileStatsLoading(false)
  }

  const clearTileCache = async () => {
    if (!confirm('Clear entire tile cache?')) return
    try {
      await tileStorage.clear()
      await loadTileStats()
    } catch (err) {
      console.error('[AdminPanel] Clear cache failed:', err)
    }
  }

  const downloadChicagoTiles = async () => {
    setChicagoDownloading(true)
    try {
      await tileStorage.downloadRegion('chicago', (progress) => {
        setChicagoDownloadProgress(progress)
      })
      await loadTileStats()
    } catch (err) {
      console.error('[AdminPanel] Download Chicago tiles failed:', err)
    }
    setChicagoDownloading(false)
  }

  const downloadGlobalTiles = async () => {
    setGlobalDownloading(true)
    try {
      await tileStorage.downloadRegion('global', (progress) => {
        setGlobalDownloadProgress(progress)
      })
      await loadTileStats()
    } catch (err) {
      console.error('[AdminPanel] Download global tiles failed:', err)
    }
    setGlobalDownloading(false)
  }

  const downloadMetroTiles = async () => {
    setMetroDownloading(true)
    try {
      await tileStorage.downloadRegion('metro', (progress) => {
        setMetroDownloadProgress(progress)
      })
      await loadTileStats()
    } catch (err) {
      console.error('[AdminPanel] Download metro tiles failed:', err)
    }
    setMetroDownloading(false)
  }

  // Load clusters when system tab opens
  useEffect(() => {
    if (tab === 'system' && open && authenticated) {
      const loadClusters = async () => {
        setKioskClustersLoading(true)
        try {
          const { data, error } = await supabase
            .from('kiosk_clusters')
            .select(`*, locations:kiosk_locations(*)`)
            .order('name', { ascending: true })
          if (!error && data) setKioskClusters(data)
        } catch (err) {
          console.error('[AdminPanel] Load clusters failed:', err)
        }
        setKioskClustersLoading(false)
      }
      loadClusters()
    }
  }, [tab, open, authenticated])

  if (!open) return null

  return (
    <>
      <PinCodeModal
        open={open && !authenticated}
        onSuccess={() => setAuthenticated(true)}
        onCancel={onClose}
        title="Admin Access"
      />

      {authenticated && (
        <AdminProvider>
          <PreviewBanner />
          <div style={s.overlay}>
            <div style={s.panel}>
              {/* Header */}
              <header style={s.header}>
                <h2 style={s.h2}>Admin Panel</h2>
                <button onClick={onClose} style={s.closeBtn}>×</button>
              </header>

              {/* Tabs Navigation */}
              <nav style={s.tabs}>
                <TabBtn active={tab === 'kiosk'} onClick={() => setTab('kiosk')}>⚙️ Kiosk</TabBtn>
                <TabBtn active={tab === 'appearance'} onClick={() => setTab('appearance')}>🎨 Appearance</TabBtn>
                <TabBtn active={tab === 'content'} onClick={() => setTab('content')}>📍 Content</TabBtn>
                <TabBtn active={tab === 'moderate'} onClick={() => setTab('moderate')}>🚫 Moderate</TabBtn>
                <TabBtn active={tab === 'features'} onClick={() => setTab('features')}>🎮 Features</TabBtn>
                <TabBtn active={tab === 'media'} onClick={() => setTab('media')}>🎵 Media</TabBtn>
                <TabBtn active={tab === 'voice'} onClick={() => setTab('voice')}>🎙️ Voice</TabBtn>
                <TabBtn active={tab === 'vestaboard'} onClick={() => setTab('vestaboard')}>📺 Vestaboard</TabBtn>
                <TabBtn active={tab === 'performance'} onClick={() => setTab('performance')}>⚡ Performance</TabBtn>
                <TabBtn active={tab === 'system'} onClick={() => setTab('system')}>💾 System</TabBtn>
                <TabBtn active={tab === 'marketplace'} onClick={() => setTab('marketplace')}>🛒 Marketplace</TabBtn>
                <TabBtn active={tab === 'alerts'} onClick={() => setTab('alerts')}>🔔 Alerts</TabBtn>
                <TabBtn active={tab === 'analytics'} onClick={() => setTab('analytics')}>📊 Analytics</TabBtn>
              </nav>

              {/* Tab Content */}
              <div style={s.body}>
                {tab === 'kiosk' && (
                  <KioskTab
                    isLayoutEditMode={isLayoutEditMode}
                    setLayoutEditMode={setLayoutEditMode}
                    onClose={onClose}
                  />
                )}

                {tab === 'appearance' && <AppearanceTab />}

                {tab === 'content' && (
                  <ContentTab
                    popularSpots={popularSpots}
                    updateSpot={updateSpot}
                    removeSpot={removeSpot}
                    addSpot={addSpot}
                  />
                )}

                {tab === 'moderate' && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 14,
                      padding: 16
                    }}>
                      <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Moderate pins</h3>
                      <p style={{ ...s.muted, marginBottom: 16 }}>
                        Select pins to delete. This is wired to Supabase.
                      </p>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
                        <input
                          style={{ flex: 1, padding: '8px 12px', background: '#0f1115', border: '1px solid #2a2f37', borderRadius: 6, color: '#f3f5f7' }}
                          placeholder="Search slug or note…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') refreshModeration() }}
                        />
                        <button
                          onClick={refreshModeration}
                          disabled={modLoading}
                          style={{
                            padding: '8px 16px',
                            background: 'rgba(59, 130, 246, 0.2)',
                            border: '1px solid rgba(59, 130, 246, 0.5)',
                            borderRadius: 6,
                            color: '#60a5fa',
                            cursor: 'pointer'
                          }}
                        >
                          {modLoading ? 'Loading…' : 'Refresh'}
                        </button>
                      </div>

                      <ModerationTable
                        rows={modRows}
                        selected={pendingDeletes}
                        onToggle={togglePendingDelete}
                      />

                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                        <button
                          onClick={deleteSelected}
                          disabled={!pendingDeletes.size}
                          style={{
                            padding: '8px 16px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.5)',
                            borderRadius: 6,
                            color: '#fca5a5',
                            cursor: pendingDeletes.size ? 'pointer' : 'not-allowed',
                            opacity: pendingDeletes.size ? 1 : 0.5
                          }}
                        >
                          Delete selected
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {tab === 'features' && (
                  <FeaturesTab
                    proximityDetection={proximityDetection}
                    navSettings={navSettings}
                    setNavSettings={setNavSettings}
                    updateNavSettingsAPI={updateNavSettingsAPI}
                    ProximityMonitor={ProximityMonitor}
                  />
                )}

                {tab === 'media' && (
                  <MediaTab getSpotifyClient={getSpotifyClient} />
                )}

                {tab === 'voice' && (
                  <>
                    <VoiceAgentTab />
                    <div style={{ marginTop: 24 }}>
                      <KioskVoiceTab />
                    </div>
                  </>
                )}

                {tab === 'vestaboard' && <VestaboardTab />}

                {tab === 'performance' && (
                  <PerformanceTab
                    settings={adminSettingsFromHook}
                    onSave={async (updates) => {
                      for (const [key, value] of Object.entries(updates)) {
                        await saveAdminSettings({ ...adminSettingsFromHook, [key]: value })
                      }
                    }}
                  />
                )}

                {tab === 'system' && (
                  <SystemTab
                    kioskClusters={kioskClusters}
                    kioskClustersLoading={kioskClustersLoading}
                    dbAudit={dbAudit}
                    dbAuditLoading={dbAuditLoading}
                    dbAutoFixing={dbAutoFixing}
                    dbAutoFixResult={dbAutoFixResult}
                    runDatabaseAudit={runDatabaseAudit}
                    runAutoFix={runAutoFix}
                    syncTableData={syncTableData}
                    tileStats={tileStats}
                    tileStatsLoading={tileStatsLoading}
                    loadTileStats={loadTileStats}
                    clearTileCache={clearTileCache}
                    downloadChicagoTiles={downloadChicagoTiles}
                    downloadGlobalTiles={downloadGlobalTiles}
                    downloadMetroTiles={downloadMetroTiles}
                    chicagoDownloading={chicagoDownloading}
                    globalDownloading={globalDownloading}
                    metroDownloading={metroDownloading}
                    chicagoDownloadProgress={chicagoDownloadProgress}
                    globalDownloadProgress={globalDownloadProgress}
                    metroDownloadProgress={metroDownloadProgress}
                    sendTestEvent={sendTestEvent}
                    getWebhookStatus={getWebhookStatus}
                    toast={toast}
                    setToast={setToast}
                  />
                )}

                {tab === 'marketplace' && (
                  <div style={{ margin: '-30px', minHeight: '100%' }}>
                    <MarketplaceAdmin />
                  </div>
                )}

                {tab === 'alerts' && <AlertsTab />}

                {tab === 'analytics' && <AnalyticsDashboard />}
              </div>
            </div>
          </div>

          {/* Toast */}
          {toast && (
            <div style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              background: 'rgba(0,0,0,0.9)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 12,
              padding: 16,
              maxWidth: 400,
              zIndex: 10001,
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{toast.title}</div>
              <div style={{ fontSize: 13, color: '#9ca3af' }}>{toast.text}</div>
            </div>
          )}
        </AdminProvider>
      )}
    </>
  )
}
