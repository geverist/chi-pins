// src/components/DeepDishGame.jsx
import { useState, useEffect, useRef } from 'react';
import GameLeaderboard from './GameLeaderboard';
import { useAdminSettings } from '../state/useAdminSettings';
import soundEffects from '../utils/soundEffects';
import { createSuccessEffect, createErrorEffect, createComboEffect } from '../utils/particleEffects';
import achievementManager from '../utils/achievements';

const GAME_DURATION = 90; // 90 seconds (1.5 minutes)
const SPAWN_INTERVAL_BASE = 1500; // ms
const SPAWN_INTERVAL_MIN = 600; // ms
const FALL_SPEED_BASE = 2; // pixels per frame
const FALL_SPEED_INCREMENT = 0.10; // Reduced for smoother difficulty curve

// Required ingredients to complete pizza
const REQUIRED_INGREDIENTS = [
  { id: 'sauce', name: 'Tomato Sauce', emoji: '🍅', points: 100, color: '#ff6347', size: 50 },
  { id: 'cheese', name: 'Mozzarella', emoji: '🧀', points: 100, color: '#ffd700', size: 50 },
  { id: 'sausage', name: 'Italian Sausage', emoji: '🌭', points: 150, color: '#8b4513', size: 45 },
  { id: 'pepperoni', name: 'Pepperoni', emoji: '🍖', points: 150, color: '#dc143c', size: 45 },
  { id: 'mushroom', name: 'Mushrooms', emoji: '🍄', points: 125, color: '#deb887', size: 45 },
  { id: 'pepper', name: 'Bell Peppers', emoji: '🫑', points: 125, color: '#228b22', size: 45 },
];

const BAD_ITEMS = [
  { id: 'bomb', name: 'Burnt Pizza', emoji: '💣', points: -100, color: '#000000', size: 50 },
  { id: 'pineapple', name: 'Pineapple', emoji: '🍍', points: -75, color: '#ffd700', size: 50 },
];

