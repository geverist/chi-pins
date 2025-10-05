// src/components/GamesMenu.jsx
import { useState } from 'react';
import HotdogGame from './HotdogGame';
import TriviaGame from './TriviaGame';
import DeepDishGame from './DeepDishGame';
import WindGame from './WindGame';
import { useFeatureIdleTimeout } from '../hooks/useFeatureIdleTimeout';
import { useAdminSettings } from '../state/useAdminSettings';

const GAMES = [
  {
    id: 'hotdog-assembly',
    name: 'Chicago Dog Challenge',
    description: 'Build a Chicago-style hot dog in the correct order as fast as you can!',
    emoji: '🌭',
    color: '#ef4444',
    difficulty: 'Easy',
  },
  {
    id: 'chicago-trivia',
    name: 'Chicago Trivia Challenge',
    description: 'Test your knowledge of Chicago history, culture, food, and more!',
    emoji: '🧠',
    color: '#3b82f6',
    difficulty: 'Medium',
  },
  {
    id: 'deep-dish-toss',
    name: 'Deep Dish Toss',
    description: 'Catch falling pizza ingredients in your pan! Build combos for higher scores!',
    emoji: '🍕',
    color: '#f59e0b',
    difficulty: 'Medium',
  },
  {
    id: 'chicago-wind',
    name: 'Chicago Wind Challenge',
    description: 'Keep your food from blowing away in Chicago\'s famous wind! React fast!',
    emoji: '💨',
    color: '#06b6d4',
    difficulty: 'Hard',
  },
];

export default function GamesMenu({ onClose }) {
  const [selectedGame, setSelectedGame] = useState(null);
  const { settings: adminSettings } = useAdminSettings();

  // Idle timeout - close games and return to map
  useFeatureIdleTimeout(
    true, // Always active when GamesMenu is open
    onClose,
    adminSettings.gamesIdleTimeout || 180
  );

  if (selectedGame === 'hotdog-assembly') {
    return (
      <HotdogGame
        onClose={() => setSelectedGame(null)}
        onGameComplete={() => {
          // Could track stats or achievements here
        }}
      />
    );
  }

  if (selectedGame === 'chicago-trivia') {
    return (
      <TriviaGame
        onClose={() => setSelectedGame(null)}
      />
    );
  }

  if (selectedGame === 'deep-dish-toss') {
    return (
      <DeepDishGame
        onClose={() => setSelectedGame(null)}
      />
    );
  }

  if (selectedGame === 'chicago-wind') {
    return (
      <WindGame
        open={true}
        onClose={() => setSelectedGame(null)}
      />
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1f26 0%, #242a33 100%)',
          borderRadius: 20,
          maxWidth: '95vw',
          maxHeight: '95vh',
          width: 900,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, color: '#f4f6f8', fontSize: 'clamp(18px, 5vw, 28px)' }}>
              🎮 Chicago Mike's Games
            </h2>
            <p style={{ margin: '4px 0 0', color: '#a7b0b8', fontSize: 'clamp(11px, 3vw, 14px)' }}>
              Test your skills and compete for the high score!
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10,
              color: '#f4f6f8',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: 16,
              flexShrink: 0,
              marginLeft: 12,
            }}
            aria-label="Close games menu"
          >
            ✕
          </button>
        </div>

        {/* Games Grid */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 16,
            WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
              gap: 20,
            }}
          >
            {GAMES.map((game) => (
              <div
                key={game.id}
                onClick={() => setSelectedGame(game.id)}
                style={{
                  background: `linear-gradient(135deg, ${game.color}22 0%, ${game.color}11 100%)`,
                  borderRadius: 16,
                  padding: 20,
                  border: `2px solid ${game.color}44`,
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 12px 24px ${game.color}44`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >

                <div
                  style={{
                    fontSize: 64,
                    marginBottom: 16,
                    textAlign: 'center',
                  }}
                >
                  {game.emoji}
                </div>

                <h3
                  style={{
                    margin: '0 0 8px',
                    color: '#f4f6f8',
                    fontSize: 20,
                    fontWeight: 600,
                  }}
                >
                  {game.name}
                </h3>

                <p
                  style={{
                    margin: '0 0 16px',
                    color: '#a7b0b8',
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  {game.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.1)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#f4f6f8',
                    }}
                  >
                    {game.difficulty}
                  </div>

                  {!game.comingSoon && (
                    <div
                      style={{
                        color: game.color,
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      Play Now →
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Placeholder for future games */}
          <div
            style={{
              marginTop: 32,
              padding: 24,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
            <h3 style={{ margin: '0 0 8px', color: '#f4f6f8', fontSize: 18 }}>
              More Games Coming Soon!
            </h3>
            <p style={{ margin: 0, color: '#a7b0b8', fontSize: 14 }}>
              Check back for new challenges and compete with other customers
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
