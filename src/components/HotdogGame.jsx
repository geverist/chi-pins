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
  const [leftIngredients, setLeftIngredients] = useState([]);
  const [rightIngredients, setRightIngredients] = useState([]);
  const repositionTimerRef = useRef(null);

  const randomizeIngredientPositions = () => {
    const shuffled = [...INGREDIENTS].sort(() => Math.random() - 0.5);
    const mid = Math.ceil(shuffled.length / 2);

    setLeftIngredients(
      shuffled.slice(0, mid).map(item => ({
        ...item,
        top: Math.random() * 60 + 10, // 10-70% from top
      }))
    );

    setRightIngredients(
      shuffled.slice(mid).map(item => ({
        ...item,
        top: Math.random() * 60 + 10, // 10-70% from top
      }))
    );
  };

  const startGame = () => {
    setGameState('playing');
    setAssembledItems([]);
    setAvailableItems([...INGREDIENTS].sort(() => Math.random() - 0.5)); // Shuffle
    setStartTime(Date.now());
    setEndTime(null);
    setScore(0);
    setAccuracy(0);
    randomizeIngredientPositions();

    // Reposition ingredients every 5 seconds
    repositionTimerRef.current = setInterval(() => {
      randomizeIngredientPositions();
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (repositionTimerRef.current) {
        clearInterval(repositionTimerRef.current);
      }
    };
  }, []);

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

    // Clear reposition timer
    if (repositionTimerRef.current) {
      clearInterval(repositionTimerRef.current);
    }

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
    <div style={{ padding: '24px 40px', textAlign: 'center', overflow: 'hidden' }}>
      <h2 style={{ margin: '0 0 16px', color: '#f4f6f8', fontSize: 28 }}>
        🌭 Build a Chicago Dog!
      </h2>

      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h3 style={{ margin: '0 0 12px', color: '#f4f6f8', fontSize: 18 }}>
          How to Play
        </h3>
        <p style={{ color: '#a7b0b8', fontSize: 14, lineHeight: 1.5, margin: '0 0 8px' }}>
          Build a Chicago-style hot dog in the correct order as fast as you can!
          Ingredients appear on the left and right sides. Tap them to add to your hot dog.
        </p>
        <p style={{ color: '#fbbf24', fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>
          Watch out! Ingredients move to random positions every 5 seconds!
        </p>
        <p style={{ color: '#10b981', fontSize: 13, fontWeight: 600, margin: 0 }}>
          The faster and more accurate, the higher your score!
        </p>
      </div>

      <div
        style={{
          background: 'rgba(59,130,246,0.1)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          border: '1px solid rgba(59,130,246,0.3)',
          maxHeight: '280px',
          overflow: 'auto',
        }}
      >
        <h4 style={{ margin: '0 0 10px', color: '#60a5fa', fontSize: 15 }}>
          Correct Order
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {CORRECT_ORDER.map((id, idx) => {
            const ingredient = INGREDIENTS.find(i => i.id === id);
            return (
              <div
                key={id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: '#e5e7eb',
                  fontSize: 13,
                }}
              >
                <span style={{ color: '#6b7280', width: 18 }}>{idx + 1}.</span>
                <span style={{ fontSize: 18 }}>{ingredient.emoji}</span>
                <span>{ingredient.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={startGame}
        style={{
          padding: '14px 40px',
          borderRadius: 12,
          border: 'none',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          fontSize: 18,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 12,
        }}
      >
        Start Game
      </button>

      <button
        onClick={() => setShowLeaderboard(true)}
        style={{
          display: 'block',
          width: '100%',
          padding: '10px',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.05)',
          color: '#f4f6f8',
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        View Leaderboard
      </button>
    </div>
  );

  const renderPlaying = () => (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      {/* Left Ingredients */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '15%',
          padding: '80px 10px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
        }}
      >
        {leftIngredients.map((item) => {
          const isUsed = assembledItems.find(i => i.id === item.id);
          if (isUsed) return null;

          return (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onClick={() => handleTouchItem(item)}
              style={{
                position: 'absolute',
                top: `${item.top}%`,
                fontSize: 48,
                cursor: 'move',
                transition: 'all 0.5s ease-in-out',
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {item.emoji}
            </div>
          );
        })}
      </div>

      {/* Center Assembly Area */}
      <div
        style={{
          flex: 1,
          padding: '60px 80px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Timer, Progress, and Quit Button */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 32,
            alignItems: 'center',
          }}
        >
          <div style={{ color: '#a7b0b8', fontSize: 14 }}>
            Progress: {assembledItems.length}/{INGREDIENTS.length}
          </div>
          <div style={{ color: '#10b981', fontSize: 18, fontWeight: 600 }}>
            ⏱ {startTime ? Math.floor((Date.now() - startTime) / 1000) : 0}s
          </div>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to quit? Your progress will be lost.')) {
                if (repositionTimerRef.current) {
                  clearInterval(repositionTimerRef.current);
                }
                setGameState('instructions');
                setAssembledItems([]);
                setAvailableItems([...INGREDIENTS]);
              }
            }}
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              border: '1px solid rgba(239,68,68,0.4)',
              background: 'rgba(239,68,68,0.1)',
              color: '#fca5a5',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Quit Game
          </button>
        </div>

        <h3 style={{ margin: '0 0 24px', color: '#f4f6f8', fontSize: 20 }}>
          Build Your Hot Dog
        </h3>
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            minHeight: 400,
            width: '100%',
            maxWidth: 400,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 16,
            border: '2px dashed rgba(255,255,255,0.2)',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
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
              Tap ingredients to build
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
                  justifyContent: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                }}
              >
                <span style={{ fontSize: 32 }}>{item.emoji}</span>
                <span style={{ color: '#ef4444', fontSize: 18 }}>✕</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Ingredients */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '15%',
          padding: '80px 10px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
        }}
      >
        {rightIngredients.map((item) => {
          const isUsed = assembledItems.find(i => i.id === item.id);
          if (isUsed) return null;

          return (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onClick={() => handleTouchItem(item)}
              style={{
                position: 'absolute',
                top: `${item.top}%`,
                fontSize: 48,
                cursor: 'move',
                transition: 'all 0.5s ease-in-out',
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {item.emoji}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderFinished = () => (
    <div style={{ padding: '24px 32px', textAlign: 'center', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h2 style={{ margin: '0 0 16px', color: '#f4f6f8', fontSize: 28 }}>
        Game Complete!
      </h2>

      <div
        style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 16,
        }}
      >
        <div style={{ color: 'white', fontSize: 16, marginBottom: 6 }}>Your Score</div>
        <div style={{ color: 'white', fontSize: 48, fontWeight: 700 }}>
          {score.toLocaleString()}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            padding: 16,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ color: '#a7b0b8', fontSize: 13, marginBottom: 4 }}>
            Accuracy
          </div>
          <div style={{ color: '#f4f6f8', fontSize: 24, fontWeight: 600 }}>
            {accuracy.toFixed(0)}%
          </div>
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            padding: 16,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ color: '#a7b0b8', fontSize: 13, marginBottom: 4 }}>
            Time
          </div>
          <div style={{ color: '#f4f6f8', fontSize: 24, fontWeight: 600 }}>
            {((endTime - startTime) / 1000).toFixed(1)}s
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', marginBottom: 16 }}>
        <GameLeaderboard
          game="hotdog-assembly"
          currentScore={score}
          currentAccuracy={accuracy}
          currentTime={(endTime - startTime) / 1000}
        />
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={startGame}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            fontSize: 16,
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
            padding: '14px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.05)',
            color: '#f4f6f8',
            fontSize: 16,
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
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
