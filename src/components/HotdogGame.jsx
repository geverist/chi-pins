// src/components/HotdogGame.jsx
import { useState, useEffect, useRef } from 'react';
import GameLeaderboard from './GameLeaderboard';

// Correct order for Chicago-style hot dog
const CORRECT_ORDER = [
  'bun',
  'hotdog',
  'mustard',
  'relish',
  'onion',
  'tomato',
  'pickle',
  'sport-pepper',
  'celery-salt',
];

const INGREDIENTS = [
  { id: 'bun', name: 'Poppy Seed Bun', emoji: '🍞', color: '#f4e4c1' },
  { id: 'hotdog', name: 'All-Beef Frank', emoji: '🌭', color: '#d4926f' },
  { id: 'mustard', name: 'Yellow Mustard', emoji: '💛', color: '#ffd700' },
  { id: 'relish', name: 'Neon Green Relish', emoji: '🥒', color: '#7cfc00' },
  { id: 'onion', name: 'Chopped Onions', emoji: '🧅', color: '#fff5ee' },
  { id: 'tomato', name: 'Tomato Wedges', emoji: '🍅', color: '#ff6347' },
  { id: 'pickle', name: 'Pickle Spear', emoji: '🥒', color: '#228b22' },
  { id: 'sport-pepper', name: 'Sport Peppers', emoji: '🌶️', color: '#ff4500' },
  { id: 'celery-salt', name: 'Celery Salt', emoji: '🧂', color: '#e0e0e0' },
];

