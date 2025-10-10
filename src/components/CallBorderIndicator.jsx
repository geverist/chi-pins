// src/components/CallBorderIndicator.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * CallBorderIndicator - Visual border shown when Twilio voice bot is on an active call
 *
 * Listens for Twilio call status updates via Supabase real-time or webhook
 * Shows animated glowing border around entire screen when call is active
 */
export default function CallBorderIndicator({ enabled = true }) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [callerInfo, setCallerInfo] = useState(null);

  // Listen for call status updates from Supabase
  useEffect(() => {
    if (!enabled) return;

    // Subscribe to call status updates
    const channel = supabase
      .channel('twilio-call-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'twilio_call_status',
        },
        (payload) => {
          console.log('[CallBorder] Call status update:', payload);

          if (payload.new) {
            const { is_active, caller_number, call_sid } = payload.new;
            setIsCallActive(is_active);

            if (is_active) {
              setCallerInfo({
                number: caller_number,
                sid: call_sid,
              });
              console.log('[CallBorder] 📞 Call active:', caller_number);
            } else {
              setCallerInfo(null);
              console.log('[CallBorder] ✅ Call ended');
            }
          }
        }
      )
      .subscribe();

    // Check for active call on mount
    const checkActiveCall = async () => {
      try {
        const { data, error } = await supabase
          .from('twilio_call_status')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setIsCallActive(true);
          setCallerInfo({
            number: data.caller_number,
            sid: data.call_sid,
          });
          console.log('[CallBorder] Found active call on mount:', data.caller_number);
        }
      } catch (err) {
        console.error('[CallBorder] Error checking active call:', err);
      }
    };

    checkActiveCall();

    return () => {
      channel.unsubscribe();
    };
  }, [enabled]);

  // Window method to manually trigger call border (for testing)
  useEffect(() => {
    window.setCallActive = (active, number = '+1234567890') => {
      setIsCallActive(active);
      if (active) {
        setCallerInfo({ number, sid: 'test-call-sid' });
        console.log('[CallBorder] 🧪 Test call activated');
      } else {
        setCallerInfo(null);
        console.log('[CallBorder] 🧪 Test call ended');
      }
    };

    return () => {
      delete window.setCallActive;
    };
  }, []);

  if (!enabled || !isCallActive) return null;

  return (
    <>
      {/* Animated glowing border */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 9998, // Below modals but above everything else
          border: '8px solid transparent',
          borderImage: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #f59e0b, #10b981, #3b82f6) 1',
          animation: 'borderPulse 3s ease-in-out infinite, borderRotate 10s linear infinite',
          boxShadow: `
            inset 0 0 40px rgba(59, 130, 246, 0.4),
            inset 0 0 80px rgba(139, 92, 246, 0.3),
            0 0 40px rgba(59, 130, 246, 0.6),
            0 0 80px rgba(139, 92, 246, 0.4)
          `,
        }}
      />

      {/* Call status badge */}
      <div
        style={{
          position: 'fixed',
          top: 20,
          left: 20,
          zIndex: 9999,
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(139, 92, 246, 0.95))',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          borderRadius: 12,
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 8px 32px rgba(59, 130, 246, 0.5)',
          animation: 'slideInLeft 0.4s ease-out',
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#10b981',
            animation: 'pulse 2s ease-in-out infinite',
            boxShadow: '0 0 12px rgba(16, 185, 129, 0.8)',
          }}
        />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>
            📞 Voice Bot Active
          </div>
          {callerInfo && (
            <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.8)', marginTop: 2 }}>
              {callerInfo.number}
            </div>
          )}
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes borderPulse {
          0%, 100% {
            opacity: 1;
            filter: brightness(1);
          }
          50% {
            opacity: 0.7;
            filter: brightness(1.3);
          }
        }

        @keyframes borderRotate {
          0% {
            filter: hue-rotate(0deg);
          }
          100% {
            filter: hue-rotate(360deg);
          }
        }

        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.7;
          }
        }
      `}</style>
    </>
  );
}
