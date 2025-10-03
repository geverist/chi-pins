// src/components/PinShareModal.jsx
import { useState, useEffect } from 'react';
import {
  getPinShareUrl,
  generatePinQRCode,
  copyPinUrlToClipboard,
  downloadPinQRCode,
  sharePin,
  isWebShareSupported,
  getSocialShareUrls,
} from '../lib/pinShare';

export default function PinShareModal({ open, onClose, pin }) {
  const [qrCode, setQrCode] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (open && pin?.slug) {
      setShareUrl(getPinShareUrl(pin.slug));
      generatePinQRCode(pin.slug)
        .then(setQrCode)
        .catch(err => console.error('QR generation failed:', err));
    }
  }, [open, pin?.slug]);

  const handleCopyUrl = async () => {
    const success = await copyPinUrlToClipboard(pin.slug);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    downloadPinQRCode(pin.slug);
  };

  const handleNativeShare = async () => {
    await sharePin(pin);
  };

  const handleSocialShare = (platform) => {
    const urls = getSocialShareUrls(pin);
    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

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
    padding: '24px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
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
    padding: '20px',
    borderRadius: '12px',
    display: 'grid',
    placeItems: 'center',
    marginBottom: '20px',
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

            {qrCode && (
              <div style={qrContainerStyle}>
                <img
                  src={qrCode}
                  alt="QR Code"
                  style={{ width: '200px', height: '200px', display: 'block' }}
                />
              </div>
            )}

            <div style={urlContainerStyle}>
              <div style={urlTextStyle}>{shareUrl}</div>
            </div>

            <div style={buttonGridStyle}>
              <button
                style={copySuccess ? { ...primaryButtonStyle, background: '#22c55e', border: '1px solid #22c55e' } : primaryButtonStyle}
                onClick={handleCopyUrl}
                onMouseEnter={(e) => {
                  if (!copySuccess) e.target.style.background = '#0284c7';
                }}
                onMouseLeave={(e) => {
                  if (!copySuccess) e.target.style.background = '#0ea5e9';
                }}
              >
                {copySuccess ? '✓ Copied!' : '📋 Copy Link'}
              </button>

              <button
                style={buttonStyle}
                onClick={handleDownloadQR}
                onMouseEnter={(e) => {
                  e.target.style.background = '#3a3f47';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#2a2f37';
                }}
              >
                ⬇ Download QR
              </button>
            </div>

            {isWebShareSupported() && (
              <button
                style={{ ...primaryButtonStyle, width: '100%', marginBottom: '20px' }}
                onClick={handleNativeShare}
                onMouseEnter={(e) => {
                  e.target.style.background = '#0284c7';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#0ea5e9';
                }}
              >
                📤 Share
              </button>
            )}

            <div style={sectionTitleStyle}>Share to Social</div>
            <div style={socialGridStyle}>
              <button
                style={buttonStyle}
                onClick={() => handleSocialShare('twitter')}
                onMouseEnter={(e) => {
                  e.target.style.background = '#1DA1F2';
                  e.target.style.borderColor = '#1DA1F2';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#2a2f37';
                  e.target.style.borderColor = '#3a3f47';
                }}
              >
                𝕏
              </button>

              <button
                style={buttonStyle}
                onClick={() => handleSocialShare('facebook')}
                onMouseEnter={(e) => {
                  e.target.style.background = '#1877F2';
                  e.target.style.borderColor = '#1877F2';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#2a2f37';
                  e.target.style.borderColor = '#3a3f47';
                }}
              >
                Facebook
              </button>

              <button
                style={buttonStyle}
                onClick={() => handleSocialShare('reddit')}
                onMouseEnter={(e) => {
                  e.target.style.background = '#FF4500';
                  e.target.style.borderColor = '#FF4500';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#2a2f37';
                  e.target.style.borderColor = '#3a3f47';
                }}
              >
                Reddit
              </button>

              <button
                style={buttonStyle}
                onClick={() => handleSocialShare('email')}
                onMouseEnter={(e) => {
                  e.target.style.background = '#3a3f47';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#2a2f37';
                }}
              >
                ✉ Email
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
