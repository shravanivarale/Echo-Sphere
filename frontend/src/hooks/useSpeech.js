/**
 * useSpeech hook — wraps Web Speech API for TTS and STT.
 *
 * TTS: browser SpeechSynthesis (fallback — no API key needed).
 * STT: browser SpeechRecognition (Chrome/Edge only).
 *
 * In production, STT is replaced with Deepgram via Agora pipeline.
 * This hook gives us a working demo without any external keys.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export function useSpeech() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [sttAvailable, setSttAvailable] = useState(false);
  const [ttsAvailable, setTtsAvailable] = useState(false);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    // Check TTS availability
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      setTtsAvailable(true);
    }

    // Check STT availability
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSttAvailable(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const current = Array.from(event.results)
          .map((r) => r[0].transcript)
          .join('');
        setTranscript(current);
      };

      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognitionRef.current = recognition;
    }

    return () => {
      synthRef.current?.cancel();
      recognitionRef.current?.abort();
    };
  }, []);

  const speak = useCallback((text, onEnd) => {
    if (!ttsAvailable) {
      onEnd?.();
      return;
    }
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Pick a recognizable voice if available
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(
      (v) => v.name.includes('Google') || v.name.includes('Natural')
    );
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      onEnd?.();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      onEnd?.();
    };
    synthRef.current.speak(utterance);
  }, [ttsAvailable]);

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    setTranscript('');
    recognitionRef.current.start();
    setIsListening(true);
  }, [isListening]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => setTranscript(''), []);

  return {
    isListening,
    isSpeaking,
    transcript,
    sttAvailable,
    ttsAvailable,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    resetTranscript,
  };
}
