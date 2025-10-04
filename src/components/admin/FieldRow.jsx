// src/components/admin/FieldRow.jsx
// Reusable form field row component

export default function FieldRow({ label, children, style = {} }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '140px 1fr',
      gap: 12,
      alignItems: 'center',
      marginBottom: 12,
      ...style
    }}>
      <label style={{ fontSize: 13, color: '#9ca3af', textAlign: 'right' }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  );
}
