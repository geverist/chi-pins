// src/components/VoiceAssistant.jsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Voice Assistant Component
 *
 * Provides speech-to-text and AI-powered voice responses for kiosk interactions.
 * Optional starting point for hands-free kiosk navigation.
 *
 * Features:
 * - Speech recognition (Web Speech API + OpenAI Whisper fallback)
 * - AI responses (OpenAI GPT-4)
 * - Text-to-speech (Web Speech API + ElevenLabs fallback)
 * - Wake word detection ("Hey Kiosk")
 * - Industry-specific context
 * - Multi-language support
 */

export default function VoiceAssistant({
  locationId,
  industry,
  enabled = false,
  wakeWord = 'hey kiosk',
  language = 'en-US'
}) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState(null);

  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    loadSettings();
    initializeSpeechRecognition();
    initializeSpeechSynthesis();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [enabled, language]);

  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .from('location_widgets')
        .select('configuration')
        .eq('location_id', locationId)
        .eq('widget_id', (await supabase
          .from('marketplace_widgets')
          .select('id')
          .eq('slug', 'ai-voice-agent')
          .single()
        ).data?.id)
        .single();

      if (data) {
        setSettings(data.configuration);
      }
    } catch (err) {
      console.error('Error loading voice assistant settings:', err);
    }
  }

  function initializeSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
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

      // Check for wake word
      if (transcriptText.toLowerCase().includes(wakeWord.toLowerCase())) {
        // Wake word detected - process the command
        if (lastResult.isFinal) {
          processVoiceCommand(transcriptText);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setError(`Recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if still enabled
      if (enabled) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (err) {
            console.log('Recognition already started');
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error('Error starting recognition:', err);
    }
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
      // Remove wake word from command
      const cleanCommand = command
        .toLowerCase()
        .replace(wakeWord.toLowerCase(), '')
        .trim();

      // Get AI response
      const aiResponse = await getAIResponse(cleanCommand);

      setResponse(aiResponse);

      // Speak the response
      await speakResponse(aiResponse);

      // Log interaction
      await logInteraction(cleanCommand, aiResponse);

    } catch (err) {
      console.error('Error processing voice command:', err);
      setError('Sorry, I had trouble processing that. Please try again.');
      await speakResponse("Sorry, I had trouble processing that. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function getAIResponse(userMessage) {
    // Call OpenAI API through backend
    const { data, error } = await supabase.functions.invoke('ai-voice-agent', {
      body: {
        message: userMessage,
        locationId,
        industry,
        context: {
          currentPage: window.location.pathname,
          language,
          settings
        }
      }
    });

    if (error) throw error;
    return data.response;
  }

  async function speakResponse(text) {
    return new Promise((resolve, reject) => {
      setIsSpeaking(true);

      // Use Web Speech API for text-to-speech
      if (synthRef.current) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = settings?.speechRate || 1.0;
        utterance.pitch = settings?.speechPitch || 1.0;
        utterance.volume = settings?.speechVolume || 1.0;

        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };

        utterance.onerror = (err) => {
          setIsSpeaking(false);
          reject(err);
        };

        synthRef.current.speak(utterance);
      } else {
        // Fallback to ElevenLabs API (if configured)
        speakWithElevenLabs(text)
          .then(resolve)
          .catch(reject);
      }
    });
  }

  async function speakWithElevenLabs(text) {
    // ElevenLabs integration for higher quality voice
    const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
      body: {
        text,
        voice_id: settings?.elevenLabsVoiceId || 'default',
        model_id: 'eleven_monolingual_v1'
      }
    });

    if (error) throw error;

    // Play audio
    const audio = new Audio(data.audioUrl);
    setIsSpeaking(true);

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        setIsSpeaking(false);
        resolve();
      };

      audio.onerror = (err) => {
        setIsSpeaking(false);
        reject(err);
      };

      audio.play();
    });
  }

  async function logInteraction(userMessage, aiResponse) {
    try {
      await supabase.from('voice_interactions').insert({
        location_id: locationId,
        user_message: userMessage,
        ai_response: aiResponse,
        language,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error logging interaction:', err);
    }
  }

  function toggleListening() {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  }

  if (!enabled) {
    return null;
  }

  return (
    <div style={styles.container}>
      {/* Floating voice button */}
      <button
        style={{
          ...styles.voiceButton,
          ...(isListening ? styles.voiceButtonActive : {}),
          ...(isProcessing ? styles.voiceButtonProcessing : {}),
          ...(isSpeaking ? styles.voiceButtonSpeaking : {})
        }}
        onClick={toggleListening}
        aria-label="Voice Assistant"
      >
        {isProcessing && <Spinner />}
        {!isProcessing && !isSpeaking && (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        )}
        {isSpeaking && (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
          </svg>
        )}
      </button>

      {/* Transcript/Response overlay */}
      {(transcript || response) && (
        <div style={styles.overlay}>
          <div style={styles.overlayContent}>
            {transcript && (
              <div style={styles.transcriptSection}>
                <p style={styles.label}>You said:</p>
                <p style={styles.transcript}>{transcript}</p>
              </div>
            )}

            {response && (
              <div style={styles.responseSection}>
                <p style={styles.label}>Assistant:</p>
                <p style={styles.response}>{response}</p>
              </div>
            )}

            <button
              style={styles.closeButton}
              onClick={() => {
                setTranscript('');
                setResponse('');
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div style={styles.errorNotification}>
          {error}
          <button
            style={styles.errorClose}
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Status indicator */}
      <div style={styles.statusBar}>
        {isListening && (
          <div style={styles.statusItem}>
            <div style={styles.pulsingDot}></div>
            <span>Listening for "{wakeWord}"...</span>
          </div>
        )}
        {isProcessing && (
          <div style={styles.statusItem}>
            <Spinner size={16} />
            <span>Processing...</span>
          </div>
        )}
        {isSpeaking && (
          <div style={styles.statusItem}>
            <div style={styles.wavingBars}>
              <div style={styles.bar}></div>
              <div style={styles.bar}></div>
              <div style={styles.bar}></div>
            </div>
            <span>Speaking...</span>
          </div>
        )}
      </div>
    </div>
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
  container: {
    position: 'fixed',
    zIndex: 9998
  },
  voiceButton: {
    position: 'fixed',
    bottom: '30px',
    right: '30px',
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    zIndex: 9999
  },
  voiceButtonActive: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    boxShadow: '0 4px 30px rgba(245, 87, 108, 0.6)',
    animation: 'pulse 1.5s infinite'
  },
  voiceButtonProcessing: {
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  voiceButtonSpeaking: {
    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9997,
    padding: '20px'
  },
  overlayContent: {
    background: 'white',
    borderRadius: '16px',
    padding: '30px',
    maxWidth: '600px',
    width: '100%',
    position: 'relative',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  },
  transcriptSection: {
    marginBottom: '20px',
    paddingBottom: '20px',
    borderBottom: '1px solid #e5e7eb'
  },
  responseSection: {
    marginBottom: '0'
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    color: '#6b7280',
    marginBottom: '8px'
  },
  transcript: {
    fontSize: '18px',
    color: '#1f2937',
    lineHeight: '1.6',
    margin: 0
  },
  response: {
    fontSize: '18px',
    color: '#667eea',
    lineHeight: '1.6',
    margin: 0,
    fontWeight: '500'
  },
  closeButton: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    background: '#f3f4f6',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280'
  },
  errorNotification: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: '#fee2e2',
    color: '#991b1b',
    padding: '12px 40px 12px 16px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    zIndex: 10000,
    maxWidth: '400px'
  },
  errorClose: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'transparent',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#991b1b'
  },
  statusBar: {
    position: 'fixed',
    bottom: '120px',
    right: '30px',
    background: 'white',
    padding: '12px 20px',
    borderRadius: '24px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    zIndex: 9998
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500'
  },
  pulsingDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#ef4444',
    animation: 'pulse 1.5s infinite'
  },
  spinner: {
    border: '3px solid rgba(255, 255, 255, 0.3)',
    borderTop: '3px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  wavingBars: {
    display: 'flex',
    gap: '3px',
    alignItems: 'center',
    height: '16px'
  },
  bar: {
    width: '3px',
    background: '#667eea',
    borderRadius: '2px',
    animation: 'wave 1s ease-in-out infinite'
  }
};

// Add CSS animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.05); }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes wave {
      0%, 100% { height: 6px; }
      50% { height: 16px; }
    }

    ${styles.wavingBars} ${styles.bar}:nth-child(1) {
      animation-delay: 0s;
    }

    ${styles.wavingBars} ${styles.bar}:nth-child(2) {
      animation-delay: 0.2s;
    }

    ${styles.wavingBars} ${styles.bar}:nth-child(3) {
      animation-delay: 0.4s;
    }
  `;
  document.head.appendChild(style);
}
