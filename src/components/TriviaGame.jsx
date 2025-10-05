// src/components/TriviaGame.jsx
import { useState, useEffect, useRef } from 'react';
import { getRandomQuestions } from '../data/chicagoTrivia';
import GameLeaderboard from './GameLeaderboard';
import { useAdminSettings } from '../state/useAdminSettings';
import soundEffects from '../utils/soundEffects';
import { createSuccessEffect, createErrorEffect } from '../utils/particleEffects';
import achievementManager from '../utils/achievements';

export default function TriviaGame({ onClose }) {
  const { settings: adminSettings } = useAdminSettings();

  const QUESTION_TIME_LIMIT = adminSettings.triviaQuestionTimeLimit || 12;
  const TOTAL_QUESTIONS = adminSettings.triviaTotalQuestions || 8;
  const [gameState, setGameState] = useState('instructions'); // instructions, playing, finished
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [score, setScore] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  const gameStartTime = useRef(null);
  const questionStartTime = useRef(null);
  const timerRef = useRef(null);
  const [quickAnswers, setQuickAnswers] = useState(0);

  useEffect(() => {
    soundEffects.init();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startGame = () => {
    const selectedQuestions = getRandomQuestions(TOTAL_QUESTIONS);
    setQuestions(selectedQuestions);
    setGameState('playing');
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setTimeLeft(QUESTION_TIME_LIMIT);
    setScore(0);
    setAccuracy(0);
    setTotalTime(0);
    setQuickAnswers(0);
    gameStartTime.current = Date.now();
    questionStartTime.current = Date.now();

    soundEffects.playGameStart();
    soundEffects.vibrateShort();

    startTimer();
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeout();
          return QUESTION_TIME_LIMIT;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeout = () => {
    // Auto-submit with no answer
    submitAnswer(null);
  };

  const handleAnswerSelect = (answerIndex) => {
    if (showFeedback) return; // Prevent changing answer during feedback
    setSelectedAnswer(answerIndex);
  };

  const submitAnswer = (answerIndex) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) {
      console.error('No current question found at index', currentQuestionIndex);
      return;
    }

    const questionTime = (Date.now() - questionStartTime.current) / 1000;
    const isCorrect = answerIndex === currentQuestion.correctAnswer;

    // Track quick answers (< 5 seconds)
    if (isCorrect && questionTime < 5) {
      setQuickAnswers(prev => prev + 1);
    }

    const answerData = {
      questionId: currentQuestion.id,
      selectedAnswer: answerIndex,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect,
      timeSpent: questionTime,
    };

    setAnswers([...answers, answerData]);
    setShowFeedback(true);

    // Play sound and effects based on correctness
    if (isCorrect) {
      soundEffects.playSuccess();
      soundEffects.vibrateSuccess();
      // Create effect at center of screen
      const x = window.innerWidth / 2;
      const y = window.innerHeight / 2;
      createSuccessEffect(x, y);
    } else {
      soundEffects.playError();
      soundEffects.vibrateError();
      const x = window.innerWidth / 2;
      const y = window.innerHeight / 2;
      createErrorEffect(x, y);
    }

    // Wait 1.5 seconds to show feedback, then move to next question
    setTimeout(() => {
      setShowFeedback(false);
      setSelectedAnswer(null);

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setTimeLeft(QUESTION_TIME_LIMIT);
        questionStartTime.current = Date.now();
        startTimer();
      } else {
        finishGame([...answers, answerData]);
      }
    }, 1500);
  };

  const finishGame = (finalAnswers) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const gameEndTime = Date.now();
    const totalGameTime = (gameEndTime - gameStartTime.current) / 1000;
    setTotalTime(totalGameTime);

    // Calculate accuracy
    const correctCount = finalAnswers.filter(a => a.isCorrect).length;
    const accuracyPercent = (correctCount / finalAnswers.length) * 100;
    setAccuracy(accuracyPercent);

    // Calculate score
    // Base points: 1000 per correct answer
    const baseScore = correctCount * 1000;

    // Speed bonus: faster average time = more bonus
    const avgTimePerQuestion = totalGameTime / finalAnswers.length;
    const maxAvgTime = QUESTION_TIME_LIMIT;
    const speedBonus = Math.max(0, Math.min(3000, ((maxAvgTime - avgTimePerQuestion) / maxAvgTime) * 3000));

    // Accuracy multiplier
    const accuracyMultiplier = 1 + (accuracyPercent / 100);

    const totalScore = Math.round((baseScore + speedBonus) * accuracyMultiplier);
    setScore(totalScore);

    setGameState('finished');

    // Play game over sound
    soundEffects.playGameOver();
    soundEffects.vibrateLong();

    // Check achievements
    achievementManager.checkTriviaAchievements({
      correctCount,
      totalQuestions: finalAnswers.length,
      quickAnswers,
      accuracy: accuracyPercent,
    });
  };

  const currentQuestion = questions[currentQuestionIndex];

  const renderInstructions = () => (
    <div style={{ padding: 40, textAlign: 'center', overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <h2 style={{ margin: '0 0 24px', color: '#f4f6f8', fontSize: 32 }}>
        🧠 Chicago Trivia Challenge!
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
          Answer {TOTAL_QUESTIONS} multiple choice questions about Chicago history, culture, food, and more!
        </p>
        <p style={{ color: '#10b981', fontSize: 14, fontWeight: 600, margin: 0 }}>
          Each question has a {QUESTION_TIME_LIMIT} second time limit. The faster and more accurate you are, the higher your score!
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            background: 'rgba(59,130,246,0.1)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid rgba(59,130,246,0.3)',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          <div style={{ color: '#60a5fa', fontSize: 14, fontWeight: 600 }}>
            {TOTAL_QUESTIONS} Questions
          </div>
        </div>
        <div
          style={{
            background: 'rgba(16,185,129,0.1)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid rgba(16,185,129,0.3)',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏱️</div>
          <div style={{ color: '#10b981', fontSize: 14, fontWeight: 600 }}>
            {QUESTION_TIME_LIMIT}s Per Question
          </div>
        </div>
        <div
          style={{
            background: 'rgba(245,158,11,0.1)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid rgba(245,158,11,0.3)',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
          <div style={{ color: '#f59e0b', fontSize: 14, fontWeight: 600 }}>
            Speed + Accuracy
          </div>
        </div>
      </div>

      <button
        onClick={startGame}
        style={{
          padding: '16px 48px',
          borderRadius: 12,
          border: 'none',
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          color: 'white',
          fontSize: 20,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Start Trivia
      </button>
    </div>
  );

  const renderPlaying = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Progress Bar */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <div style={{ color: '#a7b0b8', fontSize: 14 }}>
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                color: timeLeft <= 5 ? '#ef4444' : '#10b981',
                fontSize: 24,
                fontWeight: 700,
                fontFamily: 'monospace',
              }}
            >
              {timeLeft}s
            </div>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to quit?')) {
                  if (timerRef.current) clearInterval(timerRef.current);
                  setGameState('instructions');
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
        <div
          style={{
            height: 8,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              background: timeLeft <= 5
                ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
              width: `${(timeLeft / QUESTION_TIME_LIMIT) * 100}%`,
              transition: 'width 1s linear',
            }}
          />
        </div>
      </div>

      {/* Question */}
      <div
        style={{
          flex: 1,
          padding: 40,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '6px 12px',
            borderRadius: 6,
            background: 'rgba(139,92,246,0.2)',
            border: '1px solid rgba(139,92,246,0.4)',
            fontSize: 12,
            fontWeight: 600,
            color: '#a78bfa',
            marginBottom: 16,
            alignSelf: 'flex-start',
          }}
        >
          {currentQuestion.category}
        </div>

        <h3
          style={{
            margin: '0 0 32px',
            color: '#f4f6f8',
            fontSize: 28,
            lineHeight: 1.4,
          }}
        >
          {currentQuestion.question}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === currentQuestion.correctAnswer;
            const showCorrect = showFeedback && isCorrect;
            const showIncorrect = showFeedback && isSelected && !isCorrect;

            return (
              <button
                key={index}
                onClick={() => !showFeedback && handleAnswerSelect(index)}
                disabled={showFeedback}
                style={{
                  padding: '20px 24px',
                  borderRadius: 12,
                  border: showCorrect
                    ? '2px solid #10b981'
                    : showIncorrect
                    ? '2px solid #ef4444'
                    : isSelected
                    ? '2px solid #3b82f6'
                    : '2px solid rgba(255,255,255,0.2)',
                  background: showCorrect
                    ? 'rgba(16,185,129,0.2)'
                    : showIncorrect
                    ? 'rgba(239,68,68,0.2)'
                    : isSelected
                    ? 'rgba(59,130,246,0.2)'
                    : 'rgba(255,255,255,0.05)',
                  color: '#f4f6f8',
                  fontSize: 18,
                  textAlign: 'left',
                  cursor: showFeedback ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{option}</span>
                {showCorrect && <span style={{ fontSize: 24 }}>✓</span>}
                {showIncorrect && <span style={{ fontSize: 24 }}>✗</span>}
              </button>
            );
          })}
        </div>

        {selectedAnswer !== null && !showFeedback && (
          <button
            onClick={() => submitAnswer(selectedAnswer)}
            style={{
              marginTop: 32,
              padding: '16px 32px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontSize: 18,
              fontWeight: 600,
              cursor: 'pointer',
              alignSelf: 'center',
            }}
          >
            Submit Answer
          </button>
        )}
      </div>
    </div>
  );

  const renderFinished = () => (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2 style={{ margin: '0 0 24px', color: '#f4f6f8', fontSize: 32 }}>
        Trivia Complete!
      </h2>

      <div
        style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
          gridTemplateColumns: 'repeat(3, 1fr)',
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
          <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
            {answers.filter(a => a.isCorrect).length}/{answers.length} correct
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
            Total Time
          </div>
          <div style={{ color: '#f4f6f8', fontSize: 28, fontWeight: 600 }}>
            {totalTime.toFixed(1)}s
          </div>
          <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
            {(totalTime / answers.length).toFixed(1)}s avg
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
            Difficulty
          </div>
          <div style={{ color: '#f4f6f8', fontSize: 20, fontWeight: 600 }}>
            Mixed
          </div>
          <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
            {TOTAL_QUESTIONS} questions
          </div>
        </div>
      </div>

      <GameLeaderboard
        game="chicago-trivia"
        currentScore={score}
        currentAccuracy={accuracy}
        currentTime={totalTime}
      />

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button
          onClick={startGame}
          style={{
            flex: 1,
            padding: '16px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
            🧠 Chicago Trivia Challenge
          </h2>
          <button
            onClick={onClose}
            disabled={gameState === 'playing'}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10,
              color: '#f4f6f8',
              padding: '8px 16px',
              cursor: gameState === 'playing' ? 'not-allowed' : 'pointer',
              fontSize: 16,
              opacity: gameState === 'playing' ? 0.5 : 1,
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
    </div>
  );
}
