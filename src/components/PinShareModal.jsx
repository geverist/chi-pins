// src/components/PinShareModal.jsx
import { useState, useEffect } from 'react';
import {
  getPinShareUrl,
  generatePinQRCode,
  getInstagramShareUrl,
  getTwitterShareUrl,
  getSMSShareUrl,
  getEmailShareUrl,
  copyPinUrlToClipboard,
} from '../lib/pinShare';
import { useAdminSettings } from '../state/useAdminSettings';

export default function PinShareModal({ open, onClose, pin, loyaltyPhone, onUpdateLoyaltyPhone, loyaltyEnabled = true }) {
  const [qrCode, setQrCode] = useState(null);
  const [shareUrl, setShareUrl] = useState('');
  const [localLoyaltyPhone, setLocalLoyaltyPhone] = useState(loyaltyPhone || '');
  const [copySuccess, setCopySuccess] = useState(false);
  const { settings: adminSettings } = useAdminSettings();

  // Sync local state with prop
  useEffect(() => {
    if (loyaltyPhone !== undefined) {
      setLocalLoyaltyPhone(loyaltyPhone);
    }
  }, [loyaltyPhone]);

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

  const loyaltyInputStyle = {
    width: '100%',
    padding: '12px',
    background: '#0f1115',
    border: '1px solid #2a2f37',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  const loyaltySectionStyle = {
    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(251, 191, 36, 0.05) 100%)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
  };

  const digitsOnly = String(localLoyaltyPhone || '').replace(/\D+/g, '');
  const phoneLooksValid = digitsOnly.length >= 10 && digitsOnly.length <= 15;

  const handleLoyaltyPhoneChange = (e) => {
    const newValue = e.target.value;
    setLocalLoyaltyPhone(newValue);
    if (onUpdateLoyaltyPhone) {
      onUpdateLoyaltyPhone(newValue);
    }
  };

  const handleCopyUrl = async () => {
    if (pin?.slug) {
      const success = await copyPinUrlToClipboard(pin.slug);
      if (success) {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    }
  };

  const handleSocialShare = (platform) => {
    if (!pin?.slug) return;

    let url;
    switch (platform) {
      case 'instagram':
        url = getInstagramShareUrl(pin.slug);
        break;
      case 'twitter':
        url = getTwitterShareUrl(pin.slug, { text: pin.name ? `Just dropped a pin for ${pin.name}! 📍` : undefined });
        break;
      case 'sms':
        url = getSMSShareUrl(pin.slug, { message: `Check out my pin at Chicago Mike's${pin.name ? ` (${pin.name})` : ''}! 📍` });
        break;
      case 'email':
        url = getEmailShareUrl(pin.slug, {
          subject: 'Check out my pin at Chicago Mike\'s!',
          body: `I dropped a pin on the map at Chicago Mike's${pin.name ? ` for ${pin.name}` : ''}! View it here:`,
        });
        break;
      default:
        return;
    }

    // Open in new window/tab (for kiosk, this will trigger the mobile device after QR scan)
    window.open(url, '_blank', 'noopener,noreferrer');
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

            {/* Loyalty Phone Section */}
            {loyaltyEnabled && (
              <div style={loyaltySectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>⭐</span>
                  <strong style={{ fontSize: 14, color: '#fbbf24' }}>Link your loyalty phone (optional)</strong>
                </div>
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="(312) 555-1234"
                  value={localLoyaltyPhone}
                  onChange={handleLoyaltyPhoneChange}
                  style={loyaltyInputStyle}
                  aria-label="Loyalty phone number"
                />
                <div style={{
                  fontSize: 13,
                  color: phoneLooksValid ? '#9AE6B4' : '#888',
                  marginTop: 8,
                  textAlign: 'center'
                }}>
                  {phoneLooksValid ? '⭐ You\'ll earn a star for linking!' : 'Enter at least 10 digits to earn a star'}
                </div>
              </div>
            )}

            <div style={instructionStyle}>
              Scan this QR code with your phone to view and share your pin! Don't forget to tag <strong>@ChicagoMikes</strong> when you post! 📍
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

            {/* Social Share Buttons Section */}
            <div style={{ marginBottom: 24 }}>
              <div style={sectionTitleStyle}>Share on Social Media</div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                marginBottom: '12px',
              }}>
                <button
                  onClick={() => handleSocialShare('instagram')}
                  style={{
                    ...buttonStyle,
                    background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
                    border: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.opacity = '1';
                  }}
                >
                  📸 Instagram
                </button>
                <button
                  onClick={() => handleSocialShare('twitter')}
                  style={{
                    ...buttonStyle,
                    background: '#1DA1F2',
                    border: '1px solid #1DA1F2',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#0c85d0';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#1DA1F2';
                  }}
                >
                  🐦 Twitter
                </button>
                <button
                  onClick={() => handleSocialShare('sms')}
                  style={{
                    ...buttonStyle,
                    background: '#25D366',
                    border: '1px solid #25D366',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#1da851';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#25D366';
                  }}
                >
                  💬 Text Message
                </button>
                <button
                  onClick={() => handleSocialShare('email')}
                  style={{
                    ...buttonStyle,
                    background: '#EA4335',
                    border: '1px solid #EA4335',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#c5362c';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#EA4335';
                  }}
                >
                  ✉️ Email
                </button>
              </div>

              {/* Copy URL Button */}
              <button
                onClick={handleCopyUrl}
                style={{
                  ...buttonStyle,
                  width: '100%',
                  background: copySuccess ? '#10b981' : '#2a2f37',
                  border: copySuccess ? '1px solid #10b981' : '1px solid #3a3f47',
                }}
                onMouseEnter={(e) => {
                  if (!copySuccess) {
                    e.target.style.background = '#3a3f47';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!copySuccess) {
                    e.target.style.background = '#2a2f37';
                  }
                }}
              >
                {copySuccess ? '✓ Copied!' : '📋 Copy Link'}
              </button>
            </div>

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
