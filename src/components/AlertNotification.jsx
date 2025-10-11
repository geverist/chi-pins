// src/components/AlertNotification.jsx
// Prominent alert notification system for admin-to-kiosk messaging
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { speak, shouldUseElevenLabs, getElevenLabsOptions } from '../lib/elevenlabs';
import { useAdminSettings } from '../state/useAdminSettings';

export default function AlertNotification() {
  const [alerts, setAlerts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
  const spokenAlertsRef = useRef(new Set()); // Track which alerts have been spoken
  const { settings: adminSettings } = useAdminSettings();

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

  // TTS: Speak new alerts when they arrive
  useEffect(() => {
    if (!adminSettings || !shouldUseElevenLabs(adminSettings)) {
      return; // TTS not enabled or configured
    }

    const speakNewAlerts = async () => {
      for (const alert of alerts) {
        // Skip if already spoken, dismissed, or TTS disabled for this alert
        if (
          spokenAlertsRef.current.has(alert.id) ||
          dismissedAlerts.has(alert.id) ||
          alert.enable_tts === false
        ) {
          continue;
        }

        // Mark as spoken immediately to prevent duplicates
        spokenAlertsRef.current.add(alert.id);

        // Build text to speak: title + message
        const textToSpeak = alert.title
          ? `${alert.title}. ${alert.message}`
          : alert.message;

        console.log('[AlertNotification] Speaking alert:', alert.id, textToSpeak);

        try {
          await speak(textToSpeak, getElevenLabsOptions(adminSettings));
          console.log('[AlertNotification] TTS completed for alert:', alert.id);
        } catch (error) {
          console.error('[AlertNotification] TTS failed for alert:', alert.id, error);
        }
      }
    };

    speakNewAlerts();
  }, [alerts, adminSettings, dismissedAlerts]);

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

  // Separate alerts by display style
  const overlayAlerts = activeAlerts.filter(alert => alert.display_style !== 'scrollbar');
  const scrollbarAlerts = activeAlerts.filter(alert => alert.display_style === 'scrollbar');

  if (activeAlerts.length === 0) return null;

  return (
    <>
      {/* Scrollbar/Ticker alerts - bottom of screen */}
      {scrollbarAlerts.length > 0 && (
        <ScrollbarAlerts
          alerts={scrollbarAlerts}
          dismissAlert={dismissAlert}
        />
      )}

      {/* Overlay alerts - top of screen */}
      {overlayAlerts.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          pointerEvents: 'none',
        }}>
          {overlayAlerts.map((alert, index) => {
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
          },
        };

        const style = priorityStyles[alert.priority] || priorityStyles.medium;

        // Get animation effect
        const getEffectAnimation = (effect) => {
          switch (effect) {
            case 'slide': return 'slideInDown 0.5s ease-out';
            case 'fade': return 'fadeIn 0.8s ease-out';
            case 'bounce': return 'bounceIn 0.6s ease-out';
            case 'shake': return 'shake 0.5s ease-out, pulse 2s infinite 0.5s';
            case 'glow': return 'fadeIn 0.5s ease-out, glow 2s ease-in-out infinite';
            case 'none': return 'none';
            default: return 'slideInDown 0.5s ease-out';
          }
        };

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
              animation: getEffectAnimation(alert.effect || 'slide'),
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

          {/* Alert animations */}
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

            @keyframes slideInDown {
              0% {
                transform: translateY(-100%);
                opacity: 0;
              }
              100% {
                transform: translateY(0);
                opacity: 1;
              }
            }

            @keyframes fadeIn {
              0% {
                opacity: 0;
              }
              100% {
                opacity: 1;
              }
            }

            @keyframes bounceIn {
              0% {
                transform: scale(0.3) translateY(-100%);
                opacity: 0;
              }
              50% {
                transform: scale(1.05) translateY(10px);
                opacity: 1;
              }
              70% {
                transform: scale(0.9) translateY(-5px);
              }
              100% {
                transform: scale(1) translateY(0);
                opacity: 1;
              }
            }

            @keyframes shake {
              0%, 100% {
                transform: translateX(0);
              }
              10%, 30%, 50%, 70%, 90% {
                transform: translateX(-10px);
              }
              20%, 40%, 60%, 80% {
                transform: translateX(10px);
              }
            }

            @keyframes glow {
              0%, 100% {
                box-shadow: 0 8px 24px rgba(0,0,0,0.3), 0 0 20px currentColor;
              }
              50% {
                box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 40px currentColor;
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

// Scrollbar/Ticker alerts component
function ScrollbarAlerts({ alerts, dismissAlert }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return '#3b82f6';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      case 'urgent': return '#991b1b';
      default: return '#f59e0b';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'employee': return '👤';
      case 'system': return '⚙️';
      case 'maintenance': return '🔧';
      case 'emergency': return '🚨';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 99998,
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      {alerts.map((alert, index) => {
        const color = getPriorityColor(alert.priority);
        const icon = getIcon(alert.type);
        const fullText = alert.title ? `${icon} ${alert.title} - ${alert.message}` : `${icon} ${alert.message}`;

        return (
          <div
            key={alert.id}
            style={{
              background: `linear-gradient(90deg, ${color}dd 0%, ${color}aa 100%)`,
              borderTop: `3px solid ${color}`,
              color: 'white',
              fontSize: '18px',
              fontWeight: 600,
              padding: '12px 0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              position: 'relative',
              marginTop: index > 0 ? '2px' : '0',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                paddingLeft: '100%',
                animation: 'scroll-left 20s linear infinite',
              }}
            >
              {fullText}
            </div>

            {/* Dismiss button */}
            {alert.dismissible !== false && (
              <button
                onClick={() => dismissAlert(alert.id)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.5)',
                  background: 'rgba(0,0,0,0.3)',
                  color: 'white',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'auto',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(0,0,0,0.5)';
                  e.target.style.transform = 'translateY(-50%) scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(0,0,0,0.3)';
                  e.target.style.transform = 'translateY(-50%) scale(1)';
                }}
                aria-label="Dismiss alert"
              >
                ×
              </button>
            )}

            {/* Auto-dismiss timer */}
            {alert.expires_at && (
              <div style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'auto',
              }}>
                <AutoDismissTimer
                  expiresAt={alert.expires_at}
                  onExpire={() => dismissAlert(alert.id)}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Scrolling animation */}
      <style>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  );
}

// Auto-dismiss timer component
function AutoDismissTimer({ expiresAt, onExpire }) {
  const calculateTimeLeft = useCallback(() => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;

    if (diff <= 0) {
      return 0;
    }

    return Math.floor(diff / 1000); // seconds
  }, [expiresAt]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    // Check if already expired
    if (timeLeft <= 0) {
      onExpire();
      return;
    }

    const interval = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      if (newTimeLeft <= 0) {
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateTimeLeft, onExpire, timeLeft]);

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
