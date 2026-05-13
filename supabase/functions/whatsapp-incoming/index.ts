// Supabase Edge Function: whatsapp-incoming
// Final Master Version - Robust, Conversational, and Precise

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── AI BRAIN: Universal Business Intelligence ──────────────────────────────
const analyzeWithAI = async (text, context, config) => {
  const { groqKey } = config;
  console.log('🤖 Business Analysis:', text);

  const prompt = `
    You are VyaparBook Agent. Be SHORT & SWEET. Businessmen value speed.
    Goal: Accurate transaction parsing or data query.

    STRICT RULES:
    1. If missing info (Party name, Amount, or Type), return intent: "CLARIFY" and a short question.
    2. NEVER hallucinate. If unsure, ASK.
    3. TRANSACTION: Use for deals. Entities: party_name, commodity, quantity, unit, rate, amount, type (purchase/sale).
    4. PAYMENT: Use for cash/upi. Entities: party_name, amount, payment_type (in/out).
    5. QUERY: Use for reports/baaki. 
    
    TONE: Professional Tenglish. Max 2 sentences.
    Return JSON ONLY: { "intent": "TYPE", "entities": {...}, "reply": "short reply if clarify" }
  `;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'system', content: prompt }, { role: 'user', content: text }],
        response_format: { type: 'json_object' }
      }),
    });
    const json = await res.json();
    return JSON.parse(json.choices?.[0]?.message?.content || '{}');
  } catch (err) {
    return { intent: 'CLARIFY', reply: "Technical error. Please try again." };
  }
};

// ─── Data Analysis Handler ──────────────────────────────────────────────────
const getGeneralAnalysis = async (supabase, userId, question, groqKey) => {
  try {
    const [
      { data: deals },
      { data: stock },
      { data: parties },
      { data: payments },
      { data: expenses }
    ] = await Promise.all([
      supabase.from('deals').select('*, parties(name)').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabase.from('stock').select('*').eq('user_id', userId),
      supabase.from('parties').select('*').eq('user_id', userId),
      supabase.from('payments').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
      supabase.from('expenses').select('*').eq('user_id', userId)
    ]);

    // Calculate basic stats for the prompt
    const totalSales = (deals || []).filter(d => d.type === 'sale').reduce((s, d) => s + Number(d.total_amount), 0);
    const totalPurchase = (deals || []).filter(d => d.type === 'purchase').reduce((s, d) => s + Number(d.total_amount), 0);
    const totalExp = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);
    const netProfit = totalSales - totalPurchase - totalExp;

    const systemPrompt = `
      You are VyaparBook Agent. Be FAST & ACCURATE. 
      Analyze the data and answer the question in max 3-4 bullet points.
      
      STATS: Sales ${totalSales}, Purchase ${totalPurchase}, Net ${netProfit}.
      PENDING: Calculate accurately from DEALS (Total - Payments).
      
      TONE: Bullet points. Tenglish. No fluff.
      QUESTION: "${question}"
    `;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'system', content: systemPrompt }],
        max_tokens: 300
      }),
    });
    const json = await res.json();
    return json.choices?.[0]?.message?.content || "I'm having trouble analyzing your data. 🙏";
  } catch (err) {
    return `Analysis Error: ${err.message}`;
  }
};

const fmt = (n) => (Number(n) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

// ─── Media Handling Helpers ──────────────────────────────────────────────────
const downloadMedia = async (mediaId, config) => {
  const { waToken } = config;
  const res = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: { 'Authorization': `Bearer ${waToken}` }
  });
  const { url } = await res.json();
  const mediaRes = await fetch(url, {
    headers: { 'Authorization': `Bearer ${waToken}` }
  });
  return await mediaRes.blob();
};

