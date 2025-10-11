// src/components/AlertNotification.jsx
// Prominent alert notification system for admin-to-kiosk messaging
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AlertNotification() {
  const [alerts, setAlerts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  useEffect(() => {
    // Load active alerts on mount
    loadAlerts();

    // Subscribe to new alerts in real-time
    const channel = supabase
      .channel('kiosk-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'kiosk_alerts',
        },
        (payload) => {
          console.log('[AlertNotification] New alert received:', payload.new);
          setAlerts(prev => [payload.new, ...prev]);
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
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('[AlertNotification] Loaded alerts:', data);
      setAlerts(data || []);
    } catch (error) {
      console.error('[AlertNotification] Failed to load alerts:', error);
    }
  };

  const dismissAlert = async (alertId) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));

    // Optionally mark as read in database
    try {
      await supabase
        .from('kiosk_alerts')
        .update({ read_count: supabase.raw('read_count + 1') })
        .eq('id', alertId);
    } catch (error) {
      console.error('[AlertNotification] Failed to update alert:', error);
    }
  };

  const activeAlerts = alerts.filter(
    alert => alert.active && !dismissedAlerts.has(alert.id)
  );

  if (activeAlerts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 99999,
      pointerEvents: 'none',
    }}>
      {activeAlerts.map((alert, index) => {
        const priorityStyles = {
          low: {
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(37, 99, 235, 0.95) 100%)',
            border: '2px solid rgba(96, 165, 250, 0.5)',
          },
          medium: {
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.95) 0%, rgba(217, 119, 6, 0.95) 100%)',
            border: '2px solid rgba(251, 191, 36, 0.5)',
          },
          high: {
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.95) 100%)',
            border: '2px solid rgba(252, 165, 165, 0.5)',
          },
          urgent: {
            background: 'linear-gradient(135deg, rgba(153, 27, 27, 0.98) 0%, rgba(127, 29, 29, 0.98) 100%)',
            border: '3px solid rgba(239, 68, 68, 0.8)',
            boxShadow: '0 8px 32px rgba(239, 68, 68, 0.4), 0 0 60px rgba(239, 68, 68, 0.3)',
            animation: 'pulse 2s infinite',
          },
        };

        const style = priorityStyles[alert.priority] || priorityStyles.medium;

        return (
          <div
            key={alert.id}
            style={{
              ...style,
              margin: '12px',
              marginTop: index === 0 ? '12px' : '0',
              padding: '20px 24px',
              borderRadius: '16px',
              color: 'white',
              fontSize: '18px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              pointerEvents: 'auto',
              transition: 'all 0.3s ease',
            }}
          >
            {/* Icon based on type */}
            <div style={{
              fontSize: '32px',
              flexShrink: 0,
            }}>
              {alert.type === 'employee' && '👤'}
              {alert.type === 'system' && '⚙️'}
              {alert.type === 'maintenance' && '🔧'}
              {alert.type === 'emergency' && '🚨'}
              {alert.type === 'info' && 'ℹ️'}
              {!['employee', 'system', 'maintenance', 'emergency', 'info'].includes(alert.type) && '📢'}
            </div>

            {/* Message */}
            <div style={{ flex: 1 }}>
              {alert.title && (
                <div style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  marginBottom: '4px',
                }}>
                  {alert.title}
                </div>
              )}
              <div style={{
                fontSize: '16px',
                fontWeight: 500,
                lineHeight: 1.4,
              }}>
                {alert.message}
              </div>
              {alert.action_text && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '14px',
                  opacity: 0.9,
                }}>
                  → {alert.action_text}
                </div>
              )}
            </div>

            {/* Dismiss button (if dismissible) */}
            {alert.dismissible !== false && (
              <button
                onClick={() => dismissAlert(alert.id)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  background: 'rgba(0,0,0,0.2)',
                  color: 'white',
                  fontSize: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(0,0,0,0.4)';
                  e.target.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(0,0,0,0.2)';
                  e.target.style.transform = 'scale(1)';
                }}
                aria-label="Dismiss alert"
              >
                ×
              </button>
            )}

            {/* Auto-dismiss timer (if expires_at is set) */}
            {alert.expires_at && (
              <AutoDismissTimer
                expiresAt={alert.expires_at}
                onExpire={() => dismissAlert(alert.id)}
              />
            )}
          </div>
        );
      })}

      {/* Pulse animation for urgent alerts */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.95;
            transform: scale(1.01);
          }
        }
      `}</style>
    </div>
  );
}

// Auto-dismiss timer component
function AutoDismissTimer({ expiresAt, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const expires = new Date(expiresAt);
      const diff = expires - now;

      if (diff <= 0) {
        onExpire();
        return 0;
      }

      return Math.floor(diff / 1000); // seconds
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (timeLeft === null || timeLeft <= 0) return null;

  return (
    <div style={{
      fontSize: '12px',
      opacity: 0.8,
      whiteSpace: 'nowrap',
    }}>
      {timeLeft > 60 ? `${Math.floor(timeLeft / 60)}m` : `${timeLeft}s`}
    </div>
  );
}