export default function DeepDishGame({ onClose }) {
  const { settings: adminSettings } = useAdminSettings();
  const [gameState, setGameState] = useState('instructions');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [fallingItems, setFallingItems] = useState([]);
  const [catcherX, setCatcherX] = useState(50); // percentage
  const [collectedIngredients, setCollectedIngredients] = useState([]);
  const [scorePopups, setScorePopups] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [caughtPineapple, setCaughtPineapple] = useState(false);

  const gameLoopRef = useRef(null);
  const spawnTimerRef = useRef(null);
  const gameStartTime = useRef(null);
  const nextItemId = useRef(0);
  const gameContainerRef = useRef(null);
  const fallSpeedRef = useRef(FALL_SPEED_BASE);
  const spawnIntervalRef = useRef(SPAWN_INTERVAL_BASE);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    soundEffects.init();
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
    };
  }, []);

  const startGame = () => {
    setGameState('playing');
    isPlayingRef.current = true;
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setFallingItems([]);
    setCatcherX(50);
    setCollectedIngredients([]);
    setScorePopups([]);
    setStartTime(Date.now());
    setEndTime(null);
    setCombo(0);
    setMaxCombo(0);
    setCaughtPineapple(false);

    const startSpeed = adminSettings.deepDishStartSpeed || 2;
    fallSpeedRef.current = startSpeed;
    spawnIntervalRef.current = SPAWN_INTERVAL_BASE;
    gameStartTime.current = Date.now();
    nextItemId.current = 0;

    soundEffects.playGameStart();
    soundEffects.vibrateShort();

    startGameLoop();
    scheduleNextSpawn();
  };

  const startGameLoop = () => {
    const loop = () => {
      updateGame();
      gameLoopRef.current = requestAnimationFrame(loop);
    };
    gameLoopRef.current = requestAnimationFrame(loop);
  };

  const scheduleNextSpawn = () => {
    if (!isPlayingRef.current) return;

    spawnTimerRef.current = setTimeout(() => {
      if (isPlayingRef.current) {
        spawnItem();
        scheduleNextSpawn();
      }
    }, spawnIntervalRef.current);
  };

  const spawnItem = () => {
    // Only spawn ingredients that haven't been collected yet, plus bad items
    const uncollectedIngredients = REQUIRED_INGREDIENTS.filter(
      ing => !collectedIngredients.find(c => c.id === ing.id)
    );
    const allItems = [...uncollectedIngredients, ...BAD_ITEMS];

    if (allItems.length === 0) return; // No items left to spawn

    const randomItem = allItems[Math.floor(Math.random() * allItems.length)];

    const newItem = {
      ...randomItem,
      uniqueId: nextItemId.current++,
      x: Math.random() * 80 + 10, // 10-90%
      y: -10, // Start above screen
      caught: false,
      missed: false,
    };

    setFallingItems(prev => [...prev, newItem]);
  };

  const updateGame = () => {
    const now = Date.now();
    const elapsed = (now - gameStartTime.current) / 1000;
    const newTimeLeft = Math.max(0, GAME_DURATION - elapsed);
    setTimeLeft(newTimeLeft);

    // Check if time's up
    if (newTimeLeft <= 0) {
      endGame();
      return;
    }

    // Check if pizza is complete
    if (collectedIngredients.length === REQUIRED_INGREDIENTS.length) {
      endGame();
      return;
    }

    // Increase difficulty over time
    const startSpeed = adminSettings.deepDishStartSpeed || 2;
    const endSpeed = adminSettings.deepDishEndSpeed || 5;
    const maxTime = 60; // Assume 60 seconds max for speed progression
    const speedProgress = Math.min(elapsed / maxTime, 1);
    fallSpeedRef.current = startSpeed + (endSpeed - startSpeed) * speedProgress;

    spawnIntervalRef.current = Math.max(
      SPAWN_INTERVAL_MIN,
      SPAWN_INTERVAL_BASE - (elapsed * 15)
    );

    // Update falling items
    setFallingItems(prev => {
      return prev
        .map(item => {
          if (item.caught || item.missed) return item;

          const newY = item.y + fallSpeedRef.current;

          // Check if caught
          const catcherWidth = 15; // percentage
          const itemWidth = 5; // percentage
          const isInCatcherRange =
            item.x > catcherX - catcherWidth / 2 &&
            item.x < catcherX + catcherWidth / 2 &&
            newY >= 85 && newY <= 95;

          if (isInCatcherRange && !item.caught) {
            handleCatch(item);
            return { ...item, y: newY, caught: true };
          }

          // Check if missed
          if (newY > 100 && !item.missed) {
            handleMiss(item);
            return { ...item, y: newY, missed: true };
          }

          return { ...item, y: newY };
        })
        .filter(item => item.y < 110); // Remove items that are way off screen
    });

    // Update score popups
    setScorePopups(prev =>
      prev
        .map(popup => ({
          ...popup,
          opacity: popup.opacity - 0.02,
          y: popup.y - 1,
        }))
        .filter(popup => popup.opacity > 0)
    );
  };

  const handleCatch = (item) => {
    const isBad = BAD_ITEMS.some(bad => bad.id === item.id);
    const containerRect = gameContainerRef.current?.getBoundingClientRect();
    const itemX = containerRect ? containerRect.left + (item.x / 100) * containerRect.width : window.innerWidth / 2;
    const itemY = containerRect ? containerRect.top + (item.y / 100) * containerRect.height : window.innerHeight / 2;

    if (isBad) {
      // Bad item - lose points
      const pointsLost = item.points;
      setScore(prev => Math.max(0, prev + pointsLost));
      showScorePopup(pointsLost, item.x, item.color);

      // Track pineapple
      if (item.id === 'pineapple') {
        setCaughtPineapple(true);
      }

      // Play error sound and effects
      soundEffects.playError();
      soundEffects.vibrateError();
      createErrorEffect(itemX, itemY);

      // Reset combo
      setCombo(0);
    } else {
      // Good item - add to collected ingredients
      setCollectedIngredients(prev => {
        // Avoid duplicates
        if (prev.find(i => i.id === item.id)) return prev;
        return [...prev, item];
      });
      const pointsGained = item.points;
      setScore(prev => prev + pointsGained);
      showScorePopup(`+${pointsGained}`, item.x, item.color);

      // Increase combo
      setCombo(prev => {
        const newCombo = prev + 1;
        setMaxCombo(current => Math.max(current, newCombo));

        // Play combo sound and effects for combos >= 3
        if (newCombo >= 3) {
          soundEffects.playCombo(Math.min(newCombo, 5));
          createComboEffect(itemX, itemY, newCombo);
        } else {
          soundEffects.playPop();
          soundEffects.vibrateShort();
          createSuccessEffect(itemX, itemY);
        }

        return newCombo;
      });
    }
  };

  const handleMiss = (item) => {
    // Missing good items breaks combo
    const isBad = BAD_ITEMS.some(bad => bad.id === item.id);
    if (!isBad) {
      setCombo(0);
    }
  };

  const showScorePopup = (points, x, color) => {
    setScorePopups(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        points,
        x,
        y: 85,
        opacity: 1,
        color,
      },
    ]);
  };

  const endGame = () => {
    isPlayingRef.current = false;
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);

    setEndTime(Date.now());
    setGameState('finished');

    // Play game over sound
    soundEffects.playGameOver();
    soundEffects.vibrateLong();

    // Check achievements
    const collectedAll = collectedIngredients.length === REQUIRED_INGREDIENTS.length;
    achievementManager.checkDeepDishAchievements({
      collectedAll,
      maxCombo,
      caughtPineapple,
    });
  };

  const handleMouseMove = (e) => {
    if (gameState !== 'playing' || !gameContainerRef.current) return;

    const rect = gameContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setCatcherX(Math.max(10, Math.min(90, x)));
  };

  const handleTouchMove = (e) => {
    if (gameState !== 'playing' || !gameContainerRef.current) return;

    const touch = e.touches[0];
    const rect = gameContainerRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    setCatcherX(Math.max(10, Math.min(90, x)));
  };

  const renderInstructions = () => (
    <div style={{ padding: 40, textAlign: 'center', overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <h2 style={{ margin: '0 0 24px', color: '#f4f6f8', fontSize: 32 }}>
        🍕 Deep Dish Toss!
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
          Catch falling pizza ingredients on your pizza dough! Move with your mouse or finger.
          Collect all 6 ingredients to complete your pizza. Avoid burnt pizzas and pineapple!
        </p>
        <p style={{ color: '#10b981', fontSize: 14, fontWeight: 600, margin: 0 }}>
          Complete your pizza as fast as possible for a higher score!
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div
          style={{
            background: 'rgba(16,185,129,0.1)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid rgba(16,185,129,0.3)',
          }}
        >
          <h4 style={{ margin: '0 0 12px', color: '#10b981', fontSize: 16 }}>
            Catch These! ✓
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {REQUIRED_INGREDIENTS.map(item => (
              <div key={item.id} style={{ fontSize: 32 }} title={item.name}>
                {item.emoji}
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            background: 'rgba(239,68,68,0.1)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid rgba(239,68,68,0.3)',
          }}
        >
          <h4 style={{ margin: '0 0 12px', color: '#ef4444', fontSize: 16 }}>
            Avoid These! ✗
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {BAD_ITEMS.map(item => (
              <div key={item.id} style={{ fontSize: 32 }} title={item.name}>
                {item.emoji}
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={startGame}
        style={{
          padding: '16px 48px',
          borderRadius: 12,
          border: 'none',
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          fontSize: 20,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Start Game
      </button>
    </div>
  );

  const renderPlaying = () => (
    <div
      ref={gameContainerRef}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #1a1f26 0%, #2a2f37 100%)',
        overflow: 'hidden',
        cursor: 'none',
        touchAction: 'none',
      }}
    >
      {/* HUD */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px 24px',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        <div>
          <div style={{ color: '#a7b0b8', fontSize: 14 }}>Score</div>
          <div style={{ color: '#f4f6f8', fontSize: 32, fontWeight: 700 }}>
            {score}
          </div>
          {combo >= 3 && (
            <div
              style={{
                color: '#f59e0b',
                fontSize: 16,
                fontWeight: 600,
                marginTop: 4,
                animation: 'pulse 0.5s ease-in-out infinite',
              }}
            >
              🔥 {combo}x Combo!
            </div>
          )}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#a7b0b8', fontSize: 14 }}>Pizza Progress</div>
          <div style={{ color: '#f4f6f8', fontSize: 24, fontWeight: 700 }}>
            {collectedIngredients.length}/{REQUIRED_INGREDIENTS.length}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: 'center' }}>
            {REQUIRED_INGREDIENTS.map(ing => (
              <div
                key={ing.id}
                style={{
                  fontSize: 18,
                  opacity: collectedIngredients.find(c => c.id === ing.id) ? 1 : 0.2,
                  transition: 'opacity 0.3s',
                }}
              >
                {ing.emoji}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div>
            <div style={{ color: '#a7b0b8', fontSize: 14 }}>⏱ Time</div>
            <div style={{ color: timeLeft < 10 ? '#ef4444' : '#f4f6f8', fontSize: 24, fontWeight: 700 }}>
              {Math.ceil(timeLeft)}s
            </div>
          </div>
          <div>
            <div style={{ color: '#a7b0b8', fontSize: 14 }}>Speed</div>
            <div style={{ color: '#f4f6f8', fontSize: 20, fontWeight: 700 }}>
              {fallSpeedRef.current.toFixed(1)}x
            </div>
          </div>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to quit?')) {
                endGame();
              }
            }}
            style={{
              background: 'rgba(239,68,68,0.8)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              color: '#fff',
              padding: '8px 16px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            ✕ Quit
          </button>
        </div>
      </div>

      {/* Falling Items */}
      {fallingItems.map(item => (
        <div
          key={item.uniqueId}
          style={{
            position: 'absolute',
            left: `${item.x}%`,
            top: `${item.y}%`,
            fontSize: item.size,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            opacity: item.caught || item.missed ? 0 : 1,
            transition: item.caught || item.missed ? 'opacity 0.2s' : 'none',
          }}
        >
          {item.emoji}
        </div>
      ))}

      {/* Score Popups */}
      {scorePopups.map(popup => (
        <div
          key={popup.id}
          style={{
            position: 'absolute',
            left: `${popup.x}%`,
            top: `${popup.y}%`,
            transform: 'translate(-50%, -50%)',
            color: popup.points > 0 ? '#10b981' : '#ef4444',
            fontSize: 24,
            fontWeight: 700,
            opacity: popup.opacity,
            pointerEvents: 'none',
          }}
        >
          {popup.points > 0 ? '+' : ''}{popup.points}
        </div>
      ))}

      {/* Catcher (Deep Dish Pan) */}
      <div
        style={{
          position: 'absolute',
          left: `${catcherX}%`,
          bottom: '5%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Collected ingredients stacked on dough */}
        <div style={{ display: 'flex', gap: 4, marginBottom: -20, flexWrap: 'wrap', maxWidth: 120, justifyContent: 'center' }}>
          {collectedIngredients.map((ing, idx) => (
            <div key={ing.id} style={{ fontSize: 24, zIndex: 100 + idx }}>
              {ing.emoji}
            </div>
          ))}
        </div>
        {/* Pizza Dough */}
        <div style={{ fontSize: 80 }}>🫓</div>
      </div>
    </div>
  );

  const renderFinished = () => {
    const timeTaken = endTime && startTime ? (endTime - startTime) / 1000 : 0;
    const isComplete = collectedIngredients.length === REQUIRED_INGREDIENTS.length;
    const accuracyPercent = (collectedIngredients.length / REQUIRED_INGREDIENTS.length) * 100;

    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 24px', color: '#f4f6f8', fontSize: 32 }}>
          {isComplete ? '🍕 Pizza Complete!' : 'Game Over!'}
        </h2>

        <div
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: 16,
            padding: 32,
            marginBottom: 24,
          }}
        >
          <div style={{ color: 'white', fontSize: 18, marginBottom: 8 }}>Final Score</div>
          <div style={{ color: 'white', fontSize: 56, fontWeight: 700 }}>
            {score.toLocaleString()}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
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
              Ingredients
            </div>
            <div style={{ color: '#f4f6f8', fontSize: 28, fontWeight: 600 }}>
              {collectedIngredients.length}/{REQUIRED_INGREDIENTS.length}
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
              {timeTaken.toFixed(1)}s
            </div>
          </div>
        </div>

        <GameLeaderboard
          game="deep-dish-toss"
          currentScore={score}
          currentAccuracy={accuracyPercent}
          currentTime={timeTaken}
        />

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            onClick={startGame}
            style={{
              flex: 1,
              padding: '16px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
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
  };

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
        if (e.target === e.currentTarget && gameState !== 'playing') {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1f26 0%, #242a33 100%)',
          borderRadius: 20,
          maxWidth: '95vw',
          maxHeight: '95vh',
          width: '100%',
          maxWidth: 900,
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
        {gameState !== 'playing' && (
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
              🍕 Deep Dish Toss
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
        )}

        {/* Game Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {gameState === 'instructions' && renderInstructions()}
          {gameState === 'playing' && renderPlaying()}
          {gameState === 'finished' && renderFinished()}
        </div>
      </div>
    </div>
  );
}
