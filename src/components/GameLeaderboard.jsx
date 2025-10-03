// src/components/GameLeaderboard.jsx
import { useState, useEffect } from 'react';

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

  useEffect(() => {
    fetchLeaderboard();
  }, [game]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/game-leaderboard?game=${game}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.scores || []);
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
        throw new Error('Failed to submit score');
      }

      const data = await response.json();
      setRank(data.rank);
      setSubmitted(true);

      // Refresh leaderboard
      await fetchLeaderboard();
    } catch (err) {
      console.error('Failed to submit score:', err);
      alert('Failed to save score. Please try again.');
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
                type="text"
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0, 3))}
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

        {leaderboard.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
            No scores yet. Be the first!
          </div>
        ) : (
          leaderboard.map((entry, idx) => (
            <div
              key={entry.id}
              style={{
                padding: '12px 16px',
                borderBottom:
                  idx < leaderboard.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                display: 'grid',
                gridTemplateColumns: '50px 80px 1fr 80px 80px',
                gap: 12,
                fontSize: 14,
                color: '#f4f6f8',
                background: idx < 3 ? 'rgba(255,215,0,0.05)' : 'transparent',
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
          ))
        )}
      </div>
    </div>
  );
}
