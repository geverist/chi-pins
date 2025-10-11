// src/components/admin/tabs/SystemTab.jsx
// System management: database, tiles, multi-location, webhook

import { useState } from 'react';
import { useAdminContext } from '../hooks/useAdminContext';
import { Card, FieldRow, Toggle, TextInput, SectionGrid, s, btn } from '../SharedComponents';

export default function SystemTab({
  kioskClusters,
  kioskClustersLoading,
  dbAudit,
  dbAuditLoading,
  dbAutoFixing,
  dbAutoFixResult,
  runDatabaseAudit,
  runAutoFix,
  syncTableData,
  tileStats,
  tileStatsLoading,
  loadTileStats,
  clearTileCache,
  downloadChicagoTiles,
  downloadGlobalTiles,
  downloadMetroTiles,
  chicagoDownloading,
  globalDownloading,
  metroDownloading,
  chicagoDownloadProgress,
  globalDownloadProgress,
  metroDownloadProgress,
  sendTestEvent,
  getWebhookStatus,
  toast,
  setToast,
}) {
  const { settings, updateSetting, setSettings } = useAdminContext();
  const [systemSubtab, setSystemSubtab] = useState('database');

  return (
    <>
      {/* Subtab Navigation */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '12px 20px',
        background: 'rgba(0,0,0,0.3)',
        borderBottom: '1px solid #2a2f37',
      }}>
        <button
          onClick={() => setSystemSubtab('database')}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            background: systemSubtab === 'database' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            border: systemSubtab === 'database' ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid #2a2f37',
            color: systemSubtab === 'database' ? '#60a5fa' : '#9ca3af',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          💾 Database
        </button>
        <button
          onClick={() => setSystemSubtab('tiles')}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            background: systemSubtab === 'tiles' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            border: systemSubtab === 'tiles' ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid #2a2f37',
            color: systemSubtab === 'tiles' ? '#60a5fa' : '#9ca3af',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          🗺️ Tiles
        </button>
        <button
          onClick={() => setSystemSubtab('multiLocation')}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            background: systemSubtab === 'multiLocation' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            border: systemSubtab === 'multiLocation' ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid #2a2f37',
            color: systemSubtab === 'multiLocation' ? '#60a5fa' : '#9ca3af',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          🏢 Multi-Location
        </button>
        <button
          onClick={() => setSystemSubtab('webhook')}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            background: systemSubtab === 'webhook' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            border: systemSubtab === 'webhook' ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid #2a2f37',
            color: systemSubtab === 'webhook' ? '#60a5fa' : '#9ca3af',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          📡 Webhook
        </button>
      </div>

      {/* Multi-Location Subtab */}
      {systemSubtab === 'multiLocation' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <Card title="Kiosk Clusters & Multi-Location Management">
            <p style={s.muted}>
              Manage multi-location kiosk deployments. Group locations under a single restaurant/owner to share branding, settings, and allow customers to find other locations.
            </p>

            {kioskClustersLoading ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#9ca3af' }}>
                Loading clusters...
              </div>
            ) : kioskClusters.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: 8,
                marginTop: 16
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
                <div style={{ color: '#c4b5fd', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  No clusters configured
                </div>
                <div style={{ color: '#9ca3af', fontSize: 14, marginBottom: 12 }}>
                  Create your first kiosk cluster to manage multiple locations.
                </div>
                <div style={{
                  marginTop: 16,
                  padding: 12,
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: 6,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: '#d1d5db',
                  textAlign: 'left'
                }}>
                  <div>1. Run SQL migration: create-kiosk-clusters-table.sql</div>
                  <div>2. Add cluster via Supabase dashboard</div>
                  <div>3. Add locations to cluster</div>
                  <div>4. Use ?location=[ID] in kiosk URL</div>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                {kioskClusters.map((cluster) => (
                  <div
                    key={cluster.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 16
                    }}
                  >
                    {/* Cluster Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 16,
                      marginBottom: 16,
                      paddingBottom: 16,
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      {cluster.logo_url && (
                        <img
                          src={cluster.logo_url}
                          alt={cluster.name}
                          style={{
                            width: 60,
                            height: 60,
                            objectFit: 'contain',
                            borderRadius: 8,
                            background: 'rgba(255, 255, 255, 0.1)'
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 18,
                          fontWeight: 600,
                          color: '#f3f4f6',
                          marginBottom: 4
                        }}>
                          {cluster.name}
                        </div>
                        {cluster.description && (
                          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>
                            {cluster.description}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#9ca3af' }}>
                          {cluster.owner_name && (
                            <div>👤 {cluster.owner_name}</div>
                          )}
                          {cluster.owner_email && (
                            <div>✉️ {cluster.owner_email}</div>
                          )}
                          <div style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: cluster.primary_color || '#3b82f6',
                            color: '#fff',
                            fontSize: 11
                          }}>
                            {cluster.locations?.length || 0} location{cluster.locations?.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: cluster.active ? '#10b981' : '#ef4444',
                        fontWeight: 600
                      }}>
                        {cluster.active ? '✓ Active' : '✕ Inactive'}
                      </div>
                    </div>

                    {/* Locations List */}
                    {cluster.locations && cluster.locations.length > 0 && (
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#9ca3af',
                          marginBottom: 4
                        }}>
                          LOCATIONS
                        </div>
                        {cluster.locations
                          .sort((a, b) => a.display_order - b.display_order)
                          .map((location) => (
                            <div
                              key={location.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: 12,
                                background: 'rgba(0, 0, 0, 0.2)',
                                borderRadius: 8,
                                border: location.is_primary ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid transparent'
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontSize: 14,
                                  fontWeight: 500,
                                  color: '#f3f4f6',
                                  marginBottom: 2
                                }}>
                                  {location.location_name}
                                  {location.is_primary && (
                                    <span style={{
                                      marginLeft: 8,
                                      fontSize: 11,
                                      padding: '2px 6px',
                                      borderRadius: 3,
                                      background: 'rgba(139, 92, 246, 0.3)',
                                      color: '#c4b5fd'
                                    }}>
                                      PRIMARY
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: 12, color: '#9ca3af' }}>
                                  {location.address}
                                  {location.phone && ` • ${location.phone}`}
                                </div>
                              </div>
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-end',
                                gap: 4
                              }}>
                                <div style={{
                                  fontSize: 11,
                                  fontFamily: 'monospace',
                                  color: '#6b7280',
                                  background: 'rgba(0, 0, 0, 0.3)',
                                  padding: '2px 6px',
                                  borderRadius: 3
                                }}>
                                  ?location={location.id.slice(0, 8)}...
                                </div>
                                <div style={{
                                  fontSize: 11,
                                  color: location.active ? '#10b981' : '#ef4444'
                                }}>
                                  {location.active ? '●' : '○'} {location.active ? 'Active' : 'Inactive'}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div style={{
                      marginTop: 16,
                      padding: 12,
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#93c5fd'
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        🔗 How to use this cluster:
                      </div>
                      <div style={{ color: '#9ca3af', lineHeight: 1.5 }}>
                        Add <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 3, fontFamily: 'monospace' }}>
                          ?location=[location-id]
                        </code> to your kiosk URL to activate cluster mode with location switching.
                      </div>
                    </div>
                  </div>
                ))}

                <div style={{
                  marginTop: 20,
                  padding: 16,
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: 8
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#c4b5fd' }}>
                    📝 Manage Clusters
                  </div>
                  <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5 }}>
                    Use the Supabase dashboard to manage clusters, locations, and settings:
                    <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12 }}>
                      • <code>kiosk_clusters</code> - Business/restaurant info<br />
                      • <code>kiosk_locations</code> - Individual locations<br />
                      • <code>kiosk_location_settings</code> - Per-location config
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Database Subtab */}
      {systemSubtab === 'database' && (
        <div>
          <SectionGrid>
            <Card title="💾 Database Sync Status">
              <p style={{...s.muted, marginBottom: 16}}>
                Monitor and manage synchronization between local SQLite database and Supabase cloud database.
              </p>

              <div style={{display: 'flex', gap: 12, marginBottom: 20}}>
                <button
                  style={{...btn.primary, flex: 1}}
                  onClick={runDatabaseAudit}
                  disabled={dbAuditLoading}
                >
                  {dbAuditLoading ? '⏳ Auditing...' : '🔍 Run Audit'}
                </button>
                <button
                  style={{...btn.secondary, flex: 1}}
                  onClick={runAutoFix}
                  disabled={dbAutoFixing || !dbAudit}
                >
                  {dbAutoFixing ? '⏳ Fixing...' : '🔧 Auto-Fix All'}
                </button>
              </div>

              {!dbAudit && !dbAuditLoading && (
                <div style={{padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 14}}>
                  Click "Run Audit" to check database synchronization status
                </div>
              )}

              {dbAudit && (
                <div style={{marginTop: 20}}>
                  {/* Summary Card */}
                  <div style={{
                    background: dbAudit.summary.totalIssues === 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${dbAudit.summary.totalIssues === 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 20,
                  }}>
                    <div style={{fontSize: 18, fontWeight: 600, marginBottom: 8}}>
                      {dbAudit.summary.totalIssues === 0 ? '✅ All Systems Synced' : `⚠️ ${dbAudit.summary.totalIssues} Issues Found`}
                    </div>
                    {dbAudit.summary.totalIssues > 0 && (
                      <div style={{fontSize: 13, color: '#9ca3af'}}>
                        Critical: {dbAudit.summary.critical} • High: {dbAudit.summary.high} • Low: {dbAudit.summary.low}
                      </div>
                    )}
                    <div style={{fontSize: 11, color: '#6b7280', marginTop: 8}}>
                      Last audit: {new Date(dbAudit.timestamp).toLocaleString()}
                    </div>
                  </div>

                  {/* Table Status Cards */}
                  {Object.entries(dbAudit.tables).map(([tableName, tableAudit]) => (
                    <div key={tableName} style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid #2a2f37',
                      borderRadius: 8,
                      padding: 16,
                      marginBottom: 12,
                    }}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                        <div>
                          <div style={{fontSize: 16, fontWeight: 600}}>{tableName}</div>
                          <div style={{fontSize: 12, color: '#9ca3af', marginTop: 4}}>
                            {!tableAudit.exists && '❌ Table missing'}
                            {tableAudit.exists && tableAudit.dataSyncStatus === 'synced' && '✅ Fully synced'}
                            {tableAudit.dataSyncStatus === 'local_behind' && `⚠️ Local behind by ${tableAudit.missingCount} records`}
                            {tableAudit.dataSyncStatus === 'local_ahead' && `⚠️ Local ahead by ${tableAudit.extraCount} records`}
                            {tableAudit.dataSyncStatus === 'supabase_error' && '❌ Supabase connection error'}
                          </div>
                        </div>
                        {tableAudit.dataSyncStatus === 'local_behind' && (
                          <button
                            style={{...btn.secondary, padding: '6px 12px', fontSize: 13}}
                            onClick={() => syncTableData(tableName)}
                          >
                            Sync Now
                          </button>
                        )}
                      </div>

                      {/* Row Counts */}
                      {tableAudit.exists && tableAudit.rowCounts && (
                        <div style={{display: 'flex', gap: 16, marginTop: 12, fontSize: 13}}>
                          <div>
                            <span style={{color: '#9ca3af'}}>Local:</span>{' '}
                            <span style={{fontWeight: 600}}>{tableAudit.rowCounts.localCount}</span>
                          </div>
                          <div>
                            <span style={{color: '#9ca3af'}}>Cloud:</span>{' '}
                            <span style={{fontWeight: 600}}>{tableAudit.rowCounts.supabaseCount ?? 'N/A'}</span>
                          </div>
                          {tableAudit.rowCounts.diff !== 0 && (
                            <div>
                              <span style={{color: '#9ca3af'}}>Diff:</span>{' '}
                              <span style={{fontWeight: 600, color: tableAudit.rowCounts.diff < 0 ? '#ef4444' : '#f59e0b'}}>
                                {tableAudit.rowCounts.diff > 0 ? '+' : ''}{tableAudit.rowCounts.diff}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Schema Issues */}
                      {tableAudit.schemaIssues && tableAudit.schemaIssues.length > 0 && (
                        <div style={{marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2f37'}}>
                          <div style={{fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#f59e0b'}}>
                            Schema Issues ({tableAudit.schemaIssues.length})
                          </div>
                          {tableAudit.schemaIssues.slice(0, 5).map((issue, idx) => (
                            <div key={idx} style={{fontSize: 12, color: '#9ca3af', marginBottom: 4}}>
                              • {issue.type}: {issue.column || 'Table'}
                              {issue.severity && ` (${issue.severity})`}
                            </div>
                          ))}
                          {tableAudit.schemaIssues.length > 5 && (
                            <div style={{fontSize: 12, color: '#6b7280', marginTop: 4}}>
                              ... and {tableAudit.schemaIssues.length - 5} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Auto-Fix Result */}
                  {dbAutoFixResult && (
                    <div style={{
                      background: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: 8,
                      padding: 16,
                      marginTop: 20,
                    }}>
                      <div style={{fontSize: 16, fontWeight: 600, marginBottom: 12}}>
                        ✅ Auto-Fix Complete
                      </div>
                      <div style={{fontSize: 13, color: '#9ca3af'}}>
                        Applied {dbAutoFixResult.schemaFixes?.appliedFixes?.length || 0} schema fixes
                      </div>
                      {Object.entries(dbAutoFixResult.dataSyncs || {}).map(([table, result]) => (
                        <div key={table} style={{fontSize: 13, color: '#9ca3af', marginTop: 4}}>
                          • {table}: Synced {result.synced || 0}/{result.total || 0} records
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </SectionGrid>
        </div>
      )}

      {/* Tiles Subtab */}
      {systemSubtab === 'tiles' && (
        <div>
          <SectionGrid>
            <Card title="🗺️ Map Tile Cache">
              <p style={{...s.muted, marginBottom: 16}}>
                Manage offline map tiles. Tiles are stored in <strong>native filesystem</strong> on Android (persists across reinstalls) or IndexedDB on web (cleared on uninstall).
              </p>

              <div style={{display: 'flex', gap: 12, marginBottom: 20}}>
                <button
                  style={{...btn.primary, flex: 1}}
                  onClick={loadTileStats}
                  disabled={tileStatsLoading}
                >
                  {tileStatsLoading ? '⏳ Loading...' : '📊 Check Status'}
                </button>
                <button
                  style={{...btn.danger, flex: 1}}
                  onClick={clearTileCache}
                >
                  🗑️ Clear Cache
                </button>
              </div>

              {!tileStats && !tileStatsLoading && (
                <div style={{padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 14}}>
                  Click "Check Status" to see tile cache statistics
                </div>
              )}

              {tileStats && (
                <div>
                  {/* Storage Backend Info */}
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 20,
                  }}>
                    <div style={{fontSize: 16, fontWeight: 600, marginBottom: 8}}>
                      📦 Storage: {tileStats.storage}
                    </div>
                    <div style={{fontSize: 13, color: '#9ca3af'}}>
                      {tileStats.storage === 'Native Filesystem' && '✅ Tiles persist across app reinstalls'}
                      {tileStats.storage === 'IndexedDB' && '⚠️ Tiles are cleared when app is uninstalled (browser mode)'}
                    </div>
                    {tileStats.tileCount && tileStats.tileCount !== 'N/A' && (
                      <div style={{fontSize: 13, color: '#9ca3af', marginTop: 4}}>
                        Total cached tiles: {tileStats.tileCount}
                      </div>
                    )}
                  </div>

                  {/* Chicago Tiles */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid #2a2f37',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 12,
                  }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                      <div>
                        <div style={{fontSize: 16, fontWeight: 600}}>🏙️ Chicago Area</div>
                        <div style={{fontSize: 12, color: '#9ca3af', marginTop: 4}}>
                          {tileStats.chicago.isComplete ? '✅ Fully cached' : `⏳ ${tileStats.chicago.stats.percentCached}% complete`}
                        </div>
                        <div style={{fontSize: 11, color: '#6b7280', marginTop: 2}}>
                          Zoom 10-17 • ~{tileStats.chicago.stats.total} tiles
                        </div>
                      </div>
                      {!tileStats.chicago.isComplete && (
                        <button
                          style={{...btn.secondary, padding: '6px 12px', fontSize: 13}}
                          onClick={downloadChicagoTiles}
                          disabled={chicagoDownloading}
                        >
                          {chicagoDownloading ? '⏳ Downloading...' : 'Download'}
                        </button>
                      )}
                    </div>
                    {chicagoDownloadProgress && chicagoDownloadProgress.total > 0 && (
                      <div style={{marginTop: 12}}>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: 4,
                          height: 8,
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            background: '#3b82f6',
                            height: '100%',
                            width: `${(chicagoDownloadProgress.completed / chicagoDownloadProgress.total) * 100}%`,
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                        <div style={{fontSize: 11, color: '#9ca3af', marginTop: 4}}>
                          {chicagoDownloadProgress.completed} / {chicagoDownloadProgress.total} tiles
                          ({chicagoDownloadProgress.cached} new, {chicagoDownloadProgress.skipped} cached)
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Global Tiles */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid #2a2f37',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 12,
                  }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                      <div>
                        <div style={{fontSize: 16, fontWeight: 600}}>🌍 Global Overview</div>
                        <div style={{fontSize: 12, color: '#9ca3af', marginTop: 4}}>
                          {tileStats.global.isComplete ? '✅ Fully cached' : `⏳ ${tileStats.global.stats.percentCached}% complete`}
                        </div>
                        <div style={{fontSize: 11, color: '#6b7280', marginTop: 2}}>
                          Zoom 3-5 • {tileStats.global.stats.total} tiles • ~2MB
                        </div>
                      </div>
                      {!tileStats.global.isComplete && (
                        <button
                          style={{...btn.secondary, padding: '6px 12px', fontSize: 13}}
                          onClick={downloadGlobalTiles}
                          disabled={globalDownloading}
                        >
                          {globalDownloading ? '⏳ Downloading...' : 'Download'}
                        </button>
                      )}
                    </div>
                    {globalDownloadProgress && globalDownloadProgress.total > 0 && (
                      <div style={{marginTop: 12}}>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: 4,
                          height: 8,
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            background: '#10b981',
                            height: '100%',
                            width: `${(globalDownloadProgress.completed / globalDownloadProgress.total) * 100}%`,
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                        <div style={{fontSize: 11, color: '#9ca3af', marginTop: 4}}>
                          {globalDownloadProgress.completed} / {globalDownloadProgress.total} tiles
                          ({globalDownloadProgress.cached} new, {globalDownloadProgress.skipped} cached)
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Major Metro Tiles */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid #2a2f37',
                    borderRadius: 8,
                    padding: 16,
                  }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                      <div>
                        <div style={{fontSize: 16, fontWeight: 600}}>🌆 Major Cities (20 metros)</div>
                        <div style={{fontSize: 12, color: '#9ca3af', marginTop: 4}}>
                          {tileStats.metro.isComplete ? '✅ Fully cached' : `⏳ ${tileStats.metro.stats.percentCached}% complete`}
                        </div>
                        <div style={{fontSize: 11, color: '#6b7280', marginTop: 2}}>
                          Zoom 10-12 • ~{tileStats.metro.stats.total} tiles • ~50MB
                        </div>
                        <div style={{fontSize: 11, color: '#6b7280', marginTop: 2}}>
                          NYC, LA, London, Paris, Tokyo, Beijing, Mumbai, Dubai, São Paulo, Sydney + 10 more
                        </div>
                      </div>
                      {!tileStats.metro.isComplete && (
                        <button
                          style={{...btn.secondary, padding: '6px 12px', fontSize: 13}}
                          onClick={downloadMetroTiles}
                          disabled={metroDownloading}
                        >
                          {metroDownloading ? '⏳ Downloading...' : 'Download'}
                        </button>
                      )}
                    </div>
                    {metroDownloadProgress && metroDownloadProgress.total > 0 && (
                      <div style={{marginTop: 12}}>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: 4,
                          height: 8,
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            background: '#f59e0b',
                            height: '100%',
                            width: `${(metroDownloadProgress.completed / metroDownloadProgress.total) * 100}%`,
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                        <div style={{fontSize: 11, color: '#9ca3af', marginTop: 4}}>
                          {metroDownloadProgress.completed} / {metroDownloadProgress.total} tiles
                          ({metroDownloadProgress.cached} new, {metroDownloadProgress.skipped} cached)
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{marginTop: 16, padding: 12, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 6, fontSize: 12, color: '#9ca3af'}}>
                    💡 <strong>Tip:</strong> Download tiles once, and they persist across app reinstalls (Android only). Downloads run in background and won't block map usage.
                  </div>
                </div>
              )}
            </Card>
          </SectionGrid>
        </div>
      )}

      {/* Webhook Subtab */}
      {systemSubtab === 'webhook' && (
        <div>
          <SectionGrid>
            <Card title="📡 Console Webhook - Remote Monitoring">
              <p style={{...s.muted, marginBottom: 16}}>
                Send all console events (log, error, warn, info) to a webhook endpoint for remote monitoring.
                Perfect for watching kiosk activity from anywhere!
              </p>

              <FieldRow label="Enable Webhook">
                <Toggle
                  checked={settings.consoleWebhookEnabled || false}
                  onChange={(v) => updateSetting('consoleWebhookEnabled', v)}
                />
              </FieldRow>

              <FieldRow label="Webhook URL">
                <TextInput
                  value={settings.consoleWebhookUrl || ''}
                  onChange={(v) => updateSetting('consoleWebhookUrl', v)}
                  placeholder="https://webhook.site/your-unique-url"
                  style={{fontFamily: 'monospace', fontSize: 12}}
                />
              </FieldRow>

              <div style={{marginTop: 20, display: 'flex', gap: 12}}>
                <button
                  style={{...btn.primary, flex: 1}}
                  onClick={async () => {
                    if (!settings.consoleWebhookUrl) {
                      setToast({ title: '❌ No Webhook URL', text: 'Please set a webhook URL first' });
                      setTimeout(() => setToast(null), 3000);
                      return;
                    }

                    // Show sending toast
                    setToast({ title: '⏳ Sending...', text: 'Sending test event to webhook...' });

                    try {
                      const success = await sendTestEvent();
                      if (success) {
                        setToast({ title: '✅ Test Sent Successfully!', text: 'Check your webhook endpoint for the test event. Open browser console (F12) for details.' });
                        setTimeout(() => setToast(null), 5000);
                      } else {
                        setToast({ title: '❌ Test Failed', text: 'Check browser console (F12) for error details. The webhook URL might be unreachable.' });
                        setTimeout(() => setToast(null), 5000);
                      }
                    } catch (err) {
                      console.error('[AdminPanel] Test event error:', err);
                      setToast({ title: '❌ Test Failed', text: `Error: ${err.message}. Check console (F12) for details.` });
                      setTimeout(() => setToast(null), 5000);
                    }
                  }}
                  disabled={!settings.consoleWebhookUrl}
                >
                  🧪 Send Test Event
                </button>
                <button
                  style={{...btn.secondary, flex: 1}}
                  onClick={() => {
                    const status = getWebhookStatus();
                    setToast({
                      title: status.enabled ? '✅ Webhook Active' : '❌ Webhook Disabled',
                      text: `Queue: ${status.queueSize} events • URL: ${status.url ? status.url.substring(0, 30) + '...' : 'Not set'}`
                    });
                    setTimeout(() => setToast(null), 5000);
                  }}
                >
                  📊 Check Status
                </button>
              </div>

              {/* Error Testing Section */}
              <div style={{marginTop: 20, padding: 16, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8}}>
                <div style={{fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#ef4444'}}>
                  🧪 Test Error Capture & Autonomous Healing
                </div>
                <p style={{fontSize: 12, color: '#9ca3af', marginBottom: 12}}>
                  Trigger different error types to test the webhook → error_log → autonomous healer pipeline
                </p>
                <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                  <button
                    style={{...btn.secondary, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: 12}}
                    onClick={() => {
                      console.error('[AdminPanel TEST] 🧪 Test console.error() from admin panel');
                      console.error('[AdminPanel TEST] Error details:', {
                        type: 'manual_test',
                        source: 'admin_panel',
                        timestamp: new Date().toISOString(),
                        message: 'This is a test error triggered from the admin panel'
                      });
                      setToast({ title: '❌ Error Logged', text: 'Check webhook and error_log table in ~2s' });
                      setTimeout(() => setToast(null), 3000);
                    }}
                  >
                    1️⃣ Test console.error()
                  </button>

                  <button
                    style={{...btn.secondary, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: 12}}
                    onClick={() => {
                      setToast({ title: '💥 Triggering...', text: 'Uncaught error in 1 second' });
                      setTimeout(() => {
                        // This will trigger window.onerror
                        const undefinedVar = null;
                        undefinedVar.someMethod(); // Uncaught TypeError
                      }, 1000);
                    }}
                  >
                    2️⃣ Test Uncaught Runtime Error
                  </button>

                  <button
                    style={{...btn.secondary, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: 12}}
                    onClick={() => {
                      setToast({ title: '🚫 Triggering...', text: 'Promise rejection in 1 second' });
                      setTimeout(() => {
                        // This will trigger unhandledrejection
                        Promise.reject(new Error('[AdminPanel TEST] 🧪 Test unhandled promise rejection'));
                      }, 1000);
                    }}
                  >
                    3️⃣ Test Unhandled Promise Rejection
                  </button>

                  <div style={{marginTop: 8, padding: 8, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 4, fontSize: 11, color: '#9ca3af'}}>
                    <strong>Expected flow:</strong> Error → consoleWebhook.js → webhook-processor → error_log table → autonomous-healer (polls every 60s)
                  </div>
                </div>
              </div>

              <div style={{marginTop: 20, padding: 16, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8}}>
                <div style={{fontSize: 14, fontWeight: 600, marginBottom: 8}}>
                  📦 What Gets Monitored:
                </div>
                <ul style={{margin: 0, paddingLeft: 20, fontSize: 13, color: '#9ca3af'}}>
                  <li>Proximity detection events (approaching, ambient, stare)</li>
                  <li>Adaptive learning sessions (started, ended, outcomes)</li>
                  <li>Model training events (accuracy, session counts)</li>
                  <li>Threshold adjustments (auto-tuning)</li>
                  <li>Pin placements, errors, validations</li>
                  <li>Jukebox activity, voice commands</li>
                  <li>All console.log, console.error, console.warn, console.info</li>
                </ul>
              </div>

              <div style={{marginTop: 16, padding: 16, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 8}}>
                <div style={{fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#10b981'}}>
                  💡 Quick Setup with Webhook.site:
                </div>
                <ol style={{margin: 0, paddingLeft: 20, fontSize: 13, color: '#9ca3af'}}>
                  <li>Go to <a href="https://webhook.site" target="_blank" rel="noopener noreferrer" style={{color: '#60a5fa'}}>webhook.site</a></li>
                  <li>Copy your unique URL</li>
                  <li>Paste it above and enable the webhook</li>
                  <li>Click "Send Test Event" to verify</li>
                  <li>Watch live events stream in!</li>
                </ol>
              </div>

              {settings.consoleWebhookUrl && settings.consoleWebhookUrl.includes('webhook.site') && (
                <div style={{marginTop: 16, padding: 16, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 8}}>
                  <div style={{fontSize: 13, color: '#f59e0b'}}>
                    ⚠️ <strong>Remember:</strong> webhook.site URLs are temporary! For production, use a permanent webhook like Zapier, Discord, Slack, or your own server.
                  </div>
                </div>
              )}
            </Card>
          </SectionGrid>
        </div>
      )}
    </>
  );
}
