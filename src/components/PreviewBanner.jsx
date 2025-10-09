import React from 'react'

export default function PreviewBanner({ onCommit, onDiscard }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        backgroundColor: '#f59e0b',
        color: '#fff',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        borderBottom: '3px solid #d97706',
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>⚡</span>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '2px' }}>
            Preview Mode Active
          </div>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>
            Changes are temporary and not saved yet
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onDiscard}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: '#fff',
            border: '2px solid rgba(255, 255, 255, 0.5)',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.8)'
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)'
          }}
        >
          ✕ Discard Changes
        </button>

        <button
          onClick={onCommit}
          style={{
            backgroundColor: '#10b981',
            color: '#fff',
            border: '2px solid #059669',
            padding: '10px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#059669'
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = '#10b981'
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          ✓ Commit Changes
        </button>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
