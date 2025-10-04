// src/components/admin/SaveButton.jsx
// Reusable save button with loading and saved states

export default function SaveButton({ onClick, isSaving, isSaved }) {
  return (
    <button
      onClick={onClick}
      disabled={isSaving}
      style={{
        padding: '10px 20px',
        fontSize: 14,
        fontWeight: 500,
        color: '#fff',
        background: isSaved ? '#10b981' : '#3b82f6',
        border: 'none',
        borderRadius: 8,
        cursor: isSaving ? 'wait' : 'pointer',
        transition: 'background 0.2s',
        opacity: isSaving ? 0.7 : 1,
      }}
    >
      {isSaving ? 'Saving...' : isSaved ? 'Saved ✓' : 'Save & Close'}
    </button>
  );
}
