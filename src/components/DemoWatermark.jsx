// src/components/DemoWatermark.jsx
import { getDemoWatermark } from '../lib/demoMode';

export default function DemoWatermark() {
  const watermark = getDemoWatermark();

  if (!watermark) return null;

  return (
    <div style={watermark.style}>
      {watermark.text}
      <span style={{ marginLeft: '16px', fontSize: '12px', opacity: 0.9 }}>
        📹 This is a sales demo - No real data will be affected
      </span>
    </div>
  );
}
