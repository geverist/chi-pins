// src/components/MobilePinsTable.jsx
import { useState } from 'react';

export default function MobilePinsTable({ pins, onPinClick }) {
  const [selectedPin, setSelectedPin] = useState(null);

  // Sort pins by created_at descending (most recent first)
  const sortedPins = [...pins].sort((a, b) => {
    const dateA = new Date(a.created_at || 0);
    const dateB = new Date(b.created_at || 0);
    return dateB - dateA;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleRowClick = (pin) => {
    setSelectedPin(selectedPin?.id === pin.id ? null : pin);
    if (onPinClick) onPinClick(pin);
  };

  return (
    <div
      style={{
        height: '100%',
        overflow: 'auto',
        background: '#0f1117',
      }}
    >
      {/* Table Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: 'linear-gradient(135deg, #1a1f26 0%, #242a33 100%)',
          borderBottom: '2px solid #2a2f37',
          padding: '12px 16px',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 12,
          fontSize: 12,
          fontWeight: 700,
          color: '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          zIndex: 10,
        }}
      >
        <div>Pin Details</div>
        <div>Date</div>
      </div>

      {/* Rows */}
      {sortedPins.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: '#6b7280',
            fontSize: 14,
          }}
        >
          No pins to display
        </div>
      ) : (
        sortedPins.map((pin) => (
          <div
            key={pin.id}
            onClick={() => handleRowClick(pin)}
            style={{
              borderBottom: '1px solid #1f242b',
              padding: '12px 16px',
              cursor: 'pointer',
              transition: 'background 0.2s',
              background: selectedPin?.id === pin.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (selectedPin?.id !== pin.id) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedPin?.id !== pin.id) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {/* Collapsed View */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#f3f4f6',
                    marginBottom: 4,
                  }}
                >
                  {pin.name || pin.slug || 'Unnamed Pin'}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#9ca3af',
                  }}
                >
                  {pin.neighborhood || pin.continent || 'Unknown location'}
                  {pin.team && ` • ${pin.team}`}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: '#6b7280',
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatDate(pin.created_at)}
              </div>
            </div>

            {/* Expanded View */}
            {selectedPin?.id === pin.id && (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '1px solid #2a2f37',
                }}
              >
                {pin.note && (
                  <div style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#9ca3af',
                        marginBottom: 4,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Note
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#e5e7eb',
                        lineHeight: 1.5,
                      }}
                    >
                      {pin.note}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                    fontSize: 12,
                  }}
                >
                  {pin.hotdog && (
                    <div>
                      <div style={{ color: '#9ca3af', marginBottom: 2 }}>Hot Dog</div>
                      <div style={{ color: '#f3f4f6' }}>{pin.hotdog}</div>
                    </div>
                  )}
                  {pin.lat && pin.lng && (
                    <div>
                      <div style={{ color: '#9ca3af', marginBottom: 2 }}>Coordinates</div>
                      <div style={{ color: '#f3f4f6', fontSize: 11 }}>
                        {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
