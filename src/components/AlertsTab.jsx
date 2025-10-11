// src/components/AlertsTab.jsx
// Admin tab for managing kiosk alerts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AlertsTab() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    priority: 'medium',
    display_style: 'overlay',
    effect: 'slide',
    duration_seconds: 30,
    enable_tts: true,
    dismissible: true,
  });

  useEffect(() => {
    loadAlerts();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('admin-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kiosk_alerts',
        },
        () => {
          loadAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('kiosk_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('[AlertsTab] Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendAlert = async (e) => {
    e.preventDefault();

    if (!formData.message.trim()) {
      alert('Message is required');
      return;
    }

    try {
      const alert = {
        ...formData,
        active: true,
        read_count: 0,
        created_at: new Date().toISOString(),
      };

      // Set expires_at based on duration
      if (formData.duration_seconds > 0) {
        alert.expires_at = new Date(
          Date.now() + formData.duration_seconds * 1000
        ).toISOString();
      }

      const { error } = await supabase
        .from('kiosk_alerts')
        .insert(alert);

      if (error) throw error;

      // Reset form
      setFormData({
        title: '',
        message: '',
        type: 'info',
        priority: 'medium',
        display_style: 'overlay',
        effect: 'slide',
        duration_seconds: 30,
        enable_tts: true,
        dismissible: true,
      });

      alert('✅ Alert sent successfully!');
    } catch (error) {
      console.error('[AlertsTab] Failed to send alert:', error);
      alert('❌ Failed to send alert: ' + error.message);
    }
  };

  const deleteAlert = async (id) => {
    if (!confirm('Delete this alert?')) return;

    try {
      const { error } = await supabase
        .from('kiosk_alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('[AlertsTab] Failed to delete alert:', error);
      alert('Failed to delete alert');
    }
  };

  const toggleActive = async (id, currentActive) => {
    try {
      const { error } = await supabase
        .from('kiosk_alerts')
        .update({ active: !currentActive })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('[AlertsTab] Failed to toggle active:', error);
      alert('Failed to update alert');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: '#f3f4f6' }}>
        📢 Kiosk Alerts
      </h2>

      {/* Send Alert Form */}
      <form onSubmit={sendAlert} style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 24,
        marginBottom: 32,
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#f3f4f6' }}>
          Send New Alert
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Title */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: 8, color: '#9ca3af', fontSize: 14 }}>
              Title (optional)
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Welcome Home!"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#f3f4f6',
                fontSize: 16,
              }}
            />
          </div>

          {/* Message */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: 8, color: '#9ca3af', fontSize: 14 }}>
              Message *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Your shift starts in 15 minutes..."
              required
              rows={3}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#f3f4f6',
                fontSize: 16,
                resize: 'vertical',
              }}
            />
          </div>

          {/* Type */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, color: '#9ca3af', fontSize: 14 }}>
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#f3f4f6',
                fontSize: 16,
              }}
            >
              <option value="info">ℹ️ Info</option>
              <option value="employee">👤 Employee</option>
              <option value="system">⚙️ System</option>
              <option value="maintenance">🔧 Maintenance</option>
              <option value="emergency">🚨 Emergency</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, color: '#9ca3af', fontSize: 14 }}>
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#f3f4f6',
                fontSize: 16,
              }}
            >
              <option value="low">🔵 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🟠 High</option>
              <option value="urgent">🔴 Urgent</option>
            </select>
          </div>

          {/* Display Style */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, color: '#9ca3af', fontSize: 14 }}>
              Display Style
            </label>
            <select
              value={formData.display_style}
              onChange={(e) => setFormData({ ...formData, display_style: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#f3f4f6',
                fontSize: 16,
              }}
            >
              <option value="overlay">📺 Overlay (Top Banner)</option>
              <option value="scrollbar">📜 Scrollbar (Bottom Ticker)</option>
            </select>
          </div>

          {/* Effect */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, color: '#9ca3af', fontSize: 14 }}>
              Animation Effect
            </label>
            <select
              value={formData.effect}
              onChange={(e) => setFormData({ ...formData, effect: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#f3f4f6',
                fontSize: 16,
              }}
            >
              <option value="slide">⬇️ Slide</option>
              <option value="fade">💫 Fade</option>
              <option value="bounce">🎾 Bounce</option>
              <option value="shake">📳 Shake</option>
              <option value="glow">✨ Glow</option>
              <option value="none">➖ None</option>
            </select>
          </div>

          {/* Duration */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, color: '#9ca3af', fontSize: 14 }}>
              Duration (seconds)
            </label>
            <input
              type="number"
              value={formData.duration_seconds}
              onChange={(e) => setFormData({ ...formData, duration_seconds: parseInt(e.target.value) || 0 })}
              min="0"
              max="300"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#f3f4f6',
                fontSize: 16,
              }}
            />
          </div>

          {/* TTS */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f3f4f6', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.enable_tts}
                onChange={(e) => setFormData({ ...formData, enable_tts: e.target.checked })}
                style={{ width: 20, height: 20 }}
              />
              <span>🔊 Enable TTS</span>
            </label>
          </div>

          {/* Dismissible */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f3f4f6', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.dismissible}
                onChange={(e) => setFormData({ ...formData, dismissible: e.target.checked })}
                style={{ width: 20, height: 20 }}
              />
              <span>❌ Dismissible</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          style={{
            marginTop: 24,
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          📤 Send Alert
        </button>
      </form>

      {/* Alert History */}
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#f3f4f6' }}>
        Recent Alerts
      </h3>

      {loading ? (
        <div style={{ color: '#9ca3af', textAlign: 'center', padding: 40 }}>
          Loading alerts...
        </div>
      ) : alerts.length === 0 ? (
        <div style={{ color: '#9ca3af', textAlign: 'center', padding: 40 }}>
          No alerts sent yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: 16,
                opacity: alert.active ? 1 : 0.5,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  {alert.title && (
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#f3f4f6', marginBottom: 4 }}>
                      {alert.title}
                    </div>
                  )}
                  <div style={{ fontSize: 14, color: '#d1d5db', marginBottom: 8 }}>
                    {alert.message}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                    <span style={{ color: '#9ca3af' }}>{alert.type}</span>
                    <span style={{ color: '#9ca3af' }}>•</span>
                    <span style={{ color: '#9ca3af' }}>{alert.priority}</span>
                    <span style={{ color: '#9ca3af' }}>•</span>
                    <span style={{ color: '#9ca3af' }}>{alert.display_style}</span>
                    <span style={{ color: '#9ca3af' }}>•</span>
                    <span style={{ color: '#9ca3af' }}>{alert.effect}</span>
                    {alert.enable_tts && (
                      <>
                        <span style={{ color: '#9ca3af' }}>•</span>
                        <span style={{ color: '#9ca3af' }}>🔊 TTS</span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
                  <button
                    onClick={() => toggleActive(alert.id, alert.active)}
                    style={{
                      padding: '6px 12px',
                      background: alert.active ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                      border: alert.active ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(34, 197, 94, 0.5)',
                      borderRadius: 6,
                      color: alert.active ? '#fca5a5' : '#86efac',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {alert.active ? '🔴 Deactivate' : '🟢 Activate'}
                  </button>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.5)',
                      borderRadius: 6,
                      color: '#fca5a5',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>
                Created: {new Date(alert.created_at).toLocaleString()} • Reads: {alert.read_count}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
