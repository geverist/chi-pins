// src/lib/styles.js
// Shared style utilities

export const btn3d = (pressed) => ({
  padding: '20px 28px',
  borderRadius: 20,
  border: '3px solid #3a4149',
  background: pressed ? 'linear-gradient(#242a33, #1a1f26)' : 'linear-gradient(#2a3038, #1f242b)',
  color: '#ffffff',
  boxShadow: pressed
    ? 'inset 0 4px 10px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.06)'
    : '0 6px 20px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.12)',
  transform: pressed ? 'translateY(3px)' : 'translateY(0)',
  transition: 'transform 80ms ease, box-shadow 120ms ease, background 120ms ease',
  cursor: 'pointer',
  fontSize: 22,
  lineHeight: 1.3,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 12,
  fontWeight: 700,
  minWidth: '140px',
  justifyContent: 'center',
});
