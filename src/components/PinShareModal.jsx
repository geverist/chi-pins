// src/components/PinShareModal.jsx
import { useState, useEffect } from 'react';
import { getPinShareUrl, generatePinQRCode } from '../lib/pinShare';
import { useAdminSettings } from '../state/useAdminSettings';

export default function PinShareModal({ open, onClose, pin }) {
  const [qrCode, setQrCode] = useState(null);
  const [shareUrl, setShareUrl] = useState('');
  const { settings: adminSettings } = useAdminSettings();

  useEffect(() => {
    if (open && pin?.slug) {
      setShareUrl(getPinShareUrl(pin.slug));
      generatePinQRCode(pin.slug, { pin })
        .then(setQrCode)
        .catch(err => console.error('QR generation failed:', err));
    }
  }, [open, pin?.slug]);

  if (!open) return null;

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(4px)',
    display: 'grid',
    placeItems: 'center',
    zIndex: 5000,
    padding: '20px',
  };

  const modalStyle = {
    background: '#1a1d23',
    border: '1px solid #2a2f37',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '450px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    textAlign: 'center',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  };

  const titleStyle = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#fff',
    margin: 0,
  };

  const closeButtonStyle = {
    background: 'transparent',
    border: 'none',
    color: '#888',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'grid',
    placeItems: 'center',
    borderRadius: '6px',
    transition: 'all 0.2s',
  };

  const qrContainerStyle = {
    background: '#fff',
    padding: '24px',
    borderRadius: '12px',
    display: 'grid',
    placeItems: 'center',
    marginBottom: '24px',
  };

  const instructionStyle = {
    fontSize: '16px',
    color: '#b0b8c0',
    marginBottom: '24px',
    lineHeight: '1.6',
  };

  const restaurantInfoStyle = {
    background: '#0f1115',
    border: '1px solid #2a2f37',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '24px',
  };

  const restaurantTitleStyle = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#888',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const linkButtonStyle = {
    display: 'block',
    width: '100%',
    background: '#2a2f37',
    border: '1px solid #3a3f47',
    color: '#fff',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const urlContainerStyle = {
    background: '#0f1115',
    border: '1px solid #2a2f37',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const urlTextStyle = {
    flex: 1,
    color: '#0ea5e9',
    fontSize: '14px',
    wordBreak: 'break-all',
    fontFamily: 'monospace',
  };

  const buttonStyle = {
    background: '#2a2f37',
    border: '1px solid #3a3f47',
    color: '#fff',
    padding: '10px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'center',
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: '#0ea5e9',
    border: '1px solid #0ea5e9',
  };

  const buttonGridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '20px',
  };

  const socialGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '8px',
  };

  const sectionTitleStyle = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#888',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const pinInfoStyle = {
    background: '#0f1115',
    border: '1px solid #2a2f37',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '20px',
  };

  const pinNameStyle = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '4px',
  };

  const pinSlugStyle = {
    fontSize: '13px',
    color: '#888',
    fontFamily: 'monospace',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>Share Pin</h2>
          <button
            style={closeButtonStyle}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.target.style.background = '#2a2f37';
              e.target.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.color = '#888';
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {pin && (
          <>
            <div style={pinInfoStyle}>
              {pin.name && <div style={pinNameStyle}>{pin.name}</div>}
              <div style={pinSlugStyle}>{pin.slug}</div>
            </div>

            <div style={instructionStyle}>
              Scan this QR code with your phone to open SMS with a link to your pin card image!
            </div>

            {qrCode && (
              <div style={qrContainerStyle}>
                <img
                  src={qrCode}
                  alt="QR Code for your pin"
                  style={{ width: '240px', height: '240px', display: 'block' }}
                />
              </div>
            )}

            {/* Restaurant Info Section */}
            {(adminSettings.restaurantYelpUrl || adminSettings.restaurantGoogleUrl || adminSettings.restaurantWebsiteUrl) && (
              <div style={restaurantInfoStyle}>
                <div style={restaurantTitleStyle}>
                  {adminSettings.restaurantName || 'Restaurant Info'}
                </div>
                {adminSettings.restaurantYelpUrl && (
                  <a
                    href={adminSettings.restaurantYelpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={linkButtonStyle}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#d32323';
                      e.target.style.borderColor = '#d32323';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#2a2f37';
                      e.target.style.borderColor = '#3a3f47';
                    }}
                  >
                    ⭐ View on Yelp
                  </a>
                )}
                {adminSettings.restaurantGoogleUrl && (
                  <a
                    href={adminSettings.restaurantGoogleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={linkButtonStyle}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#4285f4';
                      e.target.style.borderColor = '#4285f4';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#2a2f37';
                      e.target.style.borderColor = '#3a3f47';
                    }}
                  >
                    🔍 View on Google
                  </a>
                )}
                {adminSettings.restaurantWebsiteUrl && (
                  <a
                    href={adminSettings.restaurantWebsiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={linkButtonStyle}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#3a3f47';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#2a2f37';
                    }}
                  >
                    🌐 Visit Website
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
