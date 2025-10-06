// src/components/VoiceInput.jsx
import { useState, useRef, useEffect } from 'react';

export default function VoiceInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  list,
  ariaLabel,
  ...props
}) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onChange({ target: { value: transcript } });
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError('Could not recognize speech. Please try again.');
        setIsListening(false);
        setTimeout(() => setError(null), 3000);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onChange]);

  const startListening = () => {
    if (!recognitionRef.current) {
      setError('Voice input not supported in this browser');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsListening(true);
    setError(null);
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
      <input
        ref={inputRef}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        list={list}
        style={{
          flex: 1,
          paddingRight: '45px', // Make room for mic button
        }}
        {...props}
      />
      <button
        type="button"
        onClick={isListening ? stopListening : startListening}
        style={{
          position: 'absolute',
          right: '8px',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: 'none',
          background: isListening ? '#ef4444' : 'rgba(102, 126, 234, 0.9)',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          padding: 0,
        }}
        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
        title={isListening ? 'Stop listening' : 'Click to speak'}
      >
        {isListening ? (
          // Stop icon
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" />
          </svg>
        ) : (
          // Microphone icon
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        )}
      </button>
      {error && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '4px',
          fontSize: '12px',
          color: '#ef4444',
          whiteSpace: 'nowrap',
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
