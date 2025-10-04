// src/components/admin/InfoMessage.jsx
// Reusable info message box

export default function InfoMessage({ children, type = 'info' }) {
  const colors = {
    info: {
      bg: 'rgba(59, 130, 246, 0.1)',
      border: 'rgba(59, 130, 246, 0.3)',
      text: '#93c5fd'
    },
    warning: {
      bg: 'rgba(251, 191, 36, 0.1)',
      border: 'rgba(251, 191, 36, 0.3)',
      text: '#fcd34d'
    },
    error: {
      bg: 'rgba(239, 68, 68, 0.1)',
      border: 'rgba(239, 68, 68, 0.3)',
      text: '#fca5a5'
    },
    success: {
      bg: 'rgba(16, 185, 129, 0.1)',
      border: 'rgba(16, 185, 129, 0.3)',
      text: '#6ee7b7'
    }
  };

  const color = colors[type] || colors.info;

  return (
    <div style={{
      padding: '12px',
      background: color.bg,
      border: `1px solid ${color.border}`,
      borderRadius: 8,
      marginBottom: 12,
      fontSize: 12,
      color: color.text,
      lineHeight: 1.5
    }}>
      {children}
    </div>
  );
}
