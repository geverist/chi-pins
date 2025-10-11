import { useState, useEffect, memo } from 'react'
import { speak as elevenLabsSpeak, shouldUseElevenLabs, getElevenLabsOptions } from '../lib/elevenlabs'
import { useAdminSettings } from '../state/useAdminSettings'

function WalkupAttractor({
  active,
  onDismiss,
  voiceEnabled,
  enabledFeatures = [],
  businessName = "Chicago Mike's",
  rotationSeconds = 4,
  customPrompts = [] // Array of {emoji, text, subtext, voiceText}
}) {
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0)
  const { settings: adminSettings } = useAdminSettings()

  // Default prompts (used when no custom prompts provided)
  const defaultPrompts = [
    {
      emoji: "📍",
      text: "Welcome to Chicago Mike's",
      subtext: "Mark your spot on our map",
      voiceText: "Welcome to Chicago Mike's"
    }
  ]

  // Use custom prompts if provided, otherwise use defaults
  const prompts = customPrompts.length > 0 ? customPrompts : defaultPrompts
  const currentPrompt = prompts[currentPromptIndex]

  // Rotate prompts if more than one
  useEffect(() => {
    if (!active || prompts.length <= 1) return

    const interval = setInterval(() => {
      setCurrentPromptIndex((prev) => (prev + 1) % prompts.length)
    }, rotationSeconds * 1000)

    return () => clearInterval(interval)
  }, [active, prompts.length, rotationSeconds])

  // Speak the voice prompt when it changes
  useEffect(() => {
    if (!active) return

    // DEMO: Always use voice greeting regardless of voiceEnabled setting
    const voiceText = currentPrompt?.voiceText || "Welcome to Chicago Mike's"

    const speakGreeting = async () => {
      console.log('[WalkupAttractor] 🎤 Starting voice greeting:', voiceText)

      // Try ElevenLabs first if configured
      if (shouldUseElevenLabs(adminSettings)) {
        console.log('[WalkupAttractor] ✅ ElevenLabs configured, attempting TTS...')
        try {
          const options = getElevenLabsOptions(adminSettings)
          console.log('[WalkupAttractor] ElevenLabs options:', {
            apiKey: options.apiKey ? `${options.apiKey.substring(0, 10)}...` : 'MISSING',
            voiceId: options.voiceId || 'MISSING',
            model: options.model
          })
          await elevenLabsSpeak(voiceText, options)
          console.log('[WalkupAttractor] ✅ ElevenLabs voice greeting completed successfully!')
          return
        } catch (error) {
          console.error('[WalkupAttractor] ❌ ElevenLabs failed:', error)
          console.error('[WalkupAttractor] Error details:', {
            message: error.message,
            stack: error.stack
          })
        }
      } else {
        console.log('[WalkupAttractor] ⚠️  ElevenLabs not configured:', {
          ttsProvider: adminSettings.ttsProvider,
          hasApiKey: !!adminSettings.elevenlabsApiKey,
          hasVoiceId: !!adminSettings.elevenlabsVoiceId
        })
      }

      // Web Speech API is not available in Android WebView
      // Silently skip voice greeting on Android
      console.log('[WalkupAttractor] Voice greeting unavailable (Android WebView)')
    }

    // Wait 1 second before speaking to avoid overlap
    const timeout = setTimeout(speakGreeting, 1000)

    return () => {
      clearTimeout(timeout)
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [currentPromptIndex, active, currentPrompt, adminSettings])

  if (!active) return null

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        animation: 'fadeIn 0.5s ease-in',
      }}
    >
      {/* Main content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          color: 'white',
          maxWidth: '600px',
          padding: '40px',
        }}
      >
        {/* Animated Pin with Halo Effect */}
        <div
          style={{
            position: 'relative',
            marginBottom: '48px',
            perspective: '800px',
            perspectiveOrigin: '50% 50%',
          }}
        >
          {/* Giant Pin */}
          <div style={{
            position: 'relative',
            zIndex: 10,
            fontSize: '120px',
            lineHeight: '1',
            textAlign: 'center',
            filter: 'drop-shadow(0 10px 30px rgba(0, 0, 0, 0.3))',
            animation: 'pinBounce 2s ease-in-out infinite',
          }}>
            📍
          </div>

          {/* Shadow and Ripples Container - stays at ground level */}
          <div style={{
            position: 'relative',
            width: '300px',
            margin: '-90px auto 0',
            height: '300px',
          }}>
            {/* Water Ripple 1 - Fast, starts on impact with gradient border */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              zIndex: 0,
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: '4px solid rgba(56, 189, 248, 0.8)',
              boxShadow: '0 0 20px rgba(56, 189, 248, 0.6), inset 0 0 15px rgba(56, 189, 248, 0.3)',
              transform: 'translate(-50%, -50%) rotateX(60deg) scale(0.3)',
              animation: 'waterRipple 2s ease-out infinite',
              transformStyle: 'preserve-3d',
            }} />

            {/* Water Ripple 2 - Medium speed with cyan */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              zIndex: 0,
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: '4px solid rgba(125, 211, 252, 0.7)',
              boxShadow: '0 0 18px rgba(125, 211, 252, 0.5), inset 0 0 12px rgba(125, 211, 252, 0.2)',
              transform: 'translate(-50%, -50%) rotateX(60deg) scale(0.3)',
              animation: 'waterRipple 2s ease-out infinite 0.15s',
              transformStyle: 'preserve-3d',
            }} />

            {/* Water Ripple 3 - Slower with white */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              zIndex: 0,
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: '3px solid rgba(255, 255, 255, 0.6)',
              boxShadow: '0 0 15px rgba(255, 255, 255, 0.4)',
              transform: 'translate(-50%, -50%) rotateX(60deg) scale(0.3)',
              animation: 'waterRipple 2s ease-out infinite 0.3s',
              transformStyle: 'preserve-3d',
            }} />

            {/* Water Ripple 4 - Slower still with light blue */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              zIndex: 0,
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: '3px solid rgba(186, 230, 253, 0.5)',
              boxShadow: '0 0 12px rgba(186, 230, 253, 0.3)',
              transform: 'translate(-50%, -50%) rotateX(60deg) scale(0.3)',
              animation: 'waterRipple 2s ease-out infinite 0.45s',
              transformStyle: 'preserve-3d',
            }} />

            {/* Water Ripple 5 - Slowest, largest with fade */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              zIndex: 0,
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: '2px solid rgba(240, 249, 255, 0.4)',
              boxShadow: '0 0 10px rgba(240, 249, 255, 0.2)',
              transform: 'translate(-50%, -50%) rotateX(60deg) scale(0.3)',
              animation: 'waterRipple 2s ease-out infinite 0.6s',
              transformStyle: 'preserve-3d',
            }} />

            {/* Center glow on impact - enhanced with color */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              zIndex: 0,
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(56, 189, 248, 0.6) 0%, rgba(255, 255, 255, 0.3) 40%, transparent 70%)',
              transform: 'translate(-50%, -50%) rotateX(60deg)',
              animation: 'impactGlow 2s ease-out infinite',
              transformStyle: 'preserve-3d',
              boxShadow: '0 0 30px rgba(56, 189, 248, 0.8)',
            }} />

            {/* Shadow below pin */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              zIndex: 0,
              width: '120px',
              height: '120px',
              background: 'radial-gradient(circle, rgba(0,0,0,0.3) 0%, transparent 70%)',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              animation: 'shadowPulse 2s ease-in-out infinite',
            }} />
          </div>
        </div>

        {/* Main text */}
        <h1
          key={currentPromptIndex}
          style={{
            fontSize: '96px',
            fontWeight: '900',
            marginBottom: '24px',
            color: 'white',
            textShadow: '0 0 15px rgba(0,0,0,1), 0 0 30px rgba(0,0,0,0.9), 3px 3px 6px rgba(0,0,0,1), -3px -3px 6px rgba(0,0,0,1)',
            WebkitTextStroke: '3px rgba(0,0,0,0.9)',
            paintOrder: 'stroke fill',
            animation: 'slideIn 0.5s ease-out',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          {currentPrompt?.text || 'Welcome!'}
        </h1>

        {/* Subtext */}
        <p
          key={`sub-${currentPromptIndex}`}
          style={{
            fontSize: '36px',
            marginBottom: '48px',
            color: 'white',
            opacity: 1,
            fontWeight: '600',
            textShadow: '0 0 12px rgba(0,0,0,1), 0 0 20px rgba(0,0,0,0.8), 3px 3px 4px rgba(0,0,0,1), -2px -2px 4px rgba(0,0,0,1)',
            WebkitTextStroke: '1.5px rgba(0,0,0,0.7)',
            paintOrder: 'stroke fill',
            animation: 'slideIn 0.5s ease-out 0.1s both',
          }}
        >
          {currentPrompt?.subtext || 'Tap anywhere to begin'}
        </p>

        {/* Tap indicator */}
        <div
          style={{
            fontSize: '28px',
            fontWeight: '700',
            padding: '24px 48px',
            background: 'rgba(255, 255, 255, 0.35)',
            borderRadius: '50px',
            display: 'inline-block',
            border: '3px solid rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(12px)',
            textShadow: '0 0 8px rgba(0,0,0,0.9), 2px 2px 3px rgba(0,0,0,1)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          👆 Tap anywhere to begin
        </div>

        {/* Voice indicator */}
        {voiceEnabled && (
          <div
            style={{
              marginTop: '32px',
              fontSize: '16px',
              opacity: 0.8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>🎤</span>
            <span>Voice assistant active</span>
          </div>
        )}
      </div>

      {/* Progress dots - only show if multiple prompts */}
      {prompts.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            gap: '12px',
            zIndex: 1,
          }}
        >
          {prompts.map((_, index) => (
            <div
              key={index}
              style={{
                width: index === currentPromptIndex ? '32px' : '12px',
                height: '12px',
                borderRadius: '6px',
                background: index === currentPromptIndex
                  ? 'rgba(255, 255, 255, 0.9)'
                  : 'rgba(255, 255, 255, 0.3)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }

        @keyframes pinBounce {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-30px) scale(1.05);
          }
        }

        @keyframes shadowPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(0.8);
            opacity: 0.5;
          }
        }

        @keyframes waterRipple {
          0% {
            transform: translate(-50%, -50%) rotateX(60deg) scale(0.3);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) rotateX(60deg) scale(4.5);
            opacity: 0;
          }
        }

        @keyframes impactGlow {
          0%, 10% {
            transform: translate(-50%, -50%) rotateX(60deg) scale(1);
            opacity: 0.8;
          }
          40% {
            transform: translate(-50%, -50%) rotateX(60deg) scale(1.3);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, -50%) rotateX(60deg) scale(1);
            opacity: 0;
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-15px);
          }
        }

        @keyframes wave {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-25deg);
          }
          75% {
            transform: rotate(25deg);
          }
        }

        @keyframes blink {
          0%, 48%, 52%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }

        @keyframes bubble {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.95;
          }
        }
      `}</style>
    </div>
  )
}

// Memoize WalkupAttractor to prevent re-renders when props haven't changed
// This is particularly important due to the heavy animations and voice synthesis
export default memo(WalkupAttractor, (prevProps, nextProps) => {
  // Deep compare customPrompts array
  const promptsEqual =
    prevProps.customPrompts.length === nextProps.customPrompts.length &&
    prevProps.customPrompts.every((p, i) => {
      const np = nextProps.customPrompts[i]
      return p?.emoji === np?.emoji &&
             p?.text === np?.text &&
             p?.subtext === np?.subtext &&
             p?.voiceText === np?.voiceText
    })

  return (
    prevProps.active === nextProps.active &&
    prevProps.voiceEnabled === nextProps.voiceEnabled &&
    prevProps.businessName === nextProps.businessName &&
    prevProps.rotationSeconds === nextProps.rotationSeconds &&
    prevProps.onDismiss === nextProps.onDismiss &&
    prevProps.enabledFeatures === nextProps.enabledFeatures &&
    promptsEqual
  )
})
