/**
 * High-performance useSpeech hook for EchoSphere.
 * Features:
 * 1. True Hands-Free Mode with Silence Auto-Submission (submits answer automatically after 1.9s silence).
 * 2. Fluent Indian English Text-to-Speech (TTS) with optimized rate/pitch for panel interviewers.
 * 3. Real-Time Web Audio API Mic Metering & Device Enumerate for Bluetooth Earbuds.
 * 4. Automatic STT pause while AI speaks to eliminate echo feedback loops.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export function useSpeech(options = {}) {
  const { onAutoSubmit } = options;
  const onAutoSubmitRef = useRef(onAutoSubmit);

  useEffect(() => {
    onAutoSubmitRef.current = onAutoSubmit;
  }, [onAutoSubmit]);

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [micStatus, setMicStatus] = useState('checking'); // 'checking' | 'granted' | 'denied' | 'unavailable'
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState(0); // 0 = idle, 1..2 = countdown active
  const [sttAvailable, setSttAvailable] = useState(false);
  const [ttsAvailable, setTtsAvailable] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);

  const [audioInputs, setAudioInputs] = useState([]);
  const [audioOutputs, setAudioOutputs] = useState([]);
  const [selectedMicId, setSelectedMicId] = useState('');
  const [selectedOutputId, setSelectedOutputId] = useState('');

  const recognitionRef = useRef(null);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);
  const micRetryTimerRef = useRef(null);
  const ttsKeepAliveTimerRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const isHandsFreeRef = useRef(isHandsFree);
  const isPausedRef = useRef(isPaused);
  const isSpeakingRef = useRef(isSpeaking);

  // Sync refs to avoid stale closures
  useEffect(() => {
    isHandsFreeRef.current = isHandsFree;
    isPausedRef.current = isPaused;
    isSpeakingRef.current = isSpeaking;
  }, [isHandsFree, isPaused, isSpeaking]);

  // Enumerate Connected Audio Input & Output Devices (Bluetooth Earbuds, Mics, Speakers)
  const refreshDevices = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` }));
      const outputs = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Speaker/Headphones ${i + 1}` }));

      setAudioInputs(inputs);
      setAudioOutputs(outputs);

      const btInput = inputs.find((d) =>
        /bluetooth|earbud|headset|buds|airpod|wireless|hands-free/i.test(d.label)
      );
      if (btInput && !selectedMicId) {
        setSelectedMicId(btInput.deviceId);
      } else if (inputs.length > 0 && !selectedMicId) {
        setSelectedMicId(inputs[0].deviceId);
      }
    } catch (e) {
      console.warn('Device enumeration warning:', e);
    }
  }, [selectedMicId]);

  // Unlock Browser SpeechSynthesis Audio Autoplay Policy
  const unlockAudio = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.resume();
      const silence = new SpeechSynthesisUtterance('');
      silence.volume = 0;
      window.speechSynthesis.speak(silence);
      setAudioUnlocked(true);
    } catch (e) {}
  }, []);

  // Tear down existing stream cleanly before acquiring new one
  const teardownStream = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setMicLevel(0);
  }, []);

  // Request Microphone Permission and Setup Web Audio Analyser
  const requestMicAccess = useCallback(
    async (targetDeviceId) => {
      if (typeof window === 'undefined' || !navigator.mediaDevices) {
        setMicStatus('unavailable');
        return false;
      }

      setMicStatus('checking');
      teardownStream();

      const devId = targetDeviceId || selectedMicId;
      const constraints = devId
        ? { audio: { deviceId: { exact: devId } }, video: false }
        : { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false };

      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (exactErr) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        }

        mediaStreamRef.current = stream;
        setHasMicPermission(true);
        setMicStatus('granted');
        refreshDevices();

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateMeter = () => {
            if (!analyser || isPausedRef.current) {
              setMicLevel(0);
            } else {
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
              const avg = sum / dataArray.length;
              setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
            }
            animFrameRef.current = requestAnimationFrame(updateMeter);
          };
          updateMeter();
        }
        return true;
      } catch (err) {
        setHasMicPermission(false);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setMicStatus('denied');
        } else {
          setMicStatus('unavailable');
          clearTimeout(micRetryTimerRef.current);
          micRetryTimerRef.current = setTimeout(() => requestMicAccess(), 3000);
        }
        return false;
      }
    },
    [teardownStream, selectedMicId, refreshDevices]
  );

  // Reset Silence Timer
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setAutoSubmitCountdown(0);
  }, []);

  // Initialize Voices & Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      setTtsAvailable(true);
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) setAvailableVoices(voices);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSttAvailable(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onresult = (event) => {
        if (isPausedRef.current || isSpeakingRef.current) return;
        const current = Array.from(event.results)
          .map((r) => r[0].transcript)
          .join('');

        setTranscript(current);

        // TRUE HANDS-FREE SILENCE AUTO-SUBMIT LOGIC (1.9 seconds silence)
        if (isHandsFreeRef.current && current.trim().length > 3) {
          clearSilenceTimer();

          let count = 2;
          setAutoSubmitCountdown(count);
          countdownIntervalRef.current = setInterval(() => {
            count -= 1;
            setAutoSubmitCountdown(Math.max(0, count));
          }, 900);

          silenceTimerRef.current = setTimeout(() => {
            clearSilenceTimer();
            if (isHandsFreeRef.current && !isSpeakingRef.current && !isPausedRef.current) {
              const textToSubmit = current.trim();
              setTranscript('');
              onAutoSubmitRef.current?.(textToSubmit);
            }
          }, 1900);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (
          isHandsFreeRef.current &&
          !isPausedRef.current &&
          !isSpeakingRef.current &&
          recognitionRef.current
        ) {
          setTimeout(() => {
            try {
              if (isHandsFreeRef.current && !isPausedRef.current && !isSpeakingRef.current) {
                recognitionRef.current.start();
                setIsListening(true);
              }
            } catch (e) {}
          }, 250);
        }
      };

      recognition.onerror = (err) => {
        setIsListening(false);
        if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
          setIsHandsFree(false);
          setHasMicPermission(false);
          setMicStatus('denied');
        } else if (err.error === 'audio-capture') {
          setIsHandsFree(false);
          setMicStatus('unavailable');
          clearTimeout(micRetryTimerRef.current);
          micRetryTimerRef.current = setTimeout(() => requestMicAccess(), 3000);
        }
      };

      recognitionRef.current = recognition;
    }

    if (navigator.mediaDevices?.addEventListener) {
      const onDeviceChange = () => {
        refreshDevices();
        requestMicAccess();
      };
      navigator.mediaDevices.addEventListener('devicechange', onDeviceChange);
      navigator.mediaDevices._echoCleanup = onDeviceChange;
    }

    refreshDevices();
    const initTimer = setTimeout(() => requestMicAccess(), 500);

    return () => {
      clearTimeout(initTimer);
      clearTimeout(micRetryTimerRef.current);
      clearInterval(ttsKeepAliveTimerRef.current);
      clearSilenceTimer();
      synthRef.current?.cancel();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (navigator.mediaDevices?._echoCleanup) {
        navigator.mediaDevices.removeEventListener('devicechange', navigator.mediaDevices._echoCleanup);
      }
      try { recognitionRef.current?.abort(); } catch (e) {}
    };
  }, [requestMicAccess, refreshDevices, clearSilenceTimer]);

  // Voice selector helper tailored for Indian Origin Speech Cadence
  const getIndianVoice = useCallback(
    (interviewer = 'SYSTEM_ARCHITECT') => {
      const voices = availableVoices.length > 0 ? availableVoices : synthRef.current?.getVoices() || [];
      if (!voices || voices.length === 0) return null;

      const indianVoices = voices.filter((v) => {
        const name = v.name.toLowerCase();
        const lang = v.lang.toLowerCase();
        return (
          lang.includes('en-in') ||
          lang.includes('hi-in') ||
          name.includes('india') ||
          name.includes('neerja') ||
          name.includes('prabhat') ||
          name.includes('heera') ||
          name.includes('veena') ||
          name.includes('rishi')
        );
      });

      if (indianVoices.length > 0) {
        if (interviewer === 'PRODUCT_MANAGER') {
          const female = indianVoices.find(
            (v) =>
              v.name.toLowerCase().includes('female') ||
              v.name.toLowerCase().includes('neerja') ||
              v.name.toLowerCase().includes('veena')
          );
          return female || indianVoices[0];
        } else {
          const male = indianVoices.find(
            (v) =>
              v.name.toLowerCase().includes('male') ||
              v.name.toLowerCase().includes('prabhat') ||
              v.name.toLowerCase().includes('rishi')
          );
          return male || indianVoices[0];
        }
      }

      // Fallback: Pick any English voice
      const englishVoice = voices.find((v) => v.lang.toLowerCase().startsWith('en')) || voices[0];
      return englishVoice || null;
    },
    [availableVoices]
  );

  // TTS Speak Function with periodic resume keep-alive for Linux Chrome
  const speak = useCallback(
    (text, interviewer = 'SYSTEM_ARCHITECT', onEnd) => {
      clearSilenceTimer();
      if (!ttsAvailable || isPausedRef.current) {
        onEnd?.();
        return;
      }

      try { window.speechSynthesis?.resume(); } catch (e) {}
      synthRef.current?.cancel();
      clearInterval(ttsKeepAliveTimerRef.current);

      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.92; // Slightly relaxed pace matching natural Indian English
      utterance.pitch = interviewer === 'PRODUCT_MANAGER' ? 1.04 : 0.98;

      const voice = getIndianVoice(interviewer);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || 'en-IN';
      } else {
        utterance.lang = 'en-IN';
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        isSpeakingRef.current = true;
        setAudioUnlocked(true);

        ttsKeepAliveTimerRef.current = setInterval(() => {
          if (window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          } else {
            clearInterval(ttsKeepAliveTimerRef.current);
          }
        }, 4500);
      };

      utterance.onend = () => {
        clearInterval(ttsKeepAliveTimerRef.current);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        onEnd?.();

        // AUTO-RESUME LISTENING IN HANDS-FREE MODE
        if (isHandsFreeRef.current && !isPausedRef.current && recognitionRef.current && hasMicPermission) {
          setTimeout(() => {
            try {
              if (isHandsFreeRef.current && !isPausedRef.current && !isSpeakingRef.current) {
                recognitionRef.current.start();
                setIsListening(true);
              }
            } catch (e) {}
          }, 300);
        }
      };

      utterance.onerror = () => {
        clearInterval(ttsKeepAliveTimerRef.current);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        onEnd?.();
      };

      synthRef.current?.speak(utterance);
    },
    [ttsAvailable, getIndianVoice, hasMicPermission, clearSilenceTimer]
  );

  const testSpeech = useCallback(() => {
    unlockAudio();
    speak('Namaste! Audio test check. Hello, I am Dr. Alex Chen. Your voice interaction and Indian accent speech synthesis are working correctly!', 'SYSTEM_ARCHITECT');
  }, [unlockAudio, speak]);

  const stopSpeaking = useCallback(() => {
    clearInterval(ttsKeepAliveTimerRef.current);
    synthRef.current?.cancel();
    setIsSpeaking(false);
    isSpeakingRef.current = false;
  }, []);

  const startListening = useCallback(async () => {
    if (!hasMicPermission) {
      const granted = await requestMicAccess();
      if (!granted) return;
    }
    if (!recognitionRef.current || isPausedRef.current || isSpeakingRef.current) return;
    try {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {}
  }, [hasMicPermission, requestMicAccess]);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    try { recognitionRef.current?.stop(); } catch (e) {}
    setIsListening(false);
  }, [clearSilenceTimer]);

  const toggleHandsFree = useCallback(() => {
    setIsHandsFree((prev) => {
      const next = !prev;
      if (next && !isListening && !isPausedRef.current && !isSpeakingRef.current && hasMicPermission) {
        startListening();
      }
      return next;
    });
  }, [isListening, startListening, hasMicPermission]);

  const pauseInterview = useCallback(() => {
    setIsPaused(true);
    clearSilenceTimer();
    stopSpeaking();
    stopListening();
  }, [stopSpeaking, stopListening, clearSilenceTimer]);

  const resumeInterview = useCallback(() => {
    setIsPaused(false);
    if (isHandsFree && hasMicPermission) {
      setTimeout(() => startListening(), 300);
    }
  }, [isHandsFree, hasMicPermission, startListening]);

  const resetTranscript = useCallback(() => {
    clearSilenceTimer();
    setTranscript('');
  }, [clearSilenceTimer]);

  return {
    isListening,
    isSpeaking,
    isHandsFree,
    isPaused,
    hasMicPermission,
    micStatus,      // 'checking' | 'granted' | 'denied' | 'unavailable'
    audioUnlocked,
    micLevel,
    transcript,
    autoSubmitCountdown,
    sttAvailable,
    ttsAvailable,
    audioInputs,
    audioOutputs,
    selectedMicId,
    setSelectedMicId,
    selectedOutputId,
    setSelectedOutputId,
    refreshDevices,
    unlockAudio,
    requestMicAccess,
    speak,
    testSpeech,
    stopSpeaking,
    startListening,
    stopListening,
    toggleHandsFree,
    pauseInterview,
    resumeInterview,
    resetTranscript,
  };
}
