// src/components/GuestBook.jsx
import { useState } from 'react';
import VoiceInput from './VoiceInput';

export default function GuestBook({ onClose }) {
  const [form, setForm] = useState({
    name: '',
    location: '',
    message: '',
    email: '',
  });
  const [submitted, setSubmitted] = useState(false);

  // Mock recent entries
  const recentEntries = [
    {
      name: 'Sarah & Michael',
      location: 'San Francisco, CA',
      message: 'What a beautiful venue! Thank you for making our special day unforgettable.',
      date: '2 hours ago',
    },
    {
      name: 'The Johnson Family',
      location: 'Austin, TX',
      message: 'Wonderful hospitality and amazing memories. We\'ll be back!',
      date: '1 day ago',
    },
    {
      name: 'Emily Chen',
      location: 'Seattle, WA',
      message: 'Exceeded all expectations. The attention to detail was impeccable!',
      date: '2 days ago',
    },
  ];

  const handleSubmit = () => {
    if (!form.name || !form.message) {
      alert('Please fill in your name and message');
      return;
    }
    setSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 900,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 40,
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: '#ef4444',
            border: 'none',
            borderRadius: 6,
            color: 'white',
            padding: '10px 16px',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          ✕ Close
        </button>

        {!submitted ? (
          <>
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 32, textAlign: 'center' }}>
              📖 Guest Book
            </h2>
            <p style={{ color: '#9ca3af', marginBottom: 30, textAlign: 'center', fontSize: 16 }}>
              Share your experience and read messages from other guests
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 30 }}>
              {/* Sign Guest Book Form */}
              <div>
                <h3 style={{ marginBottom: 20, fontSize: 20 }}>✍️ Sign Our Guest Book</h3>

                <div style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
                      Your Name *
                    </label>
                    <VoiceInput
                      placeholder="Full name or party name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      ariaLabel="Your name"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
                      From (City, State)
                    </label>
                    <VoiceInput
                      placeholder="Chicago, IL"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      ariaLabel="Your location"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
                      Your Message *
                    </label>
                    <textarea
                      placeholder="Share your experience..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      rows={5}
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: 15,
                        borderRadius: 8,
                        border: '1px solid #2a2f37',
                        background: '#16181d',
                        color: '#e9eef3',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
                      Email (optional)
                    </label>
                    <VoiceInput
                      type="email"
                      placeholder="your@email.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      ariaLabel="Your email"
                    />
                    <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                      We'll send you a copy of your message
                    </p>
                  </div>

                  <button
                    onClick={handleSubmit}
                    style={{
                      padding: '14px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                      color: 'white',
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginTop: 8,
                    }}
                  >
                    ✓ Sign Guest Book
                  </button>
                </div>
              </div>

              {/* Recent Entries */}
              <div>
                <h3 style={{ marginBottom: 20, fontSize: 20 }}>💬 Recent Messages</h3>
                <div style={{ display: 'grid', gap: 16 }}>
                  {recentEntries.map((entry, index) => (
                    <div
                      key={index}
                      style={{
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(99, 102, 241, 0.05))',
                        border: '1px solid #2a2f37',
                        borderRadius: 12,
                        padding: 16,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: '#e9eef3' }}>
                            {entry.name}
                          </div>
                          <div style={{ fontSize: 13, color: '#9ca3af' }}>
                            {entry.location}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                          {entry.date}
                        </div>
                      </div>
                      <p style={{
                        margin: 0,
                        fontSize: 14,
                        color: '#d1d5db',
                        lineHeight: 1.5,
                        fontStyle: 'italic',
                      }}>
                        "{entry.message}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 80, marginBottom: 20 }}>🎉</div>
            <h2 style={{ fontSize: 32, marginBottom: 10 }}>Thank You!</h2>
            <p style={{ color: '#9ca3af', fontSize: 18, marginBottom: 20 }}>
              Your message has been added to our guest book
            </p>
            <div style={{
              padding: 20,
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1))',
              border: '1px solid #8b5cf6',
              borderRadius: 12,
              color: '#a78bfa',
              maxWidth: 400,
              margin: '0 auto',
            }}>
              <p style={{ margin: 0, fontSize: 16 }}>
                "{form.message}"
              </p>
              <p style={{ marginTop: 12, marginBottom: 0, fontSize: 14, fontWeight: 600 }}>
                — {form.name}
              </p>
              {form.location && (
                <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
                  {form.location}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
