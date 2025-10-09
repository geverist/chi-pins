// src/components/LayoutEditor.jsx
import { useState, useCallback } from 'react';
import { useAdminSettings } from '../state/useAdminSettings';

/**
 * LayoutEditor - Admin panel for customizing UI element positions
 *
 * Features:
 * - Toggle layout editor mode
 * - Preview mode switcher (desktop/mobile)
 * - Save/reset positions
 * - Visual grid overlay
 * - Element list with visibility toggles
 */
export default function LayoutEditor() {
  const { settings: adminSettings, save } = useAdminSettings();
  const [editorActive, setEditorActive] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop'); // 'desktop' | 'mobile'
  const [showGrid, setShowGrid] = useState(true);

  const handleToggleEditor = useCallback(() => {
    const newState = !editorActive;
    setEditorActive(newState);

    // Save layout editor enabled state
    save({ layoutEditorEnabled: newState });
  }, [editorActive, save]);

  const handleSavePosition = useCallback((elementId, position) => {
    const currentPositions = adminSettings.uiPositions || { desktop: {}, mobile: {} };
    const deviceKey = previewMode;

    const updatedPositions = {
      ...currentPositions,
      [deviceKey]: {
        ...currentPositions[deviceKey],
        [elementId]: position,
      },
    };

    save({ uiPositions: updatedPositions });
    console.log(`[LayoutEditor] Saved position for ${elementId} on ${deviceKey}:`, position);
  }, [adminSettings.uiPositions, previewMode, save]);

  const handleResetPositions = useCallback(() => {
    if (!confirm('Reset all UI positions to default? This cannot be undone.')) {
      return;
    }

    save({
      uiPositions: {
        desktop: {},
        mobile: {},
      },
    });

    console.log('[LayoutEditor] Reset all positions to default');
  }, [save]);

  const handleResetDevice = useCallback(() => {
    if (!confirm(`Reset ${previewMode} UI positions to default?`)) {
      return;
    }

    const currentPositions = adminSettings.uiPositions || { desktop: {}, mobile: {} };
    const updatedPositions = {
      ...currentPositions,
      [previewMode]: {},
    };

    save({ uiPositions: updatedPositions });
    console.log(`[LayoutEditor] Reset ${previewMode} positions to default`);
  }, [adminSettings.uiPositions, previewMode, save]);

  // Export positions as JSON
  const handleExportPositions = useCallback(() => {
    const positions = adminSettings.uiPositions || { desktop: {}, mobile: {} };
    const dataStr = JSON.stringify(positions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `ui-positions-${new Date().toISOString().slice(0, 10)}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [adminSettings.uiPositions]);

  // Import positions from JSON
  const handleImportPositions = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const positions = JSON.parse(event.target.result);
          save({ uiPositions: positions });
          console.log('[LayoutEditor] Imported positions:', positions);
          alert('Positions imported successfully!');
        } catch (error) {
          console.error('[LayoutEditor] Import error:', error);
          alert('Failed to import positions. Invalid JSON file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [save]);

  return (
    <div className="admin-section">
      <h3 style={{ marginBottom: 16, fontSize: 18 }}>UI Layout Editor</h3>

      {/* Editor Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          onClick={handleToggleEditor}
          className={editorActive ? 'btn-toggle is-on' : 'btn-toggle'}
          style={{
            background: editorActive ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#20232a',
            color: 'white',
            padding: '12px 24px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {editorActive ? '✓ Editor Active' : 'Activate Layout Editor'}
        </button>

        {editorActive && (
          <>
            {/* Preview Mode Switcher */}
            <div style={{ display: 'flex', gap: 8, background: '#16181d', borderRadius: 8, padding: 4 }}>
              <button
                onClick={() => setPreviewMode('desktop')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: previewMode === 'desktop' ? '#667eea' : 'transparent',
                  color: previewMode === 'desktop' ? 'white' : '#a7b0b8',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                🖥️ Desktop
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: previewMode === 'mobile' ? '#667eea' : 'transparent',
                  color: previewMode === 'mobile' ? 'white' : '#a7b0b8',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                📱 Mobile
              </button>
            </div>

            {/* Grid Toggle */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid #2a2f37',
                background: showGrid ? '#667eea' : '#20232a',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              {showGrid ? '✓' : '○'} Grid
            </button>
          </>
        )}
      </div>

      {/* Action Buttons */}
      {editorActive && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <button
            onClick={handleResetDevice}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #2a2f37',
              background: '#20232a',
              color: '#f4f6f8',
              cursor: 'pointer',
            }}
          >
            Reset {previewMode === 'desktop' ? 'Desktop' : 'Mobile'}
          </button>
          <button
            onClick={handleResetPositions}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #dc2626',
              background: '#7f1d1d',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Reset All Positions
          </button>
          <button
            onClick={handleExportPositions}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #2a2f37',
              background: '#20232a',
              color: '#f4f6f8',
              cursor: 'pointer',
            }}
          >
            📥 Export
          </button>
          <button
            onClick={handleImportPositions}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #2a2f37',
              background: '#20232a',
              color: '#f4f6f8',
              cursor: 'pointer',
            }}
          >
            📤 Import
          </button>
        </div>
      )}

      {/* Instructions */}
      {editorActive ? (
        <div
          style={{
            background: 'rgba(102, 126, 234, 0.1)',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <p style={{ margin: 0, marginBottom: 8, fontWeight: 600, color: '#667eea' }}>
            ✨ Layout Editor Active
          </p>
          <ul style={{ margin: 0, paddingLeft: 20, color: '#a7b0b8', fontSize: 14 }}>
            <li>Navigate to the main map view to see draggable UI elements</li>
            <li>Elements have dashed borders and labels when draggable</li>
            <li>Drag elements to reposition them on the screen</li>
            <li>Positions are saved automatically when you release</li>
            <li>Switch between Desktop and Mobile to customize each layout</li>
            <li>Use the grid overlay for precise alignment</li>
          </ul>
        </div>
      ) : (
        <div style={{ color: '#a7b0b8', fontSize: 14, marginBottom: 16 }}>
          Activate the layout editor to customize the position of UI elements on your kiosk screen.
          You can set different positions for desktop and mobile views.
        </div>
      )}

      {/* Current Positions Summary */}
      {editorActive && (
        <div style={{ marginTop: 16 }}>
          <h4 style={{ marginBottom: 12, fontSize: 14, color: '#a7b0b8', textTransform: 'uppercase' }}>
            {previewMode === 'desktop' ? 'Desktop' : 'Mobile'} Positions
          </h4>
          <div
            style={{
              background: '#16181d',
              border: '1px solid #2a2f37',
              borderRadius: 8,
              padding: 12,
              maxHeight: 200,
              overflow: 'auto',
            }}
          >
            {Object.entries(adminSettings.uiPositions?.[previewMode] || {}).length > 0 ? (
              <pre style={{ margin: 0, fontSize: 12, color: '#f4f6f8', fontFamily: 'monospace' }}>
                {JSON.stringify(adminSettings.uiPositions[previewMode], null, 2)}
              </pre>
            ) : (
              <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
                No custom positions set. Using defaults.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Grid Overlay (rendered globally when active) */}
      {editorActive && showGrid && <GridOverlay />}
    </div>
  );
}

// Grid overlay component
function GridOverlay() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        backgroundImage: `
          linear-gradient(rgba(102, 126, 234, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(102, 126, 234, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
      }}
    />
  );
}
