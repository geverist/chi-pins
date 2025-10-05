// src/components/AnonymousMessageModal.jsx
import { useState } from 'react';
import { normalizePhoneToE164ish } from '../lib/phoneUtils';

export default function AnonymousMessageModal({ recipientPin, onClose, onSend }) {
  const [senderPhone, setSenderPhone] = useState('');
  const [message, setMessage] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const maxMessageLength = 320; // SMS length with some buffer

  const handleSend = async () => {
    setError(null);

    // Validate phone number (optional - only if provided)
    const normalizedPhone = senderPhone.trim() ? normalizePhoneToE164ish(senderPhone) : null;
    if (senderPhone.trim() && !normalizedPhone) {
      setError('Please enter a valid phone number or leave it blank');
      return;
    }

    // Validate message
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    if (message.length > maxMessageLength) {
      setError(`Message is too long (max ${maxMessageLength} characters)`);
      return;
    }

    // Validate consent (only if phone number is provided)
    if (normalizedPhone && !consentChecked) {
      setError('Please confirm you consent to sharing your phone number');
      return;
    }

    // Check if recipient has opted in
    if (!recipientPin.allow_anonymous_messages || (!recipientPin.loyalty_phone && !recipientPin.loyalty_email)) {
      setError('This user has not opted in to receive messages');
      return;
    }

    setSending(true);
    try {
      await onSend({
        senderPhone: normalizedPhone,
        recipientPhone: recipientPin.loyalty_phone,
        recipientEmail: recipientPin.loyalty_email,
        message: message.trim(),
        pinId: recipientPin.id,
        pinSlug: recipientPin.slug,
      });
      onClose();
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err.message || 'Failed to send message. Please try again.');
      setSending(false);
    }
  };

  // Check if recipient can receive messages
  const recipientCanReceive = recipientPin.allow_anonymous_messages && (recipientPin.loyalty_phone || recipientPin.loyalty_email);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(to bottom, #1f2937, #111827)',
          borderRadius: 16,
          padding: 24,
          maxWidth: 500,
          width: '100%',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          border: '1px solid #374151',
          color: '#f3f4f6',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
            💬 Send Anonymous Message
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              fontSize: 24,
              cursor: 'pointer',
              padding: 0,
              width: 32,
              height: 32,
            }}
          >
            ×
          </button>
        </div>

        {!recipientCanReceive ? (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              padding: 16,
              marginBottom: 20,
              color: '#fca5a5',
            }}
          >
            <strong>⚠️ Messaging Not Available</strong>
            <p style={{ margin: '8px 0 0 0', fontSize: 14 }}>
              This user has not opted in to receive messages or has not provided a phone number.
            </p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
                Your Phone Number <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="tel"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder="(555) 123-4567"
                disabled={sending}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#374151',
                  border: '1px solid #4b5563',
                  borderRadius: 8,
                  color: '#f3f4f6',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
              <div
                style={{
                  fontSize: 12,
                  color: '#fbbf24',
                  marginTop: 6,
                  background: 'rgba(251, 191, 36, 0.1)',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(251, 191, 36, 0.2)',
                }}
              >
                ⚠️ <strong>Privacy Notice:</strong> Providing your number allows the recipient to reply, but may expose you to unwanted messages. Leave blank to remain fully anonymous.
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
                Your Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hey! I saw you posted a pin at Chicago Mike's. I think we went to the same high school..."
                disabled={sending}
                maxLength={maxMessageLength}
                rows={5}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#374151',
                  border: '1px solid #4b5563',
                  borderRadius: 8,
                  color: '#f3f4f6',
                  fontSize: 14,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6, textAlign: 'right' }}>
                {message.length} / {maxMessageLength} characters
              </div>
            </div>

            {senderPhone.trim() && (
              <div
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'start',
                    gap: 10,
                    cursor: 'pointer',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    disabled={sending}
                    style={{ marginTop: 3, cursor: 'pointer' }}
                  />
                  <span>
                    I consent to sharing my phone number with this person so they can reply to my message.
                    I understand this message will be sent via SMS.
                  </span>
                </label>
              </div>
            )}

            {error && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  color: '#fca5a5',
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={onClose}
                disabled={sending}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: '#374151',
                  border: '1px solid #4b5563',
                  borderRadius: 8,
                  color: '#f3f4f6',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: sending ? 'not-allowed' : 'pointer',
                  opacity: sending ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !recipientCanReceive}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: sending ? '#4b5563' : '#0ea5e9',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: sending || !recipientCanReceive ? 'not-allowed' : 'pointer',
                  opacity: sending || !recipientCanReceive ? 0.5 : 1,
                }}
              >
                {sending ? 'Sending...' : '📤 Send Message'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
