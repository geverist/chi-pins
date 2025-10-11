// src/components/admin/SharedComponents.jsx
// Shared UI components and styles for admin panel

// ===== STYLES =====

export const s = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  panel: {
    width: 'min(98vw, 1200px)',
    height: '92vh',
    background: 'linear-gradient(150deg, #151b23 0%, #0f1115 100%)',
    borderRadius: 18,
    boxShadow: '0 24px 72px rgba(0,0,0,0.6)',
    border: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  h2: { margin: 0, fontSize: 18, color: '#dfe7ee', letterSpacing: 0.3 },
  closeBtn: {
    padding: 8,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    color: '#cbd6e1',
    cursor: 'pointer',
    fontSize: 20,
    lineHeight: 1
  },
  tabs: {
    padding: '4px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    gap: 4,
    overflowX: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(255,255,255,0.2) transparent',
    WebkitOverflowScrolling: 'touch'
  },
  body: {
    flex: '1 1 auto',
    padding: 12,
    overflow: 'auto'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr auto',
    gap: 8,
    alignItems: 'center'
  },
  input: {
    padding: '8px 12px',
    background: '#0f1115',
    border: '1px solid #2a2f37',
    borderRadius: 6,
    color: '#f3f5f7',
    fontSize: 14,
  },
  muted: { color: '#a7b0b8', fontSize: 13, marginTop: 4 }
};

export const tabStyles = {
  base: {
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    color: '#dfe7ee',
    cursor: 'pointer'
  },
  active: {
    background: 'rgba(56,189,248,0.14)',
    borderColor: 'rgba(56,189,248,0.5)',
    color: '#cfefff'
  }
};

export const card = {
  wrap: {
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    background: 'rgba(0,0,0,0.18)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)'
  },
  head: {
    padding: '10px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)'
  },
  title: { margin: 0, fontSize: 14, letterSpacing: 0.2, color: '#cbd6e1' },
  body: { padding: 12, display: 'grid', gap: 10 }
};

export const field = {
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    alignItems: 'center'
  },
  label: { color: '#cbd6e1', fontSize: 13 },
  control: { display: 'flex', justifyContent: 'flex-end' }
};

export const btn = {
  primary: {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid rgba(56,189,248,0.6)',
    background: 'linear-gradient(180deg, rgba(56,189,248,0.25), rgba(56,189,248,0.18))',
    color: '#dff6ff', cursor: 'pointer'
  },
  secondary: {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid rgba(148,163,184,0.4)',
    background: 'rgba(148,163,184,0.12)',
    color: '#e9eef3', cursor: 'pointer'
  },
  ghost: {
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'transparent',
    color: '#cbd6e1', cursor: 'pointer'
  },
  danger: {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid rgba(244,63,94,0.5)',
    background: 'rgba(244,63,94,0.12)',
    color: '#ffd9df', cursor: 'pointer'
  },
  dangerMini: {
    padding: '6px 8px',
    borderRadius: 8,
    border: '1px solid rgba(244,63,94,0.5)',
    background: 'rgba(244,63,94,0.12)',
    color: '#ffd9df', cursor: 'pointer'
  }
};

export const inp = {
  number: {
    width: 120,
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.18)',
    color: '#e9eef3'
  },
  text: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.18)',
    color: '#e9eef3'
  },
  select: {
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.18)',
    color: '#e9eef3'
  }
};

export const toggle = {
  base: {
    position: 'relative',
    width: 54, height: 30,
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.07)',
    cursor: 'pointer'
  },
  on: {
    background: 'rgba(56,189,248,0.25)',
    borderColor: 'rgba(56,189,248,0.7)'
  },
  off: {},
  knob: (checked) => ({
    position: 'absolute',
    top: 3, left: checked ? 28 : 3,
    width: 24, height: 24,
    borderRadius: '50%',
    background: 'linear-gradient(180deg, #ffffff, #dbeafe)',
    boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
    transition: 'left 160ms ease'
  })
};

// ===== COMPONENTS =====

export function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...tabStyles.base,
        ...(active ? tabStyles.active : {})
      }}
    >
      {children}
    </button>
  );
}

export function SectionGrid({ children }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: 12
    }}>
      {children}
    </div>
  );
}

export function Card({ title, children }) {
  return (
    <section style={card.wrap}>
      <header style={card.head}>
        <h3 style={card.title}>{title}</h3>
      </header>
      <div style={card.body}>{children}</div>
    </section>
  );
}

export function FieldRow({ label, children }) {
  return (
    <label style={field.row}>
      <div style={field.label}>{label}</div>
      <div style={field.control}>{children}</div>
    </label>
  );
}

export function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!checked)}
      style={{
        ...toggle.base,
        ...(checked ? toggle.on : toggle.off)
      }}
    >
      <span style={toggle.knob(checked)} />
    </button>
  );
}

export function NumberInput({ value, min, max, onChange }) {
  return (
    <input
      type="number"
      value={value ?? ''}
      min={min}
      max={max}
      onChange={(e) => onChange?.(Number(e.target.value))}
      style={inp.number}
    />
  );
}

export function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      style={inp.text}
    />
  );
}

export function Select({ value, onChange, options, children }) {
  if (options) {
    return (
      <select
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        style={inp.select}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      style={inp.select}
    >
      {children}
    </select>
  );
}
