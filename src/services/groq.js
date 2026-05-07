
import { supabase } from './supabase';

const PROXY_URL = 'https://oagihzckckjckkddvwwd.supabase.co/functions/v1/ai-proxy';

/**
 * Transcribe audio blob using Groq Whisper API via proxy
 * @param {Blob} audioBlob - The audio recording blob
 * @returns {Promise<{text: string, error: string|null}>}
 */
export const transcribeAudio = async (audioBlob) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const formData = new FormData();
    const file = new File([audioBlob], 'audio.webm', { type: audioBlob.type || 'audio/webm' });
    formData.append('file', file);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'te'); 
    formData.append('response_format', 'json');
    formData.append('prompt', 'VyaparBook accounting: rice paddy wheat bags lorries purchase sale payment amount rate rupees lakh thousand');

    // Stream FormData directly to our proxy
    const response = await fetch(`${PROXY_URL}?provider=groq`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        // Do NOT set Content-Type here, let fetch generate the boundary for FormData
      },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Groq proxy error');

    return { text: data.text, error: null };
  } catch (err) {
    console.error('Groq STT error:', err);
    return { text: null, error: err.message || 'Transcription failed' };
  }
};
