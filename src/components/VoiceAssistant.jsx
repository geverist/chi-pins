// src/components/VoiceAssistant.jsx
import { useState, useEffect, useRef, memo } from 'react';
import { supabase } from '../lib/supabase';
import { getVoicePrompts } from '../config/voicePrompts';

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
  scrollSpeed = 60 // seconds for full scroll animation (configurable in admin)
}) {
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
    const prompts = [];
    const basePrompts = getVoicePrompts(industry);

    // Always include general prompts
    prompts.push("What can you help me with?");
    prompts.push("Tell me about this business");

    // Add feature-specific prompts based on what's enabled
    if (enabledFeatures.games || navSettings?.games?.enabled) {
      prompts.push("What games can I play?");
      prompts.push("Start a trivia game");
    }

    if (enabledFeatures.jukebox || navSettings?.jukebox?.enabled) {
      prompts.push("Play some music");
      prompts.push("What songs can I request?");
    }

    if (enabledFeatures.photoBooth || navSettings?.photoBooth?.enabled) {
      prompts.push("Take a photo");
      prompts.push("Where's the photo booth?");
    }

    if (enabledFeatures.feedback || navSettings?.feedback?.enabled) {
      prompts.push("Leave feedback");
      prompts.push("I want to give a review");
    }

    if (enabledFeatures.popularSpots || navSettings?.popularSpots?.enabled) {
      prompts.push("Show me popular spots");
      prompts.push("What's nearby?");
    }

    // Add industry-specific prompts (filter to unique)
    const industrySpecific = basePrompts.slice(0, 5);
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
      // Get AI response (mock for now - will integrate with backend)
      const aiResponse = await getAIResponse(command);
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

  async function getAIResponse(userMessage) {
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
    return new Promise((resolve) => {
      setIsSpeaking(true);

      if (synthRef.current) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };

        utterance.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };

        synthRef.current.speak(utterance);
      } else {
        setIsSpeaking(false);
        resolve();
      }
    });
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
      setIsListening(true);
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

  if (!enabled) {
    return null;
  }

  return (
    <>
      {/* Voice Assistant - just microphone and horizontal scrolling prompts */}
      {isOpen && (
        <>
          {/* Central Microphone - positioned below attractor overlay */}
          <div style={styles.microphoneWrapper}>
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
          <div style={styles.promptsContainer}>
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
    top: '70%', // Lowered to show more map
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 300, // Above footer/banner (250), independent of UI below
    pointerEvents: 'none',
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
    top: 'calc(70% + 100px)', // Just below microphone (at 70%)
    left: 0,
    right: 0,
    zIndex: 300, // Same level as microphone, above footer (50) and banners (200-250)
    overflow: 'hidden',
    pointerEvents: 'none',
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
    pointerEvents: 'auto',
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
