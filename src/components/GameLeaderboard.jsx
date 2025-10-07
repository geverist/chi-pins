// src/components/GameLeaderboard.jsx
import { useState, useEffect, useRef } from 'react';

export default function GameLeaderboard({
  game,
  currentScore,
  currentAccuracy,
  currentTime,
  viewOnly = false,
}) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initials, setInitials] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rank, setRank] = useState(null);
  const [userEntryId, setUserEntryId] = useState(null);
  const [error, setError] = useState(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const userRowRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [game]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      // Fetch more entries to show user's position even if not in top 10
      const response = await fetch(`/api/game-leaderboard?game=${game}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.scores || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch leaderboard:', response.status, errorData);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!/^[A-Z0-9]{3}$/i.test(initials)) {
      alert('Please enter 3 letters or numbers');
      return;
    }

    // Dismiss keyboard immediately when submitting
    if (inputRef.current) {
      inputRef.current.blur();
    }

    try {
      setSubmitting(true);

      const response = await fetch('/api/game-leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game,
          initials: initials.toUpperCase(),
          score: currentScore,
          accuracy: currentAccuracy,
          time: currentTime,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Submit score error:', response.status, errorData);
        throw new Error(errorData.message || 'Failed to submit score');
      }

      const data = await response.json();
      setRank(data.rank);
      setUserEntryId(data.id);
      setSubmitted(true);

      // Refresh leaderboard immediately
      await fetchLeaderboard();

      // Scroll to user's entry after a brief delay to ensure render
      setTimeout(() => {
        if (userRowRef.current) {
          userRowRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 100);
    } catch (err) {
      console.error('Failed to submit score:', err);
      setError('Failed to save score. Please try again.');
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 20, color: '#a7b0b8' }}>
        Loading leaderboard...
      </div>
    );
  }

  return (
    <div>
      {/* Error Message */}
      {error && (
        <div
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            color: '#fca5a5',
            fontSize: 14,
          }}
        >
          ❌ {error}
        </div>
      )}

      {/* Submit Score Form */}
      {!viewOnly && !submitted && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
          <div
            style={{
              background: 'rgba(59,130,246,0.1)',
              borderRadius: 12,
              padding: 20,
              border: '1px solid rgba(59,130,246,0.3)',
            }}
          >
            <h3 style={{ margin: '0 0 16px', color: '#60a5fa', fontSize: 18 }}>
              Save Your Score
            </h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input
                ref={inputRef}
                type="text"
                value={initials}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().slice(0, 3);
                  setInitials(value);
                  // Auto-dismiss keyboard when 3 characters are entered
                  if (value.length === 3) {
                    setTimeout(() => inputRef.current?.blur(), 100);
                  }
                }}
                onFocus={() => setKeyboardOpen(true)}
                onBlur={() => setKeyboardOpen(false)}
                placeholder="ABC"
                maxLength={3}
                style={{
                  width: 100,
                  padding: '12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#f4f6f8',
                  fontSize: 24,
                  fontWeight: 700,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  outline: 'none',
                }}
                required
              />
              <button
                type="submit"
                disabled={submitting || initials.length !== 3}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background:
                    submitting || initials.length !== 3
                      ? 'rgba(100,100,100,0.5)'
                      : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: submitting || initials.length !== 3 ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Saving...' : 'Submit to Leaderboard'}
              </button>
            </div>
            <div style={{ marginTop: 8, color: '#a7b0b8', fontSize: 12 }}>
              Enter your initials (3 letters or numbers)
            </div>
          </div>
        </form>
      )}

      {/* Keyboard Dismiss Button (Android) */}
      {keyboardOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(16,17,20,0.98) 0%, rgba(16,17,20,0.95) 50%, transparent 100%)',
            padding: '24px 20px 32px',
            display: 'flex',
            justifyContent: 'center',
            zIndex: 100000,
            pointerEvents: 'none',
          }}
        >
          <button
            onClick={() => inputRef.current?.blur()}
            style={{
              padding: '14px 32px',
              borderRadius: 12,
              border: '1px solid rgba(59,130,246,0.3)',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
              pointerEvents: 'auto',
            }}
          >
            Done with Keyboard ✓
          </button>
        </div>
      )}


      {/* Success Message */}
      {submitted && rank && (
        <div
          style={{
            background: 'rgba(16,185,129,0.1)',
            borderRadius: 12,
            padding: 20,
            marginBottom: 24,
            border: '1px solid rgba(16,185,129,0.3)',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#10b981', fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
            Score Saved!
          </div>
          <div style={{ color: '#a7b0b8', fontSize: 14 }}>
            You ranked #{rank} on the leaderboard
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(0,0,0,0.3)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'grid',
            gridTemplateColumns: '50px 80px 1fr 80px 80px',
            gap: 12,
            fontSize: 12,
            fontWeight: 600,
            color: '#a7b0b8',
          }}
        >
          <div>Rank</div>
          <div>Initials</div>
          <div>Score</div>
          <div>Accuracy</div>
          <div>Time</div>
        </div>

        {/* Scrollable content */}
        <div
          style={{
            maxHeight: 400,
            overflowY: 'auto',
          }}
        >
          {leaderboard.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
              No scores yet. Be the first!
            </div>
          ) : (
            leaderboard.map((entry, idx) => {
              const isUserEntry = submitted && entry.id === userEntryId;
              return (
                <div
                  key={entry.id}
                  ref={isUserEntry ? userRowRef : null}
                  style={{
                    padding: '12px 16px',
                    borderBottom:
                      idx < leaderboard.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    display: 'grid',
                    gridTemplateColumns: '50px 80px 1fr 80px 80px',
                    gap: 12,
                    fontSize: 14,
                    color: '#f4f6f8',
                    background: isUserEntry
                      ? 'rgba(59,130,246,0.2)'
                      : idx < 3
                      ? 'rgba(255,215,0,0.05)'
                      : 'transparent',
                    border: isUserEntry ? '2px solid rgba(59,130,246,0.5)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    {idx === 0 && '🥇'}
                    {idx === 1 && '🥈'}
                    {idx === 2 && '🥉'}
                    {idx > 2 && `#${idx + 1}`}
                  </div>
                  <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 16 }}>
                    {entry.initials}
                    {isUserEntry && (
                      <span style={{ marginLeft: 4, fontSize: 12, color: '#60a5fa' }}>YOU</span>
                    )}
                  </div>
                  <div style={{ fontWeight: 600, color: '#10b981' }}>
                    {entry.score.toLocaleString()}
                  </div>
                  <div style={{ color: '#a7b0b8' }}>
                    {entry.accuracy ? `${entry.accuracy.toFixed(0)}%` : '-'}
                  </div>
                  <div style={{ color: '#a7b0b8' }}>
                    {entry.time ? `${entry.time.toFixed(1)}s` : '-'}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
