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
    You are the VyaparBook Intent Parser.
    Your ONLY job is to classify the user's message into an intent and extract entities.

    STRICT INTENT RULES:
    1. TRANSACTION: New deal/purchase/sale. (e.g., "Add deal", "Purchased 10 lorry channa from Ravi").
       - Entities: party_name, commodity, quantity, unit, rate, amount, type (purchase/sale).
       - If quantity and rate given, calculate amount = quantity * rate.
    2. PAYMENT: Money received or paid. (e.g., "Got 5000 from Ravi", "Paid 10000 to Jagadeesh").
       - Entities: party_name, amount, payment_type (in/out).
    3. MODIFY_DEAL: Edit/update an existing deal. (e.g., "Change Ravi channa rate to 2000", "Update last deal quantity to 15", "Correct Jagadeesh deal amount to 50000").
       - Entities: party_name, commodity (optional), field_to_update (rate/quantity/total_amount/notes), new_value.
    4. DELETE_DEAL: Cancel or delete a deal. (e.g., "Delete Ravi paddy deal", "Cancel last deal", "Remove Jagadeesh deal").
       - Entities: party_name, commodity (optional).
    5. QUERY: Asking for info/reports. (e.g., "Show balance", "Profit?", "Stock?").
    6. CLARIFY: ONLY if TRANSACTION or PAYMENT is missing Party Name or Amount/Rate.
       - Include a short "reply" asking for missing info.
    7. GREETING: Simple hellos.
    8. HELP: How to use the bot.

    Return JSON ONLY: { "intent": "TYPE", "entities": {...}, "reply": "short reply if clarify" }
    Do NOT include any other text.
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