const transcribeAudio = async (blob, config) => {
  const { groqKey } = config;
  const formData = new FormData();
  formData.append('file', blob, 'recording.ogg');
  formData.append('model', 'whisper-large-v3');
  formData.append('language', 'te'); // Support Telugu/Tenglish specifically

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${groqKey}` },
    body: formData
  });
  const json = await res.json();
  return json.text || "";
};

// ─── Meta WhatsApp Helper ──────────────────────────────────────────────────────
const sendWhatsAppMessage = async (toPhone, text, phoneNumberId, waToken) => {
  try {
    await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${waToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toPhone,
        text: { body: text }
      })
    });
  } catch (e) {
    console.error('Failed to send WhatsApp message:', e);
  }
};

// ─── Main Handler ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // 1. Meta Webhook Verification (hub.challenge)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === 'vyaparbook_secret_token') {
      console.log('Webhook verified successfully!');
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  // 2. Process Incoming Meta Webhook POST Payload
  try {
    const body = await req.json();

    // Acknowledge non-WhatsApp events
    if (body.object !== 'whatsapp_business_account') {
      return new Response('Not a WhatsApp event', { status: 404 });
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    // Meta sends delivery status updates and read receipts. Ignore them.
    if (!message) {
      return new Response('EVENT_RECEIVED', { status: 200 });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const groqKey = Deno.env.get('GROQ_API_KEY');
    const waToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');

    const rawPhone = message.from; // e.g., "919876543210"
    const phone = `+${rawPhone}`; 
    const phoneNumberId = value.metadata?.phone_number_id;

    let text = message.text?.body || "";
    const mediaType = message.type;
    const mediaId = mediaType === 'audio' ? message.audio?.id : (mediaType === 'image' ? message.image?.id : null);

    // Fetch the user session to know context
    const { data: waUser } = await supabase.from('whatsapp_users').select('*, users(*)').eq('phone', phone).eq('is_active', true).maybeSingle();
    
    if (!waUser) {
      const reply = "👋 Welcome to VyaparBook! Please register at vyaparbook.vercel.app with this phone number to use the AI Agent.";
      await sendWhatsAppMessage(rawPhone, reply, phoneNumberId, waToken);
      return new Response('EVENT_RECEIVED', { status: 200 });
    }

    const user = waUser.users;

    // Fetch active session if any
    const { data: pendingSession } = await supabase.from('whatsapp_sessions')
      .select('*')
      .eq('phone', phone)
      .in('status', ['pending', 'waiting_for_extras', 'waiting_for_deal_allocation'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // --- Check for follow-up notes or deal allocation ---
    if (pendingSession?.status === 'waiting_for_extras' && text) {
      const { tx_id, tx_type } = pendingSession.session_data;
      const table = tx_type === 'PAYMENT' ? 'payments' : 'deals';
      await supabase.from(table).update({ notes: text }).eq('id', tx_id);
      await supabase.from('whatsapp_sessions').update({ status: 'confirmed' }).eq('id', pendingSession.id);
      
      await sendWhatsAppMessage(rawPhone, "✅ Notes added! Transaction complete. 👍", phoneNumberId, waToken);
      return new Response('EVENT_RECEIVED', { status: 200 });
    }

    if (pendingSession?.status === 'waiting_for_deal_allocation' && text) {
      const selection = parseInt(text);
      const candidates = pendingSession.session_data.candidates || [];
      if (selection > 0 && selection <= candidates.length) {
        const deal = candidates[selection - 1];
        const s = pendingSession.session_data;
        const { data: pay } = await supabase.from('payments').insert([{ 
          user_id: user.id, party_id: s.party_id, amount: s.amount, type: s.payment_type || 'in', deal_id: deal.id, source: 'whatsapp' 
        }]).select().single();
        
        await supabase.from('whatsapp_sessions').update({ 
          status: 'waiting_for_extras', 
          session_data: { ...s, tx_id: pay?.id, tx_type: 'PAYMENT' } 
        }).eq('id', pendingSession.id);

        await sendWhatsAppMessage(rawPhone, `✅ Linked to *${deal.commodity}*! 🎉\n\nNotes emaina add cheyala?`, phoneNumberId, waToken);
        return new Response('EVENT_RECEIVED', { status: 200 });
      }
    }

    // --- Media Processing ---
    if (mediaType === 'audio' && mediaId) {
      const blob = await downloadMedia(mediaId, { waToken });
      text = await transcribeAudio(blob, { groqKey });
      console.log('🎤 Transcribed Audio:', text);
    }

    if (mediaType === 'image' && mediaId) {
      const blob = await downloadMedia(mediaId, { waToken });
      const fileName = `${user.id}/${Date.now()}.jpg`;
      await supabase.storage.from('payment_proofs').upload(fileName, blob, { contentType: 'image/jpeg' });
      const { data: { publicUrl } } = supabase.storage.from('payment_proofs').getPublicUrl(fileName);

      let targetId = pendingSession?.session_data?.tx_id;
      let targetTable = pendingSession?.session_data?.tx_type === 'PAYMENT' ? 'payments' : 'deals';

      if (!targetId) {
        const { data: lastP } = await supabase.from('payments').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
        targetId = lastP?.id;
        targetTable = 'payments';
      }

      if (targetId) {
        await supabase.from(targetTable).update({ proof_url: publicUrl }).eq('id', targetId);
        if (pendingSession) await supabase.from('whatsapp_sessions').update({ status: 'confirmed' }).eq('id', pendingSession.id);
        
        await sendWhatsAppMessage(rawPhone, "📸 Proof linked! Transactions perfectly save ayyayi. ✅", phoneNumberId, waToken);
        return new Response('EVENT_RECEIVED', { status: 200 });
      }
    }

    let analysis = await analyzeWithAI(text, pendingSession?.session_data, { groqKey });
    let intent = (analysis.intent || 'QUERY').toUpperCase();

    // Manual Overrides
    if (text === '1' || text.toLowerCase() === 'yes') intent = 'CONFIRM_YES';
    if (text === '2' || text.toLowerCase() === 'no') intent = 'CONFIRM_NO';

    let reply = "";

    switch (intent) {
      case 'CLARIFY':
        reply = analysis.reply || "Konchem details ivvandi (Party/Amount).";
        break;

      case 'GREETING':
        reply = `Namaste ${user.name}! 🙏 VyaparBook AI ikkada. Deals pampandi leda baaki adagandi. *Short & Fast!* ⚡`;
        break;
      
      case 'HELP':
        reply = `✅ *Sold 10 paddy Ravi*\n💸 *Got 5000 Ravi*\n📊 *Stock?*\n📈 *Profit?*\n🎤 Voice kuda pani chestundi!`;
        break;

      case 'TRANSACTION':
      case 'PAYMENT':
        const d = analysis.entities || {};
        if (!d.party_name && !d.amount && !d.quantity) {
           reply = "Ardam kaledu. Party peru and amount cheppandi. 🙏";
           break;
        }
        await supabase.from('whatsapp_sessions').insert([{ phone, user_id: user.id, session_data: { ...d, intent }, status: 'pending' }]);
        if (intent === 'TRANSACTION') {
          const total = d.total_amount || (Number(d.quantity || 0) * Number(d.rate || 0));
          reply = `✅ *Confirm Deal?*\n👤 ${d.party_name}\n📦 ${d.quantity} ${d.commodity}\n💰 *${fmt(total)}*\n\n1️⃣ Confirm | 2️⃣ Cancel`;
        } else {
          reply = `✅ *Confirm Payment?*\n👤 ${d.party_name}\n💰 *${fmt(d.amount)}*\n\n1️⃣ Confirm | 2️⃣ Cancel`;
        }
        break;

      case 'CONFIRM_YES':
        if (pendingSession) {
          const s = pendingSession.session_data;
          let partyId = s.party_id;
          if (!partyId && s.party_name) {
             const { data: p } = await supabase.from('parties').select('id').ilike('name', s.party_name).maybeSingle();
             if (p) partyId = p.id;
             else {
               const { data: newP } = await supabase.from('parties').insert([{ name: s.party_name, user_id: user.id }]).select().single();
               partyId = newP?.id;
             }
          }

          if (s.intent === 'TRANSACTION') {
            const total = s.total_amount || (Number(s.quantity || 0) * Number(s.rate || 0));
            
            const { data: atomicRes, error: atomicErr } = await supabase.rpc('create_deal_atomic', {
              p_party_id: partyId,
              p_type: s.type || 'purchase',
              p_commodity: s.commodity,
              p_quantity: Number(s.quantity) || 0,
              p_unit: s.unit || 'bags',
              p_rate: Number(s.rate) || 0,
              p_total_amount: total,
              p_advance_paid: 0,
              p_deal_date: new Date().toISOString().split('T')[0],
              p_source: 'whatsapp',
              p_user_id: user.id 
            });

            if (atomicErr) throw atomicErr;

            await supabase.from('whatsapp_sessions').update({ 
              status: 'waiting_for_extras', 
              session_data: { ...s, tx_id: atomicRes?.deal_id, tx_type: 'DEAL' } 
            }).eq('id', pendingSession.id);
            reply = `✅ *Saved!* 🎉\n\nNotes emaina add cheyala? Type cheyandi leda proof photo pampandi. 📸 (Leda 'No' kottandi)`;
          } else {
            const { data: deals } = await supabase.from('deals').select('*, payments(amount)').eq('party_id', partyId).eq('user_id', user.id);
            const openDeals = (deals || []).filter(d => {
               const paid = (d.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
               return Math.max(0, Number(d.total_amount) - paid) > 0;
            }).sort((a, b) => new Date(a.deal_date) - new Date(b.deal_date));

            if (openDeals.length > 1) {
              await supabase.from('whatsapp_sessions').update({ 
                status: 'waiting_for_deal_allocation', 
                session_data: { ...s, party_id: partyId, candidates: openDeals } 
              }).eq('id', pendingSession.id);
              
              let list = `🤔 *${s.party_name}* ki multiple deals unnyi. Emi deal nundi 'cut' cheyali?\n\n`;
              openDeals.forEach((d, i) => {
                const paid = (d.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
                list += `${i+1}. *${d.commodity}* (${fmt(d.total_amount)}) - Pending: ${fmt(Number(d.total_amount) - paid)}\n`;
              });
              list += `\nNumber type cheyandi (1, 2, 3...)`;
              reply = list;
            } else {
               const targetId = openDeals[0]?.id || null;
               const { data: pay } = await supabase.from('payments').insert([{ 
                 user_id: user.id, party_id: partyId, amount: s.amount, type: s.payment_type || 'in', deal_id: targetId, source: 'whatsapp' 
               }]).select().single();
               
               await supabase.from('whatsapp_sessions').update({ 
                 status: 'waiting_for_extras', 
                 session_data: { ...s, tx_id: pay?.id, tx_type: 'PAYMENT' } 
               }).eq('id', pendingSession.id);
               reply = `✅ *Payment Saved!* 🎉\n\nNotes emaina add cheyala?`;
            }
          }
        } else {
          reply = "Confirm cheyadaniki emi ledu.";
        }
        break;

      case 'CONFIRM_NO':
        if (pendingSession) {
          await supabase.from('whatsapp_sessions').update({ status: 'cancelled' }).eq('id', pendingSession.id);
          reply = "❌ Cancelled.";
        } else {
          reply = "Ok.";
        }
        break;

      default:
        const answer = await getGeneralAnalysis(supabase, user.id, text, groqKey);
        reply = answer; 
    }

    // Send the actual reply via Meta Graph API
    if (reply) {
      await sendWhatsAppMessage(rawPhone, reply, phoneNumberId, waToken);
    }

    // Always return 200 OK to Meta so they know we received the message
    return new Response('EVENT_RECEIVED', { status: 200 });

  } catch (err) {
    console.error(err);
    // Even on error, return 200 to prevent Meta from endlessly retrying failing messages
    return new Response('EVENT_RECEIVED', { status: 200 });
  }
});
