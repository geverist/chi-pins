// src/components/admin/tabs/AppearanceTab.jsx
// Map appearance settings: zoom levels, layers, visualization styles

import { useAdminContext } from '../hooks/useAdminContext';
import { Card, FieldRow, Toggle, NumberInput, Select, SectionGrid, inp } from '../SharedComponents';
import ContentLayoutTab from '../../ContentLayoutTab';

export default function AppearanceTab() {
  const { settings, updateSetting } = useAdminContext();

  return (
    <>
      <SectionGrid>
        <Card title="Zoom thresholds">
          <FieldRow label="Min zoom to show real pins">
            <NumberInput
              value={settings.minZoomForPins}
              min={2}
              max={20}
              onChange={(v) => updateSetting('minZoomForPins', v)}
            />
          </FieldRow>
          <FieldRow label="Cluster → Pins (zoom)">
            <NumberInput
              value={settings.clusterBubbleThreshold}
              min={2}
              max={20}
              onChange={(v) => updateSetting('clusterBubbleThreshold', v)}
            />
          </FieldRow>
          <FieldRow label="Show labels at zoom ≥">
            <NumberInput
              value={settings.showLabelsZoom}
              min={2}
              max={20}
              onChange={(v) => updateSetting('showLabelsZoom', v)}
            />
          </FieldRow>
          <FieldRow label="Max zoom">
            <NumberInput
              value={settings.maxZoom}
              min={2}
              max={20}
              onChange={(v) => updateSetting('maxZoom', v)}
            />
          </FieldRow>
        </Card>

        <Card title="Layers & style">
          <FieldRow label="Popular spots">
            <Toggle
              checked={settings.showPopularSpots}
              onChange={(v) => updateSetting('showPopularSpots', v)}
            />
          </FieldRow>
          <FieldRow label="Community pins">
            <Toggle
              checked={settings.showCommunityPins}
              onChange={(v) => updateSetting('showCommunityPins', v)}
            />
          </FieldRow>
          <FieldRow label="Global view uses bubbles">
            <Toggle
              checked={settings.enableGlobalBubbles}
              onChange={(v) => updateSetting('enableGlobalBubbles', v)}
            />
          </FieldRow>
          <FieldRow label="Low zoom visualization">
            <select
              value={settings.lowZoomVisualization || 'bubbles'}
              onChange={(e) => updateSetting('lowZoomVisualization', e.target.value)}
              style={inp.select}
            >
              <option value="bubbles">Bubbles</option>
              <option value="heatmap">Heatmap</option>
            </select>
          </FieldRow>

          {settings.lowZoomVisualization === 'heatmap' && (
            <>
              <FieldRow label={`Heatmap Radius: ${settings.heatmapRadius || 25}`}>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="1"
                  value={settings.heatmapRadius || 25}
                  onChange={(e) => updateSetting('heatmapRadius', Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                <span style={{ fontSize: 12, color: '#888', marginTop: 4, display: 'block' }}>
                  Size of heat points (10-50)
                </span>
              </FieldRow>
              <FieldRow label={`Heatmap Blur: ${settings.heatmapBlur || 15}`}>
                <input
                  type="range"
                  min="5"
                  max="35"
                  step="1"
                  value={settings.heatmapBlur || 15}
                  onChange={(e) => updateSetting('heatmapBlur', Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                <span style={{ fontSize: 12, color: '#888', marginTop: 4, display: 'block' }}>
                  Blur amount (5-35)
                </span>
              </FieldRow>
              <FieldRow label={`Heatmap Intensity: ${settings.heatmapIntensity?.toFixed(1) || 0.8}`}>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={settings.heatmapIntensity || 0.8}
                  onChange={(e) => updateSetting('heatmapIntensity', Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                <span style={{ fontSize: 12, color: '#888', marginTop: 4, display: 'block' }}>
                  Point brightness (0.1-2.0)
                </span>
              </FieldRow>
              <FieldRow label={`Heatmap Max: ${settings.heatmapMax?.toFixed(1) || 2.0}`}>
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.1"
                  value={settings.heatmapMax || 2.0}
                  onChange={(e) => updateSetting('heatmapMax', Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                <span style={{ fontSize: 12, color: '#888', marginTop: 4, display: 'block' }}>
                  Color scaling (0.5-5.0, lower = more vibrant)
                </span>
              </FieldRow>
            </>
          )}

          <FieldRow label="Label style">
            <select
              value={settings.labelStyle}
              onChange={(e) => updateSetting('labelStyle', e.target.value)}
              style={inp.select}
            >
              <option value="pill">Pill</option>
              <option value="clean">Clean</option>
            </select>
          </FieldRow>
        </Card>
      </SectionGrid>

      <ContentLayoutTab />
    </>
  );
}
