import axios from 'axios';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_STT_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

/**
 * Transcribe audio blob using Groq Whisper API
 * @param {Blob} audioBlob - The audio recording blob
 * @returns {Promise<{text: string, error: string|null}>}
 */
export const transcribeAudio = async (audioBlob) => {
  try {
    const formData = new FormData();
    
    // Groq accepts webm/ogg/mp4/wav — we use webm from MediaRecorder
    const file = new File([audioBlob], 'audio.webm', { type: audioBlob.type || 'audio/webm' });
    formData.append('file', file);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'te'); // Telugu — Whisper auto-detects mixed
    formData.append('response_format', 'json');
    formData.append('prompt', 'VyaparBook accounting: rice paddy wheat bags lorries purchase sale payment amount rate rupees lakh thousand');

    const response = await axios.post(GROQ_STT_URL, formData, {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
    });

    return { text: response.data.text, error: null };
  } catch (err) {
    console.error('Groq STT error:', err);
    const message = err.response?.data?.error?.message || err.message || 'Transcription failed';
    return { text: null, error: message };
  }
};
