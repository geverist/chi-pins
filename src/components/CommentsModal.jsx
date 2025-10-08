// src/components/CommentsModal.jsx
import { useState } from 'react';

export default function CommentsModal({ onClose }) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [contactType, setContactType] = useState('email'); // 'email' or 'phone'
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const maxCommentLength = 500;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!comment.trim()) {
      setError('Please enter your comment');
      return;
    }

    if (comment.length > maxCommentLength) {
      setError(`Comment is too long (max ${maxCommentLength} characters)`);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/submit-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim() || 'Anonymous',
          contact: contact.trim(),
          contactType,
          comment: comment.trim(),
          rating,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit comment');
      }

      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error submitting comment:', err);
      setError(err.message || 'Failed to submit comment. Please try again.');
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
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
            padding: 40,
            maxWidth: 400,
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            border: '1px solid #374151',
            color: '#f3f4f6',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ margin: '0 0 12px 0', fontSize: 24, fontWeight: 700 }}>
            Thank You!
          </h2>
          <p style={{ margin: 0, color: '#9ca3af' }}>
            Your feedback has been submitted successfully.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '10px',
        overflow: 'hidden',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(to bottom, #1f2937, #111827)',
          borderRadius: 16,
          padding: '20px',
          maxWidth: 600,
          width: '100%',
          maxHeight: '100%',
          height: 'auto',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          border: '1px solid #374151',
          color: '#f3f4f6',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 700 }}>
            💬 Leave a Comment
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              fontSize: 28,
              cursor: 'pointer',
              padding: 0,
              width: 32,
              height: 32,
              lineHeight: '32px',
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: '1 1 auto', minHeight: 0 }}>
          <p style={{ margin: '0 0 20px 0', color: '#9ca3af', fontSize: 'clamp(12px, 3vw, 14px)', lineHeight: 1.4 }}>
            We'd love to hear about your visit! Share your thoughts, suggestions, or any feedback you have.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Rating */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
              How was your experience?
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  disabled={submitting}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: 32,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    padding: 4,
                    transition: 'transform 0.1s',
                  }}
                  onMouseEnter={(e) => !submitting && (e.currentTarget.style.transform = 'scale(1.2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {star <= rating ? '⭐' : '☆'}
                </button>
              ))}
              <span style={{ marginLeft: 12, color: '#9ca3af', fontSize: 14 }}>
                {rating === 5 ? 'Excellent!' : rating === 4 ? 'Great!' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
              </span>
            </div>
          </div>

          {/* Name (optional) */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
              Your Name <span style={{ color: '#6b7280', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Anonymous"
              disabled={submitting}
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
          </div>

          {/* Contact Info (optional) */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
              Contact Info <span style={{ color: '#6b7280', fontWeight: 400 }}>(optional - for response)</span>
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => setContactType('email')}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: contactType === 'email' ? '#3b82f6' : '#374151',
                  border: contactType === 'email' ? '1px solid #60a5fa' : '1px solid #4b5563',
                  borderRadius: 8,
                  color: '#f3f4f6',
                  fontSize: 14,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                📧 Email
              </button>
              <button
                type="button"
                onClick={() => setContactType('phone')}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: contactType === 'phone' ? '#3b82f6' : '#374151',
                  border: contactType === 'phone' ? '1px solid #60a5fa' : '1px solid #4b5563',
                  borderRadius: 8,
                  color: '#f3f4f6',
                  fontSize: 14,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                📱 Phone
              </button>
            </div>
            <input
              type={contactType === 'email' ? 'email' : 'tel'}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={contactType === 'email' ? 'your@email.com' : '(555) 123-4567'}
              disabled={submitting}
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
          </div>

          {/* Comment */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
              Your Comment *
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us about your visit, what you loved, or how we can improve..."
              disabled={submitting}
              required
              maxLength={maxCommentLength}
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#374151',
                border: '1px solid #4b5563',
                borderRadius: 8,
                color: '#f3f4f6',
                fontSize: 14,
                resize: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                minHeight: 80,
              }}
            />
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6, textAlign: 'right' }}>
              {comment.length} / {maxCommentLength} characters
            </div>
          </div>

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

          {/* Submit Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                flex: 1,
                padding: '12px 20px',
                background: '#374151',
                border: '1px solid #4b5563',
                borderRadius: 8,
                color: '#f3f4f6',
                fontSize: 16,
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !comment.trim()}
              style={{
                flex: 1,
                padding: '12px 20px',
                background: submitting || !comment.trim() ? '#4b5563' : '#10b981',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: 16,
                fontWeight: 600,
                cursor: submitting || !comment.trim() ? 'not-allowed' : 'pointer',
                opacity: submitting || !comment.trim() ? 0.5 : 1,
              }}
            >
              {submitting ? 'Submitting...' : '✉️ Submit Feedback'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