export default function HotdogGame({ onClose, onGameComplete }) {
  const [gameState, setGameState] = useState('instructions'); // instructions, playing, finished
  const [assembledItems, setAssembledItems] = useState([]);
  const [availableItems, setAvailableItems] = useState([...INGREDIENTS]);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [score, setScore] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [draggedItem, setDraggedItem] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const startGame = () => {
    setGameState('playing');
    setAssembledItems([]);
    setAvailableItems([...INGREDIENTS].sort(() => Math.random() - 0.5)); // Shuffle
    setStartTime(Date.now());
    setEndTime(null);
    setScore(0);
    setAccuracy(0);
  };

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (draggedItem && !assembledItems.find(i => i.id === draggedItem.id)) {
      setAssembledItems([...assembledItems, draggedItem]);
      setAvailableItems(availableItems.filter(i => i.id !== draggedItem.id));
    }
    setDraggedItem(null);
  };

  const handleTouchItem = (item) => {
    if (!assembledItems.find(i => i.id === item.id)) {
      setAssembledItems([...assembledItems, item]);
      setAvailableItems(availableItems.filter(i => i.id !== item.id));
    }
  };

  const removeItem = (item) => {
    setAssembledItems(assembledItems.filter(i => i.id !== item.id));
    setAvailableItems([...availableItems, item]);
  };

  useEffect(() => {
    if (assembledItems.length === INGREDIENTS.length && gameState === 'playing') {
      finishGame();
    }
  }, [assembledItems, gameState]);

  const finishGame = () => {
    const end = Date.now();
    setEndTime(end);

    const timeTaken = (end - startTime) / 1000; // seconds

    // Calculate accuracy
    let correctCount = 0;
    assembledItems.forEach((item, index) => {
      if (item.id === CORRECT_ORDER[index]) {
        correctCount++;
      }
    });

    const accuracyPercent = (correctCount / INGREDIENTS.length) * 100;
    setAccuracy(accuracyPercent);

    // Calculate score: accuracy weighted heavily, speed bonus
    const maxTime = 60; // 60 seconds for max speed bonus
    const speedBonus = Math.max(0, Math.min(1000, ((maxTime - timeTaken) / maxTime) * 1000));
    const accuracyScore = accuracyPercent * 100;
    const totalScore = Math.round(accuracyScore + speedBonus);

    setScore(totalScore);
    setGameState('finished');
  };

  const renderInstructions = () => (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2 style={{ margin: '0 0 24px', color: '#f4f6f8', fontSize: 32 }}>
        🌭 Build a Chicago Dog!
      </h2>

      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h3 style={{ margin: '0 0 16px', color: '#f4f6f8', fontSize: 20 }}>
          How to Play
        </h3>
        <p style={{ color: '#a7b0b8', fontSize: 16, lineHeight: 1.6, margin: '0 0 16px' }}>
          Build a Chicago-style hot dog in the correct order as fast as you can!
          Tap or drag ingredients from the bottom to the assembly area.
        </p>
        <p style={{ color: '#10b981', fontSize: 14, fontWeight: 600, margin: 0 }}>
          The faster and more accurate, the higher your score!
        </p>
      </div>

      <div
        style={{
          background: 'rgba(59,130,246,0.1)',
          borderRadius: 12,
          padding: 20,
          marginBottom: 32,
          border: '1px solid rgba(59,130,246,0.3)',
        }}
      >
        <h4 style={{ margin: '0 0 12px', color: '#60a5fa', fontSize: 16 }}>
          Correct Order
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CORRECT_ORDER.map((id, idx) => {
            const ingredient = INGREDIENTS.find(i => i.id === id);
            return (
              <div
                key={id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  color: '#e5e7eb',
                  fontSize: 14,
                }}
              >
                <span style={{ color: '#6b7280', width: 20 }}>{idx + 1}.</span>
                <span style={{ fontSize: 20 }}>{ingredient.emoji}</span>
                <span>{ingredient.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={startGame}
        style={{
          padding: '16px 48px',
          borderRadius: 12,
          border: 'none',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          fontSize: 20,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 16,
        }}
      >
        Start Game
      </button>

      <button
        onClick={() => setShowLeaderboard(true)}
        style={{
          display: 'block',
          width: '100%',
          padding: '12px',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.05)',
          color: '#f4f6f8',
          fontSize: 16,
          cursor: 'pointer',
        }}
      >
        View Leaderboard
      </button>
    </div>
  );

  const renderPlaying = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Timer and Progress */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ color: '#a7b0b8', fontSize: 14 }}>
          Progress: {assembledItems.length}/{INGREDIENTS.length}
        </div>
        <div style={{ color: '#10b981', fontSize: 18, fontWeight: 600 }}>
          ⏱ {startTime ? Math.floor((Date.now() - startTime) / 1000) : 0}s
        </div>
      </div>

      {/* Assembly Area */}
      <div
        style={{
          flex: 1,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <h3 style={{ margin: '0 0 24px', color: '#f4f6f8', fontSize: 20 }}>
          Build Your Hot Dog
        </h3>
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            minHeight: 400,
            width: '100%',
            maxWidth: 500,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 16,
            border: '2px dashed rgba(255,255,255,0.2)',
            padding: 20,
            display: 'flex',
            flexDirection: 'column-reverse',
            gap: 8,
          }}
        >
          {assembledItems.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 60,
                color: '#6b7280',
                fontSize: 14,
              }}
            >
              Tap or drag ingredients here
            </div>
          ) : (
            assembledItems.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                onClick={() => removeItem(item)}
                style={{
                  padding: '12px 16px',
                  background: item.color + '22',
                  borderRadius: 10,
                  border: `2px solid ${item.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                }}
              >
                <span style={{ fontSize: 24 }}>{item.emoji}</span>
                <span style={{ color: '#f4f6f8', fontSize: 14, flex: 1 }}>
                  {item.name}
                </span>
                <span style={{ color: '#ef4444', fontSize: 18 }}>✕</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Available Ingredients */}
      <div
        style={{
          padding: 20,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ marginBottom: 12, color: '#a7b0b8', fontSize: 14 }}>
          Available Ingredients
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 12,
          }}
        >
          {availableItems.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onClick={() => handleTouchItem(item)}
              style={{
                padding: '12px',
                background: item.color + '22',
                borderRadius: 10,
                border: `2px solid ${item.color}`,
                textAlign: 'center',
                cursor: 'move',
                transition: 'transform 0.2s',
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ fontSize: 32, marginBottom: 4 }}>{item.emoji}</div>
              <div style={{ color: '#f4f6f8', fontSize: 11 }}>{item.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFinished = () => (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2 style={{ margin: '0 0 24px', color: '#f4f6f8', fontSize: 32 }}>
        Game Complete!
      </h2>

      <div
        style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: 16,
          padding: 32,
          marginBottom: 24,
        }}
      >
        <div style={{ color: 'white', fontSize: 18, marginBottom: 8 }}>Your Score</div>
        <div style={{ color: 'white', fontSize: 56, fontWeight: 700 }}>
          {score.toLocaleString()}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ color: '#a7b0b8', fontSize: 14, marginBottom: 4 }}>
            Accuracy
          </div>
          <div style={{ color: '#f4f6f8', fontSize: 28, fontWeight: 600 }}>
            {accuracy.toFixed(0)}%
          </div>
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ color: '#a7b0b8', fontSize: 14, marginBottom: 4 }}>
            Time
          </div>
          <div style={{ color: '#f4f6f8', fontSize: 28, fontWeight: 600 }}>
            {((endTime - startTime) / 1000).toFixed(1)}s
          </div>
        </div>
      </div>

      <GameLeaderboard
        game="hotdog-assembly"
        currentScore={score}
        currentAccuracy={accuracy}
        currentTime={(endTime - startTime) / 1000}
      />

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button
          onClick={startGame}
          style={{
            flex: 1,
            padding: '16px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            fontSize: 18,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Play Again
        </button>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: '16px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.05)',
            color: '#f4f6f8',
            fontSize: 18,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );

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
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1f26 0%, #242a33 100%)',
          borderRadius: 20,
          maxWidth: '95vw',
          maxHeight: '90vh',
          width: 900,
          height: gameState === 'playing' ? '85vh' : 'auto',
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
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, color: '#f4f6f8', fontSize: 24 }}>
            🌭 Chicago Dog Challenge
          </h2>
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
            }}
            aria-label="Close game"
          >
            ✕
          </button>
        </div>

        {/* Game Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {gameState === 'instructions' && renderInstructions()}
          {gameState === 'playing' && renderPlaying()}
          {gameState === 'finished' && renderFinished()}
        </div>
      </div>

      {showLeaderboard && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowLeaderboard(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1f26 0%, #242a33 100%)',
              borderRadius: 20,
              maxWidth: '95vw',
              width: 600,
              padding: 40,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 24px', color: '#f4f6f8', fontSize: 28 }}>
              🏆 Leaderboard
            </h2>
            <GameLeaderboard game="hotdog-assembly" viewOnly />
            <button
              onClick={() => setShowLeaderboard(false)}
              style={{
                width: '100%',
                marginTop: 24,
                padding: '12px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.05)',
                color: '#f4f6f8',
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
