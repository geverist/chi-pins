// src/lib/styles.js
// Shared style utilities

export const btn3d = (pressed) => ({
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid #2a2f37',
  background: pressed ? 'linear-gradient(#242a33, #1a1f26)' : 'linear-gradient(#1f242b, #171b20)',
  color: '#f4f6f8',
  boxShadow: pressed
    ? 'inset 0 2px 6px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06)'
    : '0 3px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
  transform: pressed ? 'translateY(1px)' : 'translateY(0)',
  transition: 'transform 80ms ease, box-shadow 120ms ease',
  cursor: 'pointer',
  fontSize: 14,
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
});
