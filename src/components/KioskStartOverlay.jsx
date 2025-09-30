// src/components/KioskStartOverlay.jsx
export default function KioskStartOverlay({ visible, onStart }) {
  if (!visible) return null;
  return (
    <div
      className="kiosk-overlay"
      style={{
        position: 'fixed', inset: 0, zIndex: 5000,
        display: 'grid', placeItems: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}
    >
      <button
        onClick={onStart}
        className="btn-toggle"
        style={{ fontSize: 18, padding: '16px 22px' }}
      >
        Start Kiosk
      </button>
    </div>
  );
}
