// src/components/VoiceAssistant.jsx
import { useState, useEffect, useRef, memo } from 'react';
import { supabase } from '../lib/supabase';
import { getVoicePrompts } from '../config/voicePrompts';
import { getEnabledPrompts, getAIInstruction, DEFAULT_CUSTOM_PROMPTS } from '../config/customVoicePrompts';
import { shouldUseElevenLabs, getElevenLabsOptions, speak as elevenLabsSpeak } from '../lib/elevenlabs';
import { useAdminSettings } from '../state/useAdminSettings';
import { useLayoutStack } from '../hooks/useLayoutStack';

/**
 * Voice Assistant Modal Component
 *
 * Centered, semi-transparent modal overlay with suggested prompts.
 * Large microphone button for voice interaction.
 * Appears on the start screen for each industry demo.
 * Prompts are dynamically generated based on enabled kiosk features.
 */

function VoiceAssistant({
  locationId,
  industry,
  enabled = false,
  language = 'en-US',
  enabledFeatures = {},
  navSettings = {},
  onPlacePin = null,
  shouldShow = true,
  scrollSpeed = 60, // seconds for full scroll animation (configurable in admin)
  downloadingBarVisible = false,
  nowPlayingVisible = false,
  customVoicePrompts = [], // Custom configurable prompts from admin panel
}) {
  const { settings: adminSettings } = useAdminSettings();
  const [isOpen, setIsOpen] = useState(true); // Show on page load
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState(null);
  const [suggestedPrompts, setSuggestedPrompts] = useState([]);

  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    initializeSpeechRecognition();
    initializeSpeechSynthesis();
    generateDynamicPrompts();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [enabled, language, enabledFeatures, navSettings]);

  // Respond to shouldShow prop changes and reset state when reopening
  useEffect(() => {
    if (!shouldShow) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      // Reset all state when voice assistant reopens (e.g., after idle timer)
      setTranscript('');
      setResponse('');
      setError(null);
      setIsListening(false);
      setIsProcessing(false);
      setIsSpeaking(false);
    }
  }, [shouldShow]);

  function generateDynamicPrompts() {
    // Use custom prompts if configured, otherwise fall back to default behavior
    if (customVoicePrompts && customVoicePrompts.length > 0) {
      const enabled = getEnabledPrompts(customVoicePrompts);
      setSuggestedPrompts(enabled.map(p => p.text));
      return;
    }

    // Fall back to legacy dynamic prompt generation
    const prompts = [];
    const basePrompts = getVoicePrompts(industry);

    // Use defaults from customVoicePrompts as fallback
    const defaultPrompts = getEnabledPrompts(DEFAULT_CUSTOM_PROMPTS);

    // Filter defaults based on enabled features
    const filteredDefaults = defaultPrompts.filter(p => {
      if (p.category === 'general') return true;
      if (p.id === 'games' && (enabledFeatures.games || navSettings?.games?.enabled)) return true;
      if (p.id === 'music' && (enabledFeatures.jukebox || navSettings?.jukebox?.enabled)) return true;
      if (p.id === 'photo' && (enabledFeatures.photoBooth || navSettings?.photoBooth?.enabled)) return true;
      if (p.id === 'feedback' && (enabledFeatures.feedback || navSettings?.feedback?.enabled)) return true;
      if (p.id === 'popular' && (enabledFeatures.popularSpots || navSettings?.popularSpots?.enabled)) return true;
      return false;
    });

    // Add filtered default prompts
    filteredDefaults.forEach(p => prompts.push(p.text));

    // Add industry-specific prompts (filter to unique)
    const industrySpecific = basePrompts.slice(0, 3);
    industrySpecific.forEach(prompt => {
      if (!prompts.includes(prompt)) {
        prompts.push(prompt);
      }
    });

    setSuggestedPrompts(prompts);
  }

  function initializeSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      const transcriptText = lastResult[0].transcript;
      setTranscript(transcriptText);

      if (lastResult.isFinal) {
        processVoiceCommand(transcriptText);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);

      // Handle specific error types with user-friendly messages
      if (event.error === 'not-allowed' || event.error === 'not_allowed') {
        console.warn('[VoiceAssistant] Microphone permission denied - clearing error');
        // Don't show error to user, just stop listening
        setError(null);
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Try again.');
      } else if (event.error === 'audio-capture') {
        setError('Microphone not available');
      } else {
        setError(`Recognition error: ${event.error}`);
      }

      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }

  function initializeSpeechSynthesis() {
    if (!('speechSynthesis' in window)) {
      console.warn('[VoiceAssistant] Speech synthesis not supported - voice responses disabled');
      // Don't show error to user, just disable speech output
      synthRef.current = null;
      return;
    }
    synthRef.current = window.speechSynthesis;
  }

  async function processVoiceCommand(command) {
    setIsProcessing(true);

    try {
      // Get custom AI instruction for this command
      const aiInstruction = getAIInstruction(command, customVoicePrompts);

      // Get AI response with custom instruction if available
      const aiResponse = await getAIResponse(command, aiInstruction);
      setResponse(aiResponse);

      // Speak the response
      await speakResponse(aiResponse);

    } catch (err) {
      console.error('Error processing voice command:', err);
      setError('Sorry, I had trouble processing that. Please try again.');
      await speakResponse("Sorry, I had trouble processing that. Please try again.");
    } finally {
      setIsProcessing(false);
      setTranscript('');
    }
  }

  async function getAIResponse(userMessage, aiInstruction = null) {
    try {
      // Build context from enabled features
      const features = Object.entries(enabledFeatures)
        .filter(([_, enabled]) => enabled)
        .map(([feature, _]) => feature);

      const context = {
        locationName: navSettings.locationName,
        features,
      };

      const response = await fetch('/api/voice-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          industry,
          context,
          aiInstruction, // Pass custom AI instruction to backend
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Log if response was cached for debugging
      if (data.cached) {
        console.log('[VoiceAssistant] Used cached response');
      }

      return data.response;
    } catch (error) {
      console.error('[VoiceAssistant] API error:', error);

      // Fallback to generic response
      return "I'm having trouble connecting right now. Please try asking your question again, or feel free to explore the map to find what you need.";
    }
  }

  async function speakResponse(text) {
    setIsSpeaking(true);

    try {
      // Use ElevenLabs if configured, otherwise fall back to browser TTS
      if (shouldUseElevenLabs(adminSettings)) {
        const options = getElevenLabsOptions(adminSettings);
        await elevenLabsSpeak(text, options);
      } else if (synthRef.current) {
        // Browser TTS fallback
        await new Promise((resolve) => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = language;
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();

          synthRef.current.speak(utterance);
        });
      }
    } catch (error) {
      console.error('[VoiceAssistant] TTS error:', error);
      // Fail silently - don't interrupt user experience
    } finally {
      setIsSpeaking(false);
    }
  }

  async function startListening() {
    setTranscript('');
    setResponse('');
    setError(null);

    // Check microphone permission first (for browsers that support it)
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
        if (permissionStatus.state === 'denied') {
          console.warn('[VoiceAssistant] Microphone permission denied by user');
          setError(null); // Don't show error, just don't start
          return;
        }
      } catch (err) {
        // Permission API not supported or failed, continue anyway
        console.log('[VoiceAssistant] Permission check not available, attempting recognition');
      }
    }

    try {
      recognitionRef.current?.start();
      // Don't set isListening here - let the onstart callback handle it
      // This prevents the red flash when start() is called but hasn't actually started yet
    } catch (err) {
      console.error('[VoiceAssistant] Failed to start recognition:', err);
      setError(null); // Don't show error to user
      setIsListening(false);
    }
  }

  function handlePromptClick(prompt) {
    setTranscript(prompt);
    processVoiceCommand(prompt);
  }

  const { getBottomPosition } = useLayoutStack();

  if (!enabled) {
    return null;
  }

  // Get bottom stack position from layout system
  const bottomStackHeight = getBottomPosition('footer');

  // Microphone position - centered in lower third of screen, above all bottom elements
  const microphoneBottomPx = bottomStackHeight + 180; // 180px above the bottom stack

  // Prompts should be between microphone and footer
  const promptsBottomPx = bottomStackHeight + 80; // 80px above the bottom stack

  return (
    <>
      {/* Voice Assistant - just microphone and horizontal scrolling prompts */}
      {isOpen && (
        <>
          {/* Central Microphone - centered in lower viewport, above footer */}
          <div style={{
            ...styles.microphoneWrapper,
            bottom: `${microphoneBottomPx}px`,
            top: 'auto',
            left: '50%',
            transform: 'translateX(-50%)',
          }}>
            <div style={styles.microphoneContainer}>
              <button
                style={{
                  ...styles.centralMic,
                  ...(isListening ? styles.centralMicActive : {}),
                  ...(isProcessing ? styles.centralMicProcessing : {}),
                  ...(isSpeaking ? styles.centralMicSpeaking : {}),
                }}
                onClick={startListening}
                disabled={isProcessing || isSpeaking}
              >
                {isProcessing ? (
                  <Spinner size={48} />
                ) : (
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                )}
              </button>

              {/* Status Text - only show when active */}
              {(isListening || isProcessing || isSpeaking) && (
                <div style={styles.statusText}>
                  {isListening && (
                    <>
                      <div style={styles.pulsingDot}></div>
                      <span>Listening...</span>
                    </>
                  )}
                  {isProcessing && <span>Processing...</span>}
                  {isSpeaking && (
                    <>
                      <div style={styles.wavingBars}>
                        <div style={styles.bar}></div>
                        <div style={styles.bar}></div>
                        <div style={styles.bar}></div>
                      </div>
                      <span>Speaking...</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Conversation Display */}
            {(transcript || response) && (
              <div style={styles.conversationBox}>
                {transcript && (
                  <div style={styles.userMessage}>
                    <strong>You:</strong> {transcript}
                  </div>
                )}
                {response && (
                  <div style={styles.agentMessage}>
                    <strong>Agent:</strong> {response}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Horizontal Scrolling Prompts - positioned below microphone, above footer */}
          <div style={{
            ...styles.promptsContainer,
            bottom: `${promptsBottomPx}px`,
            top: 'auto',
          }}>
            <div style={styles.promptsList(scrollSpeed)}>
              {/* Double prompts for seamless infinite scroll with -50% translation */}
              {[...suggestedPrompts, ...suggestedPrompts].map((prompt, index) => (
                <button
                  key={index}
                  style={styles.promptChip}
                  onClick={() => handlePromptClick(prompt)}
                  disabled={isProcessing || isSpeaking || isListening}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Spinner({ size = 24 }) {
  return (
    <div
      style={{
        ...styles.spinner,
        width: `${size}px`,
        height: `${size}px`
      }}
    />
  );
}

const styles = {
  floatingButton: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'rgba(102, 126, 234, 0.9)',
    border: '2px solid white',
    color: 'white',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    zIndex: 1000,
    opacity: 0.7,
  },
  microphoneWrapper: {
    position: 'fixed',
    // top/bottom set dynamically in component
    left: '50%',
    // transform set dynamically in component
    zIndex: 400, // Above comments banner (250), footer (50), below header (500)
    pointerEvents: 'auto', // Make clickable
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  microphoneContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  centralMic: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
    pointerEvents: 'auto',
  },
  centralMicActive: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    boxShadow: '0 8px 40px rgba(245, 87, 108, 0.6)',
    transform: 'scale(1.05)',
  },
  centralMicProcessing: {
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    boxShadow: '0 8px 40px rgba(79, 172, 254, 0.6)',
  },
  centralMicSpeaking: {
    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    boxShadow: '0 8px 40px rgba(67, 233, 123, 0.6)',
  },
  statusText: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    fontWeight: '500',
    color: '#374151',
    minHeight: '24px',
  },
  conversationBox: {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  userMessage: {
    fontSize: '14px',
    color: '#1f2937',
    padding: '8px 12px',
    background: 'rgba(102, 126, 234, 0.1)',
    borderRadius: '8px',
  },
  agentMessage: {
    fontSize: '14px',
    color: '#0369a1',
    padding: '8px 12px',
    background: 'rgba(3, 105, 161, 0.1)',
    borderRadius: '8px',
  },
  errorDisplay: {
    width: '100%',
    background: 'rgba(254, 226, 226, 0.9)',
    color: '#991b1b',
    padding: '12px',
    borderRadius: '12px',
    fontSize: '14px',
    textAlign: 'center',
  },
  promptsContainer: {
    position: 'fixed',
    // top/bottom set dynamically in component
    left: 0,
    right: 0,
    zIndex: 400, // Same level as microphone, above footer (50) and banners (200-250)
    overflow: 'hidden',
    pointerEvents: 'auto', // Make clickable
    maxHeight: '80px', // Limit height to prevent overlap with footer buttons
  },
  promptsHeader: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '12px',
    textAlign: 'center',
  },
  promptsList: (scrollSpeed) => ({
    display: 'flex',
    flexDirection: 'row',
    gap: '12px',
    paddingBottom: '12px',
    paddingLeft: '20px',
    paddingRight: '20px',
    animation: `scrollPrompts ${scrollSpeed}s linear infinite`,
    willChange: 'transform',
  }),
  promptChip: {
    padding: '12px 24px',
    borderRadius: '24px',
    background: 'rgba(255, 255, 255, 0.95)',
    border: '2px solid rgba(102, 126, 234, 0.3)',
    color: '#374151',
    cursor: 'pointer',
    fontSize: '16px',
    textAlign: 'center',
    transition: 'all 0.2s ease',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    pointerEvents: 'none', // Don't intercept clicks - let them pass through to elements below
  },
  dismissHint: {
    fontSize: '12px',
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  pulsingDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#0369a1',
    animation: 'pulse 1.5s infinite',
  },
  spinner: {
    border: '3px solid rgba(102, 126, 234, 0.2)',
    borderTop: '3px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  wavingBars: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
    height: '20px',
  },
  bar: {
    width: '4px',
    background: '#0369a1',
    borderRadius: '2px',
    animation: 'wave 1s ease-in-out infinite',
  }
};

// Add CSS animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes wave {
      0%, 100% { height: 8px; }
      50% { height: 20px; }
    }

    @keyframes scrollPrompts {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    /* Hide scrollbar but keep scrolling functionality */
    div[style*="promptsList"] {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    div[style*="promptsList"]::-webkit-scrollbar {
      display: none;
    }

    /* Prompt chip hover effect */
    button[style*="promptChip"]:hover:not(:disabled) {
      background: rgba(102, 126, 234, 0.9) !important;
      color: white !important;
      border-color: rgba(102, 126, 234, 0.9) !important;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4) !important;
    }

    button[style*="floatingButton"]:hover {
      opacity: 1 !important;
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4) !important;
    }

    /* Central mic hover effect */
    button[style*="centralMic"]:hover:not(:disabled) {
      transform: scale(1.05);
    }
  `;
  document.head.appendChild(style);
}

export default memo(VoiceAssistant);
