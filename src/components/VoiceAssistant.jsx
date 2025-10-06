// src/components/VoiceAssistant.jsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getVoicePrompts } from '../config/voicePrompts';

/**
 * Voice Assistant Modal Component
 *
 * Modal overlay with suggested prompts and AI-powered voice interaction.
 * Appears on the start screen for each industry demo.
 * Prompts are dynamically generated based on enabled kiosk features.
 */

export default function VoiceAssistant({
  locationId,
  industry,
  enabled = false,
  wakeWord = 'hey kiosk',
  language = 'en-US',
  enabledFeatures = {},
  navSettings = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
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
      setError(`Recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }

  function initializeSpeechSynthesis() {
    if (!('speechSynthesis' in window)) {
      setError('Speech synthesis not supported in this browser');
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
    // Mock response for now - will integrate with Supabase Edge Function
    const mockResponses = {
      restaurant: "I'd be happy to help with your order! Our most popular item is the Chicago Dog with all the toppings. Would you like to add that to your order?",
      medspa: "Our signature facial treatment is very popular and takes about 60 minutes. Would you like to book an appointment?",
      auto: "Your vehicle service is currently in progress. The estimated completion time is 45 minutes. Would you like to add a tire rotation?",
      healthcare: "Your current wait time is approximately 15 minutes. Would you like to update your contact information while you wait?",
      fitness: "We have a spin class starting in 30 minutes with 3 spots available. Would you like me to book you in?",
      retail: "We just got new arrivals in the spring collection. Would you like me to show you what's trending?",
      banking: "Our checking accounts have no monthly fees with direct deposit. Would you like to schedule an appointment with a banker?",
      events: "The photo booth is located near the main entrance. Would you like me to start a photo session?",
      hospitality: "The hotel spa offers massage services from 9am-8pm. Would you like to book a treatment?",
    };

    return mockResponses[industry] || mockResponses.restaurant;
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

  function startListening() {
    setTranscript('');
    setResponse('');
    setError(null);
    recognitionRef.current?.start();
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
      {/* Small, subtle floating voice button - minimally intrusive */}
      <button
        style={styles.floatingButton}
        onClick={() => setIsOpen(true)}
        aria-label="Voice Assistant"
        title="Voice Assistant - Ask questions"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div style={styles.modalOverlay} onClick={() => !isListening && !isProcessing && setIsOpen(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={styles.header}>
              <div style={styles.headerIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </div>
              <div>
                <h2 style={styles.title}>AI Voice Agent</h2>
                <p style={styles.subtitle}>Say "{wakeWord}" or tap to speak</p>
              </div>
              <button
                style={styles.closeButton}
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Current Status */}
            {(isListening || isProcessing || isSpeaking) && (
              <div style={styles.statusCard}>
                {isListening && (
                  <div style={styles.statusContent}>
                    <div style={styles.pulsingDot}></div>
                    <span>Listening...</span>
                  </div>
                )}
                {isProcessing && (
                  <div style={styles.statusContent}>
                    <Spinner size={20} />
                    <span>Processing...</span>
                  </div>
                )}
                {isSpeaking && (
                  <div style={styles.statusContent}>
                    <div style={styles.wavingBars}>
                      <div style={styles.bar}></div>
                      <div style={styles.bar}></div>
                      <div style={styles.bar}></div>
                    </div>
                    <span>Speaking...</span>
                  </div>
                )}
              </div>
            )}

            {/* Transcript Display */}
            {transcript && (
              <div style={styles.transcriptCard}>
                <p style={styles.label}>You said:</p>
                <p style={styles.transcript}>{transcript}</p>
              </div>
            )}

            {/* Response Display */}
            {response && (
              <div style={styles.responseCard}>
                <p style={styles.label}>Assistant:</p>
                <p style={styles.response}>{response}</p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div style={styles.errorCard}>
                {error}
              </div>
            )}

            {/* Microphone Button */}
            <button
              style={{
                ...styles.micButton,
                ...(isListening ? styles.micButtonActive : {}),
              }}
              onClick={startListening}
              disabled={isProcessing || isSpeaking}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
              <span style={styles.micButtonText}>
                {isListening ? 'Listening...' : 'Tap to Speak'}
              </span>
            </button>

            {/* Suggested Prompts */}
            <div style={styles.promptsSection}>
              <p style={styles.promptsTitle}>Suggested questions:</p>
              <div style={styles.promptsScroll}>
                {suggestedPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    style={styles.promptButton}
                    onClick={() => handlePromptClick(prompt)}
                    disabled={isProcessing || isSpeaking || isListening}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
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
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
  },
  modalContent: {
    background: 'white',
    borderRadius: '24px',
    padding: '32px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '24px',
  },
  headerIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    flexShrink: 0,
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  closeButton: {
    marginLeft: 'auto',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#f3f4f6',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
    flexShrink: 0,
  },
  statusCard: {
    background: '#f0f9ff',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  statusContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '15px',
    color: '#0369a1',
    fontWeight: '500',
  },
  transcriptCard: {
    background: '#f9fafb',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  responseCard: {
    background: '#f0f9ff',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  errorCard: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    color: '#6b7280',
    marginBottom: '8px',
  },
  transcript: {
    fontSize: '16px',
    color: '#1f2937',
    lineHeight: '1.5',
    margin: 0,
  },
  response: {
    fontSize: '16px',
    color: '#0369a1',
    lineHeight: '1.5',
    margin: 0,
    fontWeight: '500',
  },
  micButton: {
    width: '100%',
    padding: '20px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
  },
  micButtonActive: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    boxShadow: '0 4px 24px rgba(245, 87, 108, 0.5)',
  },
  micButtonText: {
    fontSize: '16px',
    fontWeight: '600',
  },
  promptsSection: {
    marginTop: '24px',
  },
  promptsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '12px',
  },
  promptsScroll: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '240px',
    overflowY: 'auto',
    paddingRight: '8px',
  },
  promptButton: {
    padding: '12px 16px',
    borderRadius: '10px',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    color: '#374151',
    cursor: 'pointer',
    fontSize: '14px',
    textAlign: 'left',
    transition: 'all 0.2s ease',
    fontWeight: '500',
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

    /* Scrollbar styles */
    .promptsScroll::-webkit-scrollbar {
      width: 6px;
    }

    .promptsScroll::-webkit-scrollbar-track {
      background: #f3f4f6;
      border-radius: 3px;
    }

    .promptsScroll::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 3px;
    }

    .promptsScroll::-webkit-scrollbar-thumb:hover {
      background: #9ca3af;
    }

    /* Prompt button hover effect */
    button[style*="promptButton"]:hover:not(:disabled) {
      background: #667eea !important;
      color: white !important;
      border-color: #667eea !important;
      transform: translateY(-1px);
    }

    button[style*="floatingButton"]:hover {
      opacity: 1 !important;
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4) !important;
    }
  `;
  document.head.appendChild(style);
}
