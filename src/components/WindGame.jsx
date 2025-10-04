// src/components/WindGame.jsx
import { useState, useEffect, useRef } from 'react';
import GameLeaderboard from './GameLeaderboard';

const GAME_DURATION = 60; // 60 seconds
const GRAVITY = 0.3;
const DRAG_FORCE = 0.15;
const WIND_FORCE_BASE = 0.3; // Slower wind
const WIND_FORCE_MAX = 1.2; // Reduced max wind
const PLATFORM_Y = 70; // percentage from top
const MAX_POPCORN = 20; // Maximum popcorn pieces
const POPCORN_SPAWN_INTERVAL = 600; // ms between popcorn spawns - spawn faster
const POPCORN_SIZE = 28; // Size of popcorn piece emoji
const CONTINUOUS_WIND_SPEED = 0.15; // Constant gentle breeze

const FOOD_ITEMS = [
  { id: 'popcorn', name: 'Garrett Popcorn', emoji: '🍿', weight: 0.6, size: 60, hasPopcornPieces: true },
];

export default function WindGame({ onClose }) {
  const [gameState, setGameState] = useState('instructions');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [currentFood, setCurrentFood] = useState(FOOD_ITEMS[0]);
  const [foodPosition, setFoodPosition] = useState({ x: 50, y: 50 }); // percentage
  const [foodVelocity, setFoodVelocity] = useState({ x: 0, y: 0 });
  const [windDirection, setWindDirection] = useState(0); // -1 left, 0 none, 1 right
  const [windStrength, setWindStrength] = useState(0);
  const [windWarning, setWindWarning] = useState(null); // 'left', 'right', or null
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [dragStart, setDragStart] = useState(null);
  const [popcornPieces, setPopcornPieces] = useState([]);
  const [popcornCount, setPopcornCount] = useState(MAX_POPCORN);
  const [windGusts, setWindGusts] = useState([]);

  const gameLoopRef = useRef(null);
  const windTimerRef = useRef(null);
  const gameStartTime = useRef(null);
  const gameContainerRef = useRef(null);
  const isPlayingRef = useRef(false);
  const lastScoreTime = useRef(0);
  const popcornSpawnTimerRef = useRef(null);
  const nextPopcornId = useRef(0);
  const nextGustId = useRef(0);

  useEffect(() => {
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      if (windTimerRef.current) clearTimeout(windTimerRef.current);
      if (popcornSpawnTimerRef.current) clearTimeout(popcornSpawnTimerRef.current);
    };
  }, []);

  const startGame = () => {
    setGameState('playing');
    isPlayingRef.current = true;
    setScore(0);
    setTimeLeft(GAME_DURATION);
    const startFood = FOOD_ITEMS[0]; // Always use Garrett Popcorn
    setCurrentFood(startFood);
    setFoodPosition({ x: 50, y: 50 });
    setFoodVelocity({ x: 0, y: 0 });
    setWindDirection(1); // Start with gentle continuous wind
    setWindStrength(CONTINUOUS_WIND_SPEED);
    setWindWarning(null);
    setLives(3);
    setCombo(0);
    setDragStart(null);
    setPopcornPieces([]);
    setPopcornCount(MAX_POPCORN);
    nextPopcornId.current = 0;
    setWindGusts([]);
    nextGustId.current = 0;
    gameStartTime.current = Date.now();
    lastScoreTime.current = Date.now();

    startGameLoop();
    scheduleNextWind();
    schedulePopcornSpawn(); // Always spawn popcorn now
  };

  const startGameLoop = () => {
    const loop = () => {
      updateGame();
      gameLoopRef.current = requestAnimationFrame(loop);
    };
    gameLoopRef.current = requestAnimationFrame(loop);
  };

  const schedulePopcornSpawn = () => {
    if (!isPlayingRef.current || !currentFood.hasPopcornPieces) return;

    popcornSpawnTimerRef.current = setTimeout(() => {
      if (!isPlayingRef.current || !currentFood.hasPopcornPieces) return;

      setPopcornPieces(prev => {
        if (prev.length >= MAX_POPCORN) return prev;

        setFoodPosition(currentPos => {
          const newPiece = {
            id: nextPopcornId.current++,
            x: currentPos.x + (Math.random() * 16 - 8),
            y: currentPos.y + (Math.random() * 16 - 8),
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
          };

          setPopcornPieces(prevPieces => [...prevPieces, newPiece]);
          return currentPos;
        });

        return prev;
      });

      schedulePopcornSpawn();
    }, POPCORN_SPAWN_INTERVAL);
  };

  const scheduleNextWind = () => {
    if (!isPlayingRef.current) return;

    const now = Date.now();
    const elapsed = (now - gameStartTime.current) / 1000;

    // More frequent but weaker wind gusts
    const baseInterval = 4000; // Start at 4 seconds
    const minInterval = 2000; // Speed up to 2 seconds minimum
    const interval = Math.max(minInterval, baseInterval - (elapsed * 30));

    // Longer warning time
    const warningDelay = 1200;

    windTimerRef.current = setTimeout(() => {
      if (!isPlayingRef.current) return;

      // Alternate wind direction for variety
      const direction = Math.random() > 0.5 ? 'right' : 'left';
      setWindWarning(direction);

      // Trigger wind gust after warning
      setTimeout(() => {
        if (!isPlayingRef.current) return;

        const windDir = direction === 'right' ? 1 : -1;
        const strength = WIND_FORCE_BASE + (elapsed / 90) * (WIND_FORCE_MAX - WIND_FORCE_BASE);

        // Apply gust force on top of continuous wind
        setWindDirection(windDir);
        setWindStrength(CONTINUOUS_WIND_SPEED + strength);
        setWindWarning(null);

        // Spawn wind gust animations - moderate amount
        const gustCount = 8 + Math.floor(elapsed / 15);
        const newGusts = [];
        for (let i = 0; i < gustCount; i++) {
          newGusts.push({
            id: nextGustId.current++,
            y: Math.random() * 80 + 10,
            direction: windDir,
            delay: Math.random() * 0.3,
            duration: 3 + Math.random() * 2, // Slower animations
          });
        }
        setWindGusts(newGusts);

        // Gust lasts longer but is weaker
        const gustDuration = 1500 + Math.random() * 500;
        setTimeout(() => {
          if (!isPlayingRef.current) return;
          // Return to gentle continuous wind
          setWindDirection(Math.random() > 0.5 ? 1 : -1);
          setWindStrength(CONTINUOUS_WIND_SPEED);
          setWindGusts([]);
        }, gustDuration);

        scheduleNextWind();
      }, warningDelay);
    }, interval - warningDelay);
  };

  const updateGame = () => {
    const now = Date.now();
    const elapsed = (now - gameStartTime.current) / 1000;
    const newTimeLeft = Math.max(0, GAME_DURATION - elapsed);
    setTimeLeft(newTimeLeft);

    if (newTimeLeft <= 0) {
      endGame();
      return;
    }

    // Score points for keeping food on platform (every 0.1 seconds)
    if (now - lastScoreTime.current >= 100) {
      const pointsPerTick = 1;
      setScore(prev => prev + pointsPerTick);
      lastScoreTime.current = now;
    }

    // Update popcorn pieces physics
    if (currentFood.hasPopcornPieces && popcornPieces.length > 0) {
      setPopcornPieces(prev => {
        const updated = [];
        let lostCount = 0;

        prev.forEach(piece => {
          let newVx = piece.vx;
          let newVy = piece.vy;

          // Apply wind force (popcorn is lighter, more affected)
          if (windDirection !== 0) {
            newVx += windDirection * windStrength * 1.5;
          }

          // Apply drag
          newVx *= (1 - DRAG_FORCE * 0.8);
          newVy *= (1 - DRAG_FORCE * 0.8);

          // Light gravity
          newVy += GRAVITY * 0.5;

          // Cap velocities
          const maxVel = 12;
          newVx = Math.max(-maxVel, Math.min(maxVel, newVx));
          newVy = Math.max(-maxVel, Math.min(maxVel, newVy));

          const newX = piece.x + newVx * 0.1;
          const newY = piece.y + newVy * 0.1;

          // Check if popcorn fell off screen
          if (newX < -5 || newX > 105 || newY > 95) {
            lostCount++;
          } else {
            updated.push({
              ...piece,
              x: newX,
              y: newY,
              vx: newVx,
              vy: newVy,
            });
          }
        });

        // Update popcorn count and check for life loss
        if (lostCount > 0) {
          setPopcornCount(prevCount => {
            const newCount = Math.max(0, prevCount - lostCount);

            // Lose a life if all popcorn is gone
            if (newCount === 0 && prevCount > 0) {
              loseLife();
            }

            return newCount;
          });
        }

        return updated;
      });
    }

    setFoodPosition(prev => {
      setFoodVelocity(prevVel => {
        let newVelX = prevVel.x;
        let newVelY = prevVel.y;

        // Apply wind force
        if (windDirection !== 0) {
          newVelX += windDirection * windStrength;
        }

        // Apply drag when not being moved by user
        if (!dragStart) {
          newVelX *= (1 - DRAG_FORCE);
          newVelY *= (1 - DRAG_FORCE);
        }

        // Apply gravity if above platform
        if (prev.y < PLATFORM_Y - 2) {
          newVelY += GRAVITY;
        } else if (prev.y > PLATFORM_Y + 2) {
          // Gentle push back to platform if below
          newVelY -= GRAVITY * 0.5;
        } else {
          // On platform - dampen vertical velocity
          newVelY *= 0.8;
        }

        // Cap velocities
        const maxVel = 8;
        newVelX = Math.max(-maxVel, Math.min(maxVel, newVelX));
        newVelY = Math.max(-maxVel, Math.min(maxVel, newVelY));

        return { x: newVelX, y: newVelY };
      });

      const newX = prev.x + foodVelocity.x * 0.1;
      const newY = prev.y + foodVelocity.y * 0.1;

      // Check if food fell off screen
      if (newX < -10 || newX > 110 || newY > 100) {
        loseLife();
        return { x: 50, y: 50 }; // Reset position
      }

      // Boundary constraints
      const boundedX = Math.max(5, Math.min(95, newX));
      const boundedY = Math.max(10, Math.min(PLATFORM_Y + 5, newY));

      return { x: boundedX, y: boundedY };
    });
  };

  const loseLife = () => {
    setLives(prev => {
      const newLives = prev - 1;
      if (newLives <= 0) {
        endGame();
      }
      return newLives;
    });
    setCombo(0);
    setFoodVelocity({ x: 0, y: 0 });

    // Clear popcorn pieces and timers
    if (popcornSpawnTimerRef.current) {
      clearTimeout(popcornSpawnTimerRef.current);
    }
    setPopcornPieces([]);
    setPopcornCount(MAX_POPCORN);
    nextPopcornId.current = 0;

    // Change to new random food item
    const newFood = FOOD_ITEMS[Math.floor(Math.random() * FOOD_ITEMS.length)];
    setCurrentFood(newFood);

    // Start spawning popcorn if new food is popcorn
    if (newFood.hasPopcornPieces && isPlayingRef.current) {
      schedulePopcornSpawn();
    }
  };

  const endGame = () => {
    isPlayingRef.current = false;
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    if (windTimerRef.current) clearTimeout(windTimerRef.current);
    setGameState('finished');
  };

  const handleMouseDown = (e) => {
    if (gameState !== 'playing' || !gameContainerRef.current) return;

    const rect = gameContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Check if clicking near food
    const distance = Math.sqrt(
      Math.pow(x - foodPosition.x, 2) + Math.pow(y - foodPosition.y, 2)
    );

    if (distance < 15) {
      setDragStart({ x, y, foodX: foodPosition.x, foodY: foodPosition.y });
    }
  };

  const handleMouseMove = (e) => {
    if (!dragStart || gameState !== 'playing' || !gameContainerRef.current) return;

    const rect = gameContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;

    setFoodPosition({
      x: Math.max(5, Math.min(95, dragStart.foodX + deltaX)),
      y: Math.max(10, Math.min(PLATFORM_Y + 5, dragStart.foodY + deltaY)),
    });

    // Apply velocity based on drag
    setFoodVelocity({
      x: deltaX * 0.3,
      y: deltaY * 0.3,
    });
  };

  const handleMouseUp = () => {
    setDragStart(null);
  };

  const handleTouchStart = (e) => {
    if (gameState !== 'playing' || !gameContainerRef.current) return;

    const touch = e.touches[0];
    const rect = gameContainerRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;

    const distance = Math.sqrt(
      Math.pow(x - foodPosition.x, 2) + Math.pow(y - foodPosition.y, 2)
    );

    if (distance < 15) {
      setDragStart({ x, y, foodX: foodPosition.x, foodY: foodPosition.y });
    }
  };

  const handleTouchMove = (e) => {
    if (!dragStart || gameState !== 'playing' || !gameContainerRef.current) return;
    e.preventDefault();

    const touch = e.touches[0];
    const rect = gameContainerRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;

    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;

    setFoodPosition({
      x: Math.max(5, Math.min(95, dragStart.foodX + deltaX)),
      y: Math.max(10, Math.min(PLATFORM_Y + 5, dragStart.foodY + deltaY)),
    });

    setFoodVelocity({
      x: deltaX * 0.3,
      y: deltaY * 0.3,
    });
  };

  const handleTouchEnd = () => {
    setDragStart(null);
  };

  const renderInstructions = () => (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2 style={{ margin: '0 0 24px', color: '#f4f6f8', fontSize: 32 }}>
        💨 Chicago Wind Challenge!
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
          Chicago's famous wind is constantly blowing! Drag your Garrett Popcorn bag to protect it from wind gusts. A gentle breeze blows continuously, but watch out for strong gusts!
        </p>
        <p style={{ color: '#fbbf24', fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>
          🍿 Popcorn pieces will fly away in the wind! If you lose all your popcorn, you lose a life!
        </p>
        <p style={{ color: '#10b981', fontSize: 14, fontWeight: 600, margin: 0 }}>
          Survive for 60 seconds and keep your popcorn safe!
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div
          style={{
            background: 'rgba(59,130,246,0.1)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid rgba(59,130,246,0.3)',
          }}
        >
          <h4 style={{ margin: '0 0 12px', color: '#3b82f6', fontSize: 16 }}>
            💡 Tips
          </h4>
          <ul style={{ color: '#a7b0b8', fontSize: 14, textAlign: 'left', margin: 0, paddingLeft: 20 }}>
            <li>Watch for wind warnings (arrows)</li>
            <li>Drag food to counter wind gusts</li>
            <li>Keep food on the platform</li>
            <li>Wind gets stronger over time!</li>
          </ul>
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
            ❤️ Lives
          </h4>
          <p style={{ color: '#a7b0b8', fontSize: 14, margin: 0 }}>
            You have 3 lives. Lose a life if your food blows off the screen. Game over when you run out of lives!
          </p>
        </div>
      </div>

      <button
        onClick={startGame}
        style={{
          padding: '16px 48px',
          fontSize: 20,
          fontWeight: 700,
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          border: 'none',
          borderRadius: 12,
          color: 'white',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
        }}
      >
        🎮 Start Game
      </button>
    </div>
  );

  const renderPlaying = () => (
    <div
      ref={gameContainerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '500px',
        background: 'linear-gradient(180deg, #87ceeb 0%, #e0f6ff 100%)',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: dragStart ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Chicago Skyline Background */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '30%',
        background: 'linear-gradient(180deg, transparent 0%, rgba(40,40,40,0.3) 100%)',
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '10%',
          width: '20%',
          height: '80%',
          background: 'rgba(30,30,30,0.6)',
          borderRadius: '4px 4px 0 0',
        }} />
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '35%',
          width: '15%',
          height: '90%',
          background: 'rgba(30,30,30,0.6)',
          borderRadius: '4px 4px 0 0',
        }} />
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '55%',
          width: '25%',
          height: '70%',
          background: 'rgba(30,30,30,0.6)',
          borderRadius: '4px 4px 0 0',
        }} />
      </div>

      {/* Platform */}
      <div
        style={{
          position: 'absolute',
          top: `${PLATFORM_Y}%`,
          left: '10%',
          right: '10%',
          height: 8,
          background: 'linear-gradient(180deg, #8b4513 0%, #654321 100%)',
          borderRadius: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      />

      {/* Wind Warning */}
      {windWarning && (
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: windWarning === 'left' ? '10%' : 'auto',
            right: windWarning === 'right' ? '10%' : 'auto',
            fontSize: 48,
            animation: 'pulse 0.5s ease-in-out infinite',
            color: '#ff6b6b',
            textShadow: '0 0 10px rgba(255,107,107,0.5)',
          }}
        >
          {windWarning === 'left' ? '←' : '→'}
        </div>
      )}

      {/* Animated Wind Gusts */}
      {windGusts.map(gust => (
        <div
          key={gust.id}
          style={{
            position: 'absolute',
            top: `${gust.y}%`,
            left: gust.direction === 1 ? '-10%' : '110%',
            fontSize: 48,
            opacity: 0.9,
            animation: `windBlow${gust.direction === 1 ? 'Right' : 'Left'} ${gust.duration}s ease-out`,
            animationDelay: `${gust.delay}s`,
            pointerEvents: 'none',
            filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.5))',
          }}
        >
          💨
        </div>
      ))}

      {/* Popcorn Pieces */}
      {currentFood.hasPopcornPieces && popcornPieces.map(piece => {
        // Check if piece is flying away (near edges)
        const isFlyingAway = piece.x < 5 || piece.x > 95 || piece.y > 85;
        return (
          <div
            key={piece.id}
            style={{
              position: 'absolute',
              left: `${piece.x}%`,
              top: `${piece.y}%`,
              transform: `translate(-50%, -50%) rotate(${piece.x * 3}deg)`,
              fontSize: POPCORN_SIZE,
              pointerEvents: 'none',
              opacity: isFlyingAway ? 0 : 1,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              transition: isFlyingAway
                ? 'left 0.5s ease-out, top 0.5s ease-out, opacity 0.5s ease-out, transform 0.5s ease-out'
                : 'left 0.1s linear, top 0.1s linear, transform 0.2s linear',
            }}
          >
            🍿
          </div>
        );
      })}

      {/* Food Item */}
      <div
        style={{
          position: 'absolute',
          left: `${foodPosition.x}%`,
          top: `${foodPosition.y}%`,
          transform: 'translate(-50%, -50%)',
          fontSize: currentFood.size,
          pointerEvents: 'none',
          filter: dragStart ? 'brightness(1.2)' : 'none',
          transition: dragStart ? 'none' : 'filter 0.2s',
        }}
      >
        {currentFood.emoji}
      </div>

      {/* HUD */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{
          background: 'rgba(0,0,0,0.6)',
          padding: '8px 16px',
          borderRadius: 8,
          color: '#fff',
          fontWeight: 600,
          fontSize: 18,
        }}>
          ⏱️ {Math.ceil(timeLeft)}s
        </div>
        <div style={{
          background: 'rgba(0,0,0,0.6)',
          padding: '8px 16px',
          borderRadius: 8,
          color: '#10b981',
          fontWeight: 600,
          fontSize: 18,
        }}>
          🏆 {score}
        </div>
        {currentFood.hasPopcornPieces && (
          <div style={{
            background: 'rgba(0,0,0,0.6)',
            padding: '8px 16px',
            borderRadius: 8,
            color: '#fbbf24',
            fontWeight: 600,
            fontSize: 18,
          }}>
            🍿 {popcornCount}/{MAX_POPCORN}
          </div>
        )}
        <div style={{
          background: 'rgba(0,0,0,0.6)',
          padding: '8px 16px',
          borderRadius: 8,
          color: '#ef4444',
          fontWeight: 600,
          fontSize: 18,
        }}>
          {'❤️'.repeat(lives)}
        </div>
      </div>

      {/* Current Food Name */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.6)',
          padding: '8px 16px',
          borderRadius: 8,
          color: '#fff',
          fontWeight: 600,
          fontSize: 16,
          pointerEvents: 'none',
        }}
      >
        {currentFood.name}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
        @keyframes windBlowRight {
          0% { transform: translateX(0) scale(0.5); opacity: 0; }
          10% { opacity: 0.8; transform: translateX(10vw) scale(1); }
          80% { opacity: 0.8; }
          100% { transform: translateX(120vw) scale(1.2); opacity: 0; }
        }
        @keyframes windBlowLeft {
          0% { transform: translateX(0) scale(0.5); opacity: 0; }
          10% { opacity: 0.8; transform: translateX(-10vw) scale(1); }
          80% { opacity: 0.8; }
          100% { transform: translateX(-120vw) scale(1.2); opacity: 0; }
        }
      `}</style>
    </div>
  );

  const renderFinished = () => {
    const accuracy = timeLeft > 0 ? ((GAME_DURATION - timeLeft) / GAME_DURATION) * 100 : 100;

    return (
      <div style={{ padding: 40 }}>
        <h2 style={{ margin: '0 0 24px', textAlign: 'center', color: '#f4f6f8', fontSize: 32 }}>
          🎉 Game Over!
        </h2>

        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            padding: 32,
            marginBottom: 32,
            border: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>{currentFood.emoji}</div>
          <div style={{ fontSize: 48, fontWeight: 700, color: '#10b981', marginBottom: 16 }}>
            {score.toLocaleString()} points
          </div>
          <div style={{ color: '#a7b0b8', fontSize: 18 }}>
            You survived {Math.ceil(GAME_DURATION - timeLeft)} seconds in the Chicago wind!
          </div>
        </div>

        <GameLeaderboard
          game="chicago-wind"
          currentScore={score}
          currentTime={GAME_DURATION - timeLeft}
          viewOnly={false}
        />

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            onClick={startGame}
            style={{
              flex: 1,
              padding: '12px 24px',
              fontSize: 16,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              cursor: 'pointer',
            }}
          >
            🔄 Play Again
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 24px',
              fontSize: 16,
              fontWeight: 600,
              background: '#2a2f37',
              border: '1px solid #3a3f47',
              borderRadius: 8,
              color: 'white',
              cursor: 'pointer',
            }}
          >
            ← Back to Games
          </button>
        </div>
      </div>
    );
  };

  if (!open && gameState === 'instructions') return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.95)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 4000,
        padding: 20,
      }}
    >
      <div
        style={{
          background: '#1a1d23',
          borderRadius: 16,
          maxWidth: 900,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {gameState === 'instructions' && renderInstructions()}
        {gameState === 'playing' && (
          <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {renderPlaying()}
          </div>
        )}
        {gameState === 'finished' && renderFinished()}
      </div>
    </div>
  );
}
