// src/components/WindGame.jsx
import { useState, useEffect, useRef } from 'react';
import { useAdminSettings } from '../state/useAdminSettings';
import GameLeaderboard from './GameLeaderboard';

export default function WindGame({ onClose }) {
  const { settings: adminSettings } = useAdminSettings();

  // Game settings from admin panel
  const GAME_DURATION = adminSettings.popcornGameDuration || 60;
  const STARTING_POPCORN = adminSettings.popcornStartingPieces || 20;
  const WIND_START_INTERVAL = adminSettings.popcornWindStartInterval || 4;
  const WIND_MIN_INTERVAL = adminSettings.popcornWindMinInterval || 2;
  const WIND_START_SPEED = adminSettings.popcornWindStartSpeed || 0.3;
  const WIND_MAX_SPEED = adminSettings.popcornWindMaxSpeed || 1.2;

  const [gameState, setGameState] = useState('instructions');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [popcornCount, setPopcornCount] = useState(STARTING_POPCORN);
  const [boxPosition, setBoxPosition] = useState({ x: 50, y: 70 }); // percentage
  const [windGusts, setWindGusts] = useState([]);
  const [windWarning, setWindWarning] = useState(null);
  const [flyingPopcorn, setFlyingPopcorn] = useState([]);
  const [touchStartPos, setTouchStartPos] = useState(null);

  const gameLoopRef = useRef(null);
  const windTimerRef = useRef(null);
  const gameStartTime = useRef(null);
  const gameContainerRef = useRef(null);
  const isPlayingRef = useRef(false);
  const lastScoreTime = useRef(0);
  const nextGustId = useRef(0);
  const nextPopcornId = useRef(0);

  useEffect(() => {
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      if (windTimerRef.current) clearTimeout(windTimerRef.current);
    };
  }, []);

  const startGame = () => {
    setGameState('playing');
    isPlayingRef.current = true;
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setPopcornCount(STARTING_POPCORN);
    setBoxPosition({ x: 50, y: 70 });
    setWindGusts([]);
    setWindWarning(null);
    setFlyingPopcorn([]);
    setTouchStartPos(null);
    nextGustId.current = 0;
    nextPopcornId.current = 0;
    gameStartTime.current = Date.now();
    lastScoreTime.current = Date.now();

    startGameLoop();
    scheduleNextWind();
  };

  const startGameLoop = () => {
    const loop = () => {
      updateGame();
      gameLoopRef.current = requestAnimationFrame(loop);
    };
    gameLoopRef.current = requestAnimationFrame(loop);
  };

  const scheduleNextWind = () => {
    if (!isPlayingRef.current) return;

    const now = Date.now();
    const elapsed = (now - gameStartTime.current) / 1000;

    // Calculate interval - gets faster over time
    const intervalRange = WIND_START_INTERVAL - WIND_MIN_INTERVAL;
    const progress = Math.min(elapsed / GAME_DURATION, 1);
    const interval = (WIND_START_INTERVAL - (intervalRange * progress)) * 1000;

    // Warning time before gust
    const warningDelay = 1200;

    windTimerRef.current = setTimeout(() => {
      if (!isPlayingRef.current) return;

      // Random direction
      const direction = Math.random() > 0.5 ? 'right' : 'left';
      setWindWarning(direction);

      // Trigger wind gust after warning
      setTimeout(() => {
        if (!isPlayingRef.current) return;

        const windDir = direction === 'right' ? 1 : -1;

        // Calculate wind strength - gets stronger over time
        const speedRange = WIND_MAX_SPEED - WIND_START_SPEED;
        const strength = WIND_START_SPEED + (speedRange * progress);

        // Spawn wind gust visual
        const gustCount = 12 + Math.floor(elapsed / 10);
        const newGusts = [];
        for (let i = 0; i < gustCount; i++) {
          newGusts.push({
            id: nextGustId.current++,
            y: Math.random() * 60 + 20, // Center area where box moves
            direction: windDir,
            delay: Math.random() * 0.3,
            duration: 2.5 + Math.random() * 1.5,
          });
        }
        setWindGusts(newGusts);

        // Check collision with box
        checkWindCollision(windDir, strength);

        // Clear gusts after animation
        setTimeout(() => {
          if (!isPlayingRef.current) return;
          setWindGusts([]);
        }, 3000);

        setWindWarning(null);
        scheduleNextWind();
      }, warningDelay);
    }, interval - warningDelay);
  };

  const checkWindCollision = (windDir, strength) => {
    // Wind gust comes from left (windDir = 1) or right (windDir = -1)
    const boxX = boxPosition.x;

    // If box is on the side where wind is coming from, it gets hit
    const isHit = (windDir === 1 && boxX < 50) || (windDir === -1 && boxX > 50);

    if (isHit) {
      losePopcorn(Math.ceil(strength * 2)); // Lose 1-3 pieces based on wind strength
    }
  };

  const losePopcorn = (count) => {
    setPopcornCount(prev => {
      const newCount = Math.max(0, prev - count);

      // Spawn flying popcorn animations
      const newFlying = [];
      for (let i = 0; i < count; i++) {
        newFlying.push({
          id: nextPopcornId.current++,
          x: boxPosition.x + (Math.random() * 10 - 5),
          y: boxPosition.y + (Math.random() * 10 - 5),
          targetX: Math.random() > 0.5 ? -20 : 120,
          targetY: -20 + Math.random() * 40,
        });
      }
      setFlyingPopcorn(prev => [...prev, ...newFlying]);

      // Remove flying popcorn after animation
      setTimeout(() => {
        setFlyingPopcorn(prev => prev.filter(p => !newFlying.find(n => n.id === p.id)));
      }, 2000);

      // Check if game over
      if (newCount === 0) {
        endGame();
      }

      return newCount;
    });
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

    // Score points every 0.1 seconds
    if (now - lastScoreTime.current >= 100) {
      const pointsPerTick = 1;
      setScore(prev => prev + pointsPerTick);
      lastScoreTime.current = now;
    }
  };

  const endGame = () => {
    isPlayingRef.current = false;
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    if (windTimerRef.current) clearTimeout(windTimerRef.current);
    setGameState('finished');
  };

  const handleTouchStart = (e) => {
    if (gameState !== 'playing' || !gameContainerRef.current) return;

    const touch = e.touches[0];
    const rect = gameContainerRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;

    setTouchStartPos({ x, y });
  };

  const handleTouchMove = (e) => {
    if (!touchStartPos || gameState !== 'playing' || !gameContainerRef.current) return;
    e.preventDefault();

    const touch = e.touches[0];
    const rect = gameContainerRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;

    // Update box position - constrain to play area
    setBoxPosition({
      x: Math.max(10, Math.min(90, x)),
      y: Math.max(20, Math.min(80, y)),
    });
  };

  const handleTouchEnd = () => {
    setTouchStartPos(null);
  };

  const handleMouseDown = (e) => {
    if (gameState !== 'playing' || !gameContainerRef.current) return;

    const rect = gameContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setTouchStartPos({ x, y });
  };

  const handleMouseMove = (e) => {
    if (!touchStartPos || gameState !== 'playing' || !gameContainerRef.current) return;

    const rect = gameContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setBoxPosition({
      x: Math.max(10, Math.min(90, x)),
      y: Math.max(20, Math.min(80, y)),
    });
  };

  const handleMouseUp = () => {
    setTouchStartPos(null);
  };

  const renderInstructions = () => (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2 style={{ margin: '0 0 24px', color: '#f4f6f8', fontSize: 32 }}>
        💨 Windy City Popcorn Challenge!
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
          Chicago's famous wind is trying to blow your Garrett Popcorn away!
          Touch and drag the popcorn box to avoid wind gusts coming from left and right.
        </p>
        <p style={{ color: '#fbbf24', fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>
          🍿 Each time a wind gust hits your box, popcorn flies away!
        </p>
        <p style={{ color: '#10b981', fontSize: 14, fontWeight: 600, margin: 0 }}>
          Survive for {GAME_DURATION} seconds without losing all your popcorn!
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
            <li>Watch for wind direction arrows</li>
            <li>Move to opposite side of gust</li>
            <li>Wind gets faster and stronger!</li>
            <li>Stay away from edges</li>
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
            🍿 Popcorn Count
          </h4>
          <p style={{ color: '#a7b0b8', fontSize: 14, margin: 0 }}>
            You start with {STARTING_POPCORN} pieces of popcorn. Game over when you run out!
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
        cursor: touchStartPos ? 'grabbing' : 'grab',
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

      {/* Wind Warning */}
      {windWarning && (
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: windWarning === 'left' ? '10%' : 'auto',
            right: windWarning === 'right' ? '10%' : 'auto',
            fontSize: 64,
            animation: 'pulse 0.5s ease-in-out infinite',
            color: '#ff6b6b',
            textShadow: '0 0 10px rgba(255,107,107,0.5)',
            fontWeight: 'bold',
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

      {/* Flying Popcorn Pieces */}
      {flyingPopcorn.map(piece => (
        <div
          key={piece.id}
          style={{
            position: 'absolute',
            left: `${piece.x}%`,
            top: `${piece.y}%`,
            fontSize: 28,
            pointerEvents: 'none',
            animation: `flyAway 2s ease-out forwards`,
            transformOrigin: 'center',
          }}
        >
          🍿
        </div>
      ))}

      {/* Popcorn Box */}
      <div
        style={{
          position: 'absolute',
          left: `${boxPosition.x}%`,
          top: `${boxPosition.y}%`,
          transform: 'translate(-50%, -50%)',
          fontSize: 80,
          pointerEvents: 'none',
          filter: touchStartPos ? 'brightness(1.2) drop-shadow(0 0 20px rgba(255,255,0,0.5))' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
          transition: touchStartPos ? 'none' : 'filter 0.2s',
        }}
      >
        🍿
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
        }}
      >
        <div style={{
          background: 'rgba(0,0,0,0.6)',
          padding: '8px 16px',
          borderRadius: 8,
          color: '#fff',
          fontWeight: 600,
          fontSize: 18,
          pointerEvents: 'none',
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
          pointerEvents: 'none',
        }}>
          🏆 {score}
        </div>
        <div style={{
          background: popcornCount < 5 ? 'rgba(239,68,68,0.8)' : 'rgba(0,0,0,0.6)',
          padding: '8px 16px',
          borderRadius: 8,
          color: popcornCount < 5 ? '#fff' : '#fbbf24',
          fontWeight: 600,
          fontSize: 18,
          animation: popcornCount < 5 ? 'pulse 0.5s ease-in-out infinite' : 'none',
          pointerEvents: 'none',
        }}>
          🍿 {popcornCount}/{STARTING_POPCORN}
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
            fontSize: 16,
          }}
        >
          ✕ Quit
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
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
        @keyframes flyAway {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(${Math.random() > 0.5 ? '' : '-'}200%, -300%) rotate(${720 + Math.random() * 360}deg) scale(0.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );

  const renderFinished = () => {
    const survivedTime = GAME_DURATION - timeLeft;
    const won = popcornCount > 0;

    return (
      <div style={{ padding: 40 }}>
        <h2 style={{ margin: '0 0 24px', textAlign: 'center', color: '#f4f6f8', fontSize: 32 }}>
          {won ? '🎉 You Won!' : '💨 Game Over!'}
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
          <div style={{ fontSize: 64, marginBottom: 16 }}>🍿</div>
          <div style={{ fontSize: 48, fontWeight: 700, color: won ? '#10b981' : '#fbbf24', marginBottom: 16 }}>
            {score.toLocaleString()} points
          </div>
          <div style={{ color: '#a7b0b8', fontSize: 18, marginBottom: 8 }}>
            {won
              ? `You survived the Chicago wind with ${popcornCount} pieces left!`
              : `You survived ${Math.ceil(survivedTime)} seconds before running out of popcorn!`
            }
          </div>
        </div>

        <GameLeaderboard
          game="windy-city-popcorn"
          currentScore={score}
          currentTime={survivedTime}
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
