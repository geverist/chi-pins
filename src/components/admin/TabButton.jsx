// src/components/admin/TabButton.jsx
// Reusable tab button component

export default function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 16px',
        fontSize: 13,
        fontWeight: 500,
        color: active ? '#3b82f6' : '#9ca3af',
        background: active ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
        cursor: 'pointer',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}
