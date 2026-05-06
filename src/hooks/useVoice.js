import { useState, useRef, useCallback } from 'react';
import { transcribeAudio } from '../services/groq';
import { parseTransaction } from '../services/gemini';

export const VOICE_STATES = {
  IDLE: 'idle',
  RECORDING: 'recording',
  TRANSCRIBING: 'transcribing',
  PARSING: 'parsing',
  CONFIRMING: 'confirming',
  SUCCESS: 'success',
  ERROR: 'error',
};

/**
 * Custom hook for the full voice recording → transcription → parsing flow
 */
export const useVoice = () => {
  const [voiceState, setVoiceState] = useState(VOICE_STATES.IDLE);
  const [transcript, setTranscript] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscript('');
      setParsedData(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Try webm first, fall back to ogg, then any audio
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4']
        .find(t => MediaRecorder.isTypeSupported(t)) || '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        setAudioBlob(blob);
        await processAudio(blob);
      };

      recorder.start(100);
      setVoiceState(VOICE_STATES.RECORDING);
    } catch (err) {
      console.error('Recording error:', err);
      setError('Microphone access denied. Please allow microphone and try again.');
      setVoiceState(VOICE_STATES.ERROR);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setVoiceState(VOICE_STATES.TRANSCRIBING);
    }
  }, []);

  const processAudio = async (blob) => {
    try {
      // Step 1: Transcribe
      setVoiceState(VOICE_STATES.TRANSCRIBING);
      const { text, error: sttError } = await transcribeAudio(blob);

      if (sttError) {
        setError(`Could not hear clearly: ${sttError}`);
        setVoiceState(VOICE_STATES.ERROR);
        return;
      }

      setTranscript(text);

      // Step 2: Parse
      setVoiceState(VOICE_STATES.PARSING);
      const { data, error: parseError } = await parseTransaction(text);

      if (parseError || !data) {
        setError(`Could not understand: ${parseError || 'Unknown error'}`);
        setVoiceState(VOICE_STATES.ERROR);
        return;
      }

      setParsedData(data);
      setVoiceState(VOICE_STATES.CONFIRMING);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setVoiceState(VOICE_STATES.ERROR);
    }
  };

  const retranscribeWithText = async (editedText) => {
    setTranscript(editedText);
    setVoiceState(VOICE_STATES.PARSING);
    const { data, error: parseError } = await parseTransaction(editedText);
    if (parseError || !data) {
      setError(`Could not understand: ${parseError}`);
      setVoiceState(VOICE_STATES.ERROR);
      return;
    }
    setParsedData(data);
    setVoiceState(VOICE_STATES.CONFIRMING);
  };

  const reset = useCallback(() => {
    setVoiceState(VOICE_STATES.IDLE);
    setTranscript('');
    setParsedData(null);
    setError(null);
    setAudioBlob(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  }, []);

  return {
    voiceState,
    transcript,
    parsedData,
    error,
    audioBlob,
    startRecording,
    stopRecording,
    retranscribeWithText,
    reset,
    isRecording: voiceState === VOICE_STATES.RECORDING,
    isProcessing:
      voiceState === VOICE_STATES.TRANSCRIBING ||
      voiceState === VOICE_STATES.PARSING,
    isConfirming: voiceState === VOICE_STATES.CONFIRMING,
    isIdle: voiceState === VOICE_STATES.IDLE,
    isError: voiceState === VOICE_STATES.ERROR,
  };
};
