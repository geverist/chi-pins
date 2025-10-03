// src/components/MobilePinsList.jsx
import { useState } from 'react';
import { titleFromSlug } from '../lib/pinsUtils';

export default function MobilePinsList({ pins, onClose }) {
  const [selectedPin, setSelectedPin] = useState(null);

  return (
    <div className="mobile-pins-list">
      <div className="mobile-pins-header">
        <h2>Community Pins</h2>
        <button
          onClick={onClose}
          className="close-btn"
          aria-label="Close list view"
        >
          ✕
        </button>
      </div>

      <div className="pins-list-container">
        {pins.length === 0 ? (
          <div className="empty-state">No pins found in this area</div>
        ) : (
          pins.map((pin) => {
            const key = pin.id || pin.slug || `${pin.lat},${pin.lng}`;
            const title = pin.name?.trim() || titleFromSlug(pin.slug || '');
            const isGlobal = pin?.source === 'global';

            return (
              <div
                key={key}
                className="pin-list-item"
                onClick={() => setSelectedPin(pin)}
              >
                <div className="pin-list-item-header">
                  <span className={`pin-badge pin-${pin.team || 'other'}`}>
                    {pin.team || 'other'}
                  </span>
                  <h3>{title}</h3>
                </div>
                {pin.neighborhood && !isGlobal && (
                  <div className="pin-list-item-meta">{pin.neighborhood}</div>
                )}
                {isGlobal && pin.continent && (
                  <div className="pin-list-item-meta">📍 {pin.continent}</div>
                )}
                {pin.note && (
                  <div className="pin-list-item-note">{pin.note.slice(0, 100)}{pin.note.length > 100 ? '...' : ''}</div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal for pin details */}
      {selectedPin && (
        <div className="pin-detail-modal" onClick={() => setSelectedPin(null)}>
          <div className="pin-detail-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-btn"
              onClick={() => setSelectedPin(null)}
              aria-label="Close details"
            >
              ✕
            </button>

            <h2>{selectedPin.name?.trim() || titleFromSlug(selectedPin.slug || '')}</h2>

            <div className="pin-detail-meta">
              <span className={`pin-badge pin-${selectedPin.team || 'other'}`}>
                {selectedPin.team || 'other'}
              </span>
            </div>

            {selectedPin.source === 'global' ? (
              <>
                {selectedPin.continent && (
                  <div className="pin-detail-field">
                    <strong>Region:</strong> {selectedPin.continent}
                  </div>
                )}
              </>
            ) : (
              <>
                {selectedPin.neighborhood && (
                  <div className="pin-detail-field">
                    <strong>Neighborhood:</strong> {selectedPin.neighborhood}
                  </div>
                )}
                {selectedPin.hotdog && (
                  <div className="pin-detail-field">
                    <strong>🌭 Favorite stand:</strong> {selectedPin.hotdog}
                  </div>
                )}
              </>
            )}

            {selectedPin.note && (
              <div className="pin-detail-field">
                <strong>Note:</strong>
                <p>{selectedPin.note}</p>
              </div>
            )}

            <div className="pin-detail-id">
              ID: {titleFromSlug(selectedPin.slug || '')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
