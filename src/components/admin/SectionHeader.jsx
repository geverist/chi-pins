// src/components/admin/SectionHeader.jsx
// Reusable section header component

export default function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{
        fontSize: 16,
        fontWeight: 600,
        color: '#f3f4f6',
        marginBottom: subtitle ? 4 : 0
      }}>
        {title}
      </h3>
      {subtitle && (
        <p style={{
          fontSize: 12,
          color: '#6b7280',
          margin: 0
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
