// src/components/QRCodeWidget.jsx
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useLayoutStack } from '../hooks/useLayoutStack';

export default function QRCodeWidget({
  url = window.location.origin,
  title = "Continue Exploring on Your Phone",
  description = "Scan this QR code to view the map on your mobile device",
  enabled = true,
  exploreButtonVisible = false,
}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { layout } = useLayoutStack();

  if (!enabled || isDismissed) {
    return null;
  }

  // Position in bottom-right corner, above footer and explore button
  // Explore button is ~56px tall + spacing, so add 90px when visible
  let bottomPosition = (layout.footerHeight || 0) + 20;
  if (exploreButtonVisible) {
    bottomPosition += 90; // Extra space to avoid explore button
  }

  if (isMinimized) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: `${bottomPosition}px`,
          right: 20,
          zIndex: 800,
          pointerEvents: 'auto',
        }}
      >
        <button
          onClick={() => setIsMinimized(false)}
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.95) 0%, rgba(5,150,105,0.95) 100%)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 12,
            padding: '12px 16px',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
          }}
          title="Open QR Code"
        >
          <span style={{ fontSize: 20 }}>📱</span>
          <span>View on Phone</span>
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: `${bottomPosition}px`,
        right: 20,
        background: 'linear-gradient(135deg, rgba(16,185,129,0.95) 0%, rgba(5,150,105,0.95) 100%)',
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.2)',
        backdropFilter: 'blur(10px)',
        color: '#fff',
        minWidth: 240,
        maxWidth: 280,
        zIndex: 800,
        pointerEvents: 'auto',
      }}
    >
      {/* Header with minimize/close buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}>
        <h3 style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 20 }}>📱</span>
          <span>{title}</span>
        </h3>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setIsMinimized(true)}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(0,0,0,0.2)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0,0,0,0.4)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Minimize"
          >
            −
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(0,0,0,0.2)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.4)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Description */}
      <p style={{
        margin: '0 0 16px 0',
        fontSize: 13,
        opacity: 0.95,
        lineHeight: 1.4,
      }}>
        {description}
      </p>

      {/* QR Code */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <QRCodeSVG
          value={url}
          size={160}
          level="H"
          includeMargin={false}
          style={{ display: 'block' }}
        />
      </div>

      {/* URL display */}
      <div
        style={{
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 8,
          padding: '8px 12px',
          border: '1px solid rgba(255,255,255,0.2)',
          textAlign: 'center',
        }}
      >
        <div style={{
          fontSize: 11,
          opacity: 0.8,
          marginBottom: 4,
        }}>
          or visit:
        </div>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'monospace',
          wordBreak: 'break-all',
        }}>
          {new URL(url).hostname}
        </div>
      </div>
    </div>
  );
}
