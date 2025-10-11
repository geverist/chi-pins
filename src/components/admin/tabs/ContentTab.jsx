// src/components/admin/tabs/ContentTab.jsx
// Popular spots content management

import { useAdminContext } from '../hooks/useAdminContext';
import { Card, btn, inp, s } from '../SharedComponents';

export default function ContentTab({ popularSpots, updateSpot, removeSpot, addSpot }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Card title="Popular spots (shown on Chicago map)">
        <div style={{ display: 'grid', gap: 12, maxHeight: 500, overflow: 'auto', paddingRight: 2 }}>
          {popularSpots.map((row, i) => (
            <div key={row.id ?? i} style={{ ...s.row, flexDirection: 'column', gap: 8, alignItems: 'stretch', padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={row.category}
                  onChange={(e) => updateSpot(i, { category: e.target.value })}
                  style={{ ...inp.select, flex: '0 0 140px' }}
                >
                  <option value="hotdog">🌭 Hot Dog</option>
                  <option value="beef">🥩 Italian Beef</option>
                  <option value="pizza">🍕 Pizza</option>
                  <option value="attraction">🏛️ Attraction</option>
                  <option value="other">📍 Other</option>
                </select>
                <input
                  style={{ ...inp.text, flex: 1 }}
                  value={row.label}
                  placeholder="Display label (e.g., Willis Tower)"
                  onChange={(e) => updateSpot(i, { label: e.target.value })}
                />
                <button style={btn.dangerMini} onClick={() => removeSpot(i)}>Remove</button>
              </div>
              <textarea
                style={{ ...inp.text, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
                value={row.description || ''}
                placeholder="Description / fun fact / history (e.g., Built in 1973 as Sears Tower...)"
                onChange={(e) => updateSpot(i, { description: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div>
          <button style={btn.secondary} onClick={addSpot}>+ Add spot</button>
        </div>
      </Card>
    </div>
  );
}
