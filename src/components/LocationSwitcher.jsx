// src/components/LocationSwitcher.jsx
import { useState } from 'react';
import { useKioskCluster } from '../hooks/useKioskCluster';

export default function LocationSwitcher() {
  const {
    cluster,
    currentLocation,
    otherLocations,
    settings,
    isClusterMode,
    getLocationsByDistance,
    switchLocation
  } = useKioskCluster();

  const [expanded, setExpanded] = useState(false);

  // Don't show if not in cluster mode or if disabled in settings
  if (!isClusterMode || settings?.show_other_locations === false) {
    return null;
  }

  const locationsByDistance = getLocationsByDistance();

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          position: 'fixed',
          bottom: 200, // Above mobile nav menu
          left: 16,
          padding: '12px 16px',
          background: cluster?.primary_color || 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          border: 'none',
          borderRadius: 12,
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          zIndex: 9000,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          transition: 'all 0.3s ease'
        }}
      >
        <span style={{ fontSize: 18 }}>🏪</span>
        <span>Other Locations</span>
        {otherLocations.length > 0 && (
          <span style={{
            background: 'rgba(255,255,255,0.3)',
            borderRadius: '50%',
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12
          }}>
            {otherLocations.length}
          </span>
        )}
      </button>

      {/* Expanded Modal */}
      {expanded && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setExpanded(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(4px)',
              zIndex: 9998
            }}
          />

          {/* Modal */}
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: '80vh',
              background: 'linear-gradient(135deg, #1a1f26 0%, #242a33 100%)',
              borderRadius: '20px 20px 0 0',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 4
                }}>
                  {cluster?.logo_url && (
                    <img
                      src={cluster.logo_url}
                      alt={cluster.name}
                      style={{
                        width: 40,
                        height: 40,
                        objectFit: 'contain',
                        borderRadius: 8
                      }}
                    />
                  )}
                  <h3 style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 600,
                    color: '#f4f6f8'
                  }}>
                    {cluster?.name}
                  </h3>
                </div>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  color: '#9ca3af'
                }}>
                  Choose a location
                </p>
              </div>
              <button
                onClick={() => setExpanded(false)}
                style={{
                  background: 'rgba(239,68,68,0.2)',
                  border: '1px solid rgba(239,68,68,0.5)',
                  borderRadius: 12,
                  padding: '8px 16px',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Current Location */}
            <div style={{
              padding: '16px 20px',
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              margin: '16px 20px 0',
              borderRadius: 12
            }}>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#c4b5fd',
                marginBottom: 4
              }}>
                CURRENT LOCATION
              </div>
              <div style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#f4f6f8',
                marginBottom: 2
              }}>
                {currentLocation?.location_name}
              </div>
              <div style={{
                fontSize: 13,
                color: '#9ca3af'
              }}>
                {currentLocation?.address}
              </div>
            </div>

            {/* Other Locations List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px 20px'
            }}>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#9ca3af',
                marginBottom: 12
              }}>
                OTHER LOCATIONS
              </div>

              {locationsByDistance.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#6b7280'
                }}>
                  No other locations available
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {locationsByDistance.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => {
                        switchLocation(location.id);
                        setExpanded(false);
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        padding: 16,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.borderColor = cluster?.primary_color || 'rgba(139, 92, 246, 0.5)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: '#f4f6f8',
                          marginBottom: 4
                        }}>
                          {location.location_name}
                        </div>
                        <div style={{
                          fontSize: 13,
                          color: '#9ca3af',
                          marginBottom: 4
                        }}>
                          {location.address}
                        </div>
                        {location.phone && (
                          <div style={{
                            fontSize: 12,
                            color: '#6b7280'
                          }}>
                            📞 {location.phone}
                          </div>
                        )}
                      </div>

                      {settings?.show_distance && location.distance && (
                        <div style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: cluster?.primary_color || '#8b5cf6',
                          marginLeft: 16,
                          textAlign: 'right'
                        }}>
                          {location.distance} mi
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