// ─── Data Analysis Handler (NO hallucinations — pure DB math) ───────────────
const getGeneralAnalysis = async (supabase, userId, question, groqKey) => {
  try {
    const [
      { data: deals },
      { data: stock },
      { data: payments },
      { data: expenses }
    ] = await Promise.all([
      supabase.from('deals').select('*, parties(name), payments(id,amount)').eq('user_id', userId).eq('is_deleted', false).order('created_at', { ascending: false }).limit(100),
      supabase.from('stock').select('*').eq('user_id', userId),
      supabase.from('payments').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      supabase.from('expenses').select('*').eq('user_id', userId)
    ]);

    // ── Compute all stats directly from DB data ──────────────────────────
    const fmtNum = (n) => `Rs.${Number(n).toLocaleString('en-IN')}`;
    const totalSales = (deals || []).filter(d => d.type === 'sale').reduce((s, d) => s + Number(d.total_amount), 0);
    const totalPurchase = (deals || []).filter(d => d.type === 'purchase').reduce((s, d) => s + Number(d.total_amount), 0);
    const totalExp = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);
    const netProfit = totalSales - totalPurchase - totalExp;

    // Per-party outstanding balance
    const partyBalance = {};
    for (const deal of (deals || [])) {
      const pid = deal.party_id;
      const pName = deal.parties?.name || 'Unknown';
      if (!partyBalance[pid]) partyBalance[pid] = { name: pName, toReceive: 0, toPay: 0 };
      const dealPaid = (deal.payments || []).reduce((s, p) => s + Number(p.amount), 0);
      const pending = Math.max(0, Number(deal.total_amount) - dealPaid);
      if (deal.type === 'sale') partyBalance[pid].toReceive += pending;
      else partyBalance[pid].toPay += pending;
    }

    const recentDeals = (deals || []).slice(0, 5).map(d => {
      const paidSoFar = (d.payments || []).reduce((s, p) => s + Number(p.amount), 0);
      const pending = Math.max(0, Number(d.total_amount) - paidSoFar);
      return `- ${d.parties?.name} | ${d.type} | ${d.commodity} ${d.quantity}${d.unit} @ ${fmtNum(d.rate)} = ${fmtNum(d.total_amount)} | Pending: ${fmtNum(pending)} (${d.deal_date})`;
    }).join('\n');

    const stockSummary = (stock || []).map(s => `- ${s.commodity}: ${s.current_stock} ${s.unit}`).join('\n') || 'Stock records levu.';
    const balanceSummary = Object.values(partyBalance)
      .filter(p => p.toReceive > 0 || p.toPay > 0)
      .map(p => `- ${p.name}: Receive ${fmtNum(p.toReceive)}, Pay ${fmtNum(p.toPay)}`)
      .join('\n') || 'Pending baaki levu.';

    const factualData = [
      `SALES: ${fmtNum(totalSales)}`,
      `PURCHASE: ${fmtNum(totalPurchase)}`,
      `NET PROFIT: ${fmtNum(netProfit)}`,
      `EXPENSES: ${fmtNum(totalExp)}`,
      `RECENT DEALS:\n${recentDeals || 'Deals levu.'}`,
      `STOCK:\n${stockSummary}`,
      `PARTY BALANCES:\n${balanceSummary}`,
    ].join('\n\n');

    const prompt = `You are VyaparBook assistant. Answer using ONLY the data below. Do NOT guess or add any numbers not in the data. If answer is not in data, say "Records lo ledu". Reply in max 4 bullet points in Tenglish (Telugu+English).

${factualData}

QUESTION: "${question}"`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 250,
        temperature: 0.0,
      }),
    });
    const json = await res.json();
    return json.choices?.[0]?.message?.content || factualData;
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
    const mediaId = mediaType === 'audio' ? message.audio?.id : ((mediaType === 'image' ? message.image?.id : (mediaType === 'document' ? message.document?.id : null)));

    // 1. Try to find an existing linked WhatsApp user
    let { data: waUser } = await supabase.from('whatsapp_users').select('*, users(*)').eq('phone', phone).eq('is_active', true).maybeSingle();
    
    // 2. Auto-Link Feature: If not linked, check if the phone exists in the main 'users' table
    if (!waUser) {
      // Sometimes the users table has the phone without the +, so check both
      const possiblePhones = [phone, rawPhone, `+${rawPhone}`];
      
      const { data: existingUser } = await supabase.from('users')
        .select('*')
        .in('phone', possiblePhones)
        .limit(1)
        .maybeSingle();

      if (existingUser) {
        // Auto-link them! Insert into whatsapp_users
        const { data: newLink } = await supabase.from('whatsapp_users').insert([{
          phone: phone,
          user_id: existingUser.id,
          is_active: true
        }]).select('*, users(*)').single();
        
        waUser = newLink;
        console.log(`Auto-linked phone ${phone} to user ${existingUser.name}`);
      }
    }

    // 3. If STILL no user found, they genuinely haven't registered
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
      const s = pendingSession.session_data;

      if (selection > 0 && selection <= candidates.length) {
        const deal = candidates[selection - 1];

        // --- MODIFY_DEAL: apply the update to the selected deal ---
        if (s.intent === 'MODIFY_DEAL') {
          const fieldMap = { rate: 'rate', quantity: 'quantity', amount: 'total_amount', total_amount: 'total_amount', notes: 'notes' };
          const dbField = fieldMap[(s.field_to_update || '').toLowerCase()];
          if (!dbField) {
            await sendWhatsAppMessage(rawPhone, "Invalid field. 'rate', 'quantity', 'amount', ya 'notes' cheppandi.", phoneNumberId, waToken);
          } else {
            const updates: Record<string, unknown> = { [dbField]: s.new_value };
            if (dbField === 'rate') updates.total_amount = Number(s.new_value) * Number(deal.quantity);
            if (dbField === 'quantity') updates.total_amount = Number(deal.rate) * Number(s.new_value);
            await supabase.from('deals').update(updates).eq('id', deal.id);
            await supabase.from('whatsapp_sessions').update({ status: 'confirmed' }).eq('id', pendingSession.id);
            const totalMsg = updates.total_amount ? `\nNew Total: *${fmt(updates.total_amount as number)}*` : '';
            await sendWhatsAppMessage(rawPhone, `✅ *Updated!* ${deal.parties?.name || ''} - ${deal.commodity}\n${s.field_to_update}: *${s.new_value}*${totalMsg}\n\n📱 App lo reflect ayyindi!`, phoneNumberId, waToken);
          }
          return new Response('EVENT_RECEIVED', { status: 200 });
        }

        // --- DELETE_DEAL: confirm then delete selected deal ---
        if (s.intent === 'DELETE_DEAL') {
          // Store pending deal_id and ask for confirmation
          await supabase.from('whatsapp_sessions').update({
            status: 'pending',
            session_data: { intent: 'DELETE_DEAL', deal_id: deal.id, deal_info: `${deal.parties?.name || ''} - ${deal.commodity} ${fmt(deal.total_amount)}` }
          }).eq('id', pendingSession.id);
          await sendWhatsAppMessage(rawPhone, `🗑️ *Delete cheyyalaa?*\n${deal.parties?.name || ''} - ${deal.commodity} (${fmt(deal.total_amount)})\n\n1️⃣ Yes Delete | 2️⃣ Cancel`, phoneNumberId, waToken);
          return new Response('EVENT_RECEIVED', { status: 200 });
        }

        // --- PAYMENT: link payment to the selected deal ---
        const { data: pay } = await supabase.from('payments').insert([{ 
          user_id: user.id, party_id: s.party_id, amount: s.amount, type: s.payment_type || 'in', deal_id: deal.id, source: 'whatsapp' 
        }]).select().single();
        
        await supabase.from('whatsapp_sessions').update({ 
          status: 'waiting_for_extras', 
          session_data: { ...s, tx_id: pay?.id, tx_type: 'PAYMENT' } 
        }).eq('id', pendingSession.id);

        await sendWhatsAppMessage(rawPhone, `✅ *${fmt(s.amount)} payment saved!* Linked to *${deal.commodity}* deal.\n📱 App lo reflect ayyindi!`, phoneNumberId, waToken);
        return new Response('EVENT_RECEIVED', { status: 200 });
      } else {
        await sendWhatsAppMessage(rawPhone, `Valid number cheppandi (1 - ${candidates.length}).`, phoneNumberId, waToken);
        return new Response('EVENT_RECEIVED', { status: 200 });
      }
    }

    // --- Media Processing ---
    if (mediaType === 'audio' && mediaId) {
      const blob = await downloadMedia(mediaId, { waToken });
      text = await transcribeAudio(blob, { groqKey });
      console.log('🎤 Transcribed Audio:', text);
    }

    if ((mediaType === 'image' || mediaType === 'document') && mediaId) {
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

          // Handle DELETE_DEAL confirmation
          if (s.intent === 'DELETE_DEAL' && s.deal_id) {
            await supabase.from('deals').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', s.deal_id);
            await supabase.from('whatsapp_sessions').update({ status: 'confirmed' }).eq('id', pendingSession.id);
            reply = `✅ *Deleted!* ${s.deal_info}\n📱 App lo reflect ayyindi!`;
            break;
          }

          let partyId = s.party_id;
          if (!partyId && s.party_name) {
             const { data: p } = await supabase.from('parties').select('id').eq('user_id', user.id).ilike('name', s.party_name).maybeSingle();
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
            reply = `✅ *Deal Saved!* 🎉\n📱 App lo reflect ayyindi!\n\nProof photo pampali antara? 📸 (Leda 'No' type cheyandi)`;
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
               reply = `✅ *Payment Saved!* 🎉\n📱 App lo reflect ayyindi!`;
            }
          }
        } else {
          reply = "Confirm cheyadaniki emi ledu.";
        }
        break;

      case 'CONFIRM_NO':
        if (pendingSession) {
          await supabase.from('whatsapp_sessions').update({ status: 'cancelled' }).eq('id', pendingSession.id);
          reply = "❌ Cancelled. Fresh start cheyandi.";
        } else {
          reply = "Ok.";
        }
        break;

      case 'MODIFY_DEAL': {
        const e = analysis.entities || {};
        if (!e.party_name || !e.field_to_update || e.new_value === undefined) {
          reply = "Modify chesadaniki: Party peru, field (rate/quantity/amount), mariyu new value cheppandi.";
          break;
        }
        // Step 1: Find party by name
        const { data: modParty } = await supabase.from('parties').select('id, name')
          .eq('user_id', user.id).ilike('name', `%${e.party_name}%`).limit(1).maybeSingle();
        if (!modParty) { reply = `❌ ${e.party_name} party records lo levu.`; break; }

        // Step 2: Find deals for that party
        let modQuery = supabase.from('deals').select('id, commodity, type, total_amount, rate, quantity')
          .eq('user_id', user.id).eq('party_id', modParty.id).eq('is_deleted', false)
          .order('created_at', { ascending: false }).limit(5);
        if (e.commodity) modQuery = modQuery.ilike('commodity', `%${e.commodity}%`);
        const { data: matchDeals } = await modQuery;

        if (!matchDeals || matchDeals.length === 0) {
          reply = `❌ ${modParty.name} ki deal records lo levu.`;
          break;
        }

        if (matchDeals.length > 1) {
          await supabase.from('whatsapp_sessions').insert([{ 
            phone, user_id: user.id, 
            session_data: { intent: 'MODIFY_DEAL', ...e, candidates: matchDeals.map(d => ({ ...d, parties: { name: modParty.name } })) }, 
            status: 'waiting_for_deal_allocation' 
          }]);
          let list = `✏️ *${modParty.name}* ki multiple deals unnyi. Edi modify cheyali?\n\n`;
          matchDeals.forEach((d, i) => { list += `${i+1}. *${d.commodity}* - ${fmt(d.total_amount)} (${d.type})\n`; });
          list += `\nNumber type cheyandi`;
          reply = list;
          break;
        }

        const deal = matchDeals[0];
        const fieldMap = { rate: 'rate', quantity: 'quantity', amount: 'total_amount', total_amount: 'total_amount', notes: 'notes' };
        const dbField = fieldMap[e.field_to_update.toLowerCase()];
        if (!dbField) { reply = `Invalid field. 'rate', 'quantity', 'amount', ya 'notes' cheppandi.`; break; }

        const updates: Record<string, unknown> = { [dbField]: e.new_value };
        if (dbField === 'rate') updates.total_amount = Number(e.new_value) * Number(deal.quantity);
        if (dbField === 'quantity') updates.total_amount = Number(deal.rate) * Number(e.new_value);

        await supabase.from('deals').update(updates).eq('id', deal.id);
        const totalMsg = updates.total_amount ? `\nNew Total: *${fmt(updates.total_amount as number)}*` : '';
        reply = `✅ *Updated!* ${modParty.name} - ${deal.commodity}\n${e.field_to_update}: *${e.new_value}*${totalMsg}\n\n📱 App lo reflect ayyindi!`;
        break;
      }

      case 'DELETE_DEAL': {
        const e = analysis.entities || {};
        if (!e.party_name) { reply = "Delete chesadaniki party peru cheppandi."; break; }

        // Step 1: Find party
        const { data: delParty } = await supabase.from('parties').select('id, name')
          .eq('user_id', user.id).ilike('name', `%${e.party_name}%`).limit(1).maybeSingle();
        if (!delParty) { reply = `❌ ${e.party_name} party records lo levu.`; break; }

        // Step 2: Find deals
        let dQuery = supabase.from('deals').select('id, commodity, type, total_amount')
          .eq('user_id', user.id).eq('party_id', delParty.id).eq('is_deleted', false)
          .order('created_at', { ascending: false }).limit(5);
        if (e.commodity) dQuery = dQuery.ilike('commodity', `%${e.commodity}%`);
        const { data: delCandidates } = await dQuery;

        if (!delCandidates || delCandidates.length === 0) {
          reply = `❌ ${delParty.name} ki deal records lo levu.`;
          break;
        }

        if (delCandidates.length > 1) {
          await supabase.from('whatsapp_sessions').insert([{ 
            phone, user_id: user.id, 
            session_data: { intent: 'DELETE_DEAL', ...e, candidates: delCandidates.map(d => ({ ...d, parties: { name: delParty.name } })) }, 
            status: 'waiting_for_deal_allocation' 
          }]);
          let list = `🗑️ *${delParty.name}* ki delete chesadaniki edi select cheyali?\n\n`;
          delCandidates.forEach((d, i) => { list += `${i+1}. *${d.commodity}* - ${fmt(d.total_amount)} (${d.type})\n`; });
          list += `\nNumber type cheyandi`;
          reply = list;
          break;
        }

        const delDeal = delCandidates[0];
        await supabase.from('whatsapp_sessions').insert([{ 
          phone, user_id: user.id, 
          session_data: { intent: 'DELETE_DEAL', deal_id: delDeal.id, deal_info: `${delParty.name} - ${delDeal.commodity} ${fmt(delDeal.total_amount)}` }, 
          status: 'pending' 
        }]);
        reply = `🗑️ *Delete cheyyalaa?*\n${delParty.name} - ${delDeal.commodity} (${fmt(delDeal.total_amount)})\n\n1️⃣ Yes Delete | 2️⃣ Cancel`;
        break;
      }

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
