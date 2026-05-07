import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    // We can validate the JWT here if needed:
    // const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'));
    // const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    // if (error || !user) throw new Error('Unauthorized');

    const url = new URL(req.url);
    const provider = url.searchParams.get('provider');

    if (provider === 'gemini') {
      const { endpoint, body } = await req.json();
      const targetUrl = `https://generativelanguage.googleapis.com/v1beta${endpoint}?key=${Deno.env.get('GEMINI_API_KEY')}`;
      
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return new Response(await response.text(), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      });
    } 
    
    else if (provider === 'groq') {
      // Groq Whisper expects multipart/form-data
      // We pass the raw request body (which is already multipart) directly to Groq
      const targetUrl = `https://api.groq.com/openai/v1/audio/transcriptions`;
      
      // Clone the headers but override Authorization
      const headers = new Headers(req.headers);
      headers.set('Authorization', `Bearer ${Deno.env.get('GROQ_API_KEY')}`);
      headers.delete('host'); // Let fetch set the host
      
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: headers,
        body: req.body, // Pass the stream directly
      });
      
      return new Response(await response.text(), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      });
    }

    throw new Error('Unsupported provider');
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
