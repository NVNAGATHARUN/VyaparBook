// Supabase Edge Function: whatsapp-incoming
// Deploy with: supabase functions deploy whatsapp-incoming
//
// This is the MAIN brain of the WhatsApp bot.
// n8n calls this endpoint with every incoming WhatsApp message.
//
// POST body from n8n:
// {
//   "phone": "919876543210",
//   "message_type": "text" or "audio",
//   "text": "message text (if text type or after transcription)",
//   "message_id": "unique whatsapp message id"
// }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Intent Detection ─────────────────────────────────────────────────────────
const detectIntent = (text, pendingIntent = null) => {
  const t = text.toLowerCase().trim();
  if (t === '1' || t === 'yes' || t === 'confirm' || t === 'sare') return 'CONFIRM_YES';
  if (t === '2' || t === 'no' || t === 'cancel' || t === 'vaddu') return 'CONFIRM_NO';
  if (pendingIntent === 'ASK_RATE' && /^\d+(\.\d+)?$/.test(t)) return 'PROVIDE_RATE';
  if (t.includes('pending') || t.includes('baaki') || t.includes('balance') || t.includes('ela undi')) return 'QUERY_PENDING';
  if (t.includes('stock') || t.includes('godown') || t.includes('maal')) return 'QUERY_STOCK';
  if (t.includes('summary') || t.includes('report') || t.includes('today') || t.includes('ivvaalu')) return 'QUERY_SUMMARY';
  return 'TRANSACTION';
};

// ─── Amount formatter ─────────────────────────────────────────────────────────
const fmt = (n) => {
  const num = Number(n) || 0;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000)   return `₹${(num / 100000).toFixed(2)} L`;
  if (num >= 1000)     return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toLocaleString('en-IN')}`;
};

// ─── Templates ────────────────────────────────────────────────────────────────
const tmpl = {
  notRegistered: (phone) =>
    `👋 *VyaparBook lo register avvandi!*\n\nYour number (${phone}) is not registered.\n\n🔗 vyaparbook.com`,

  transactionConfirm: (d) =>
    `✅ *Confirm Cheyali?*\n\n${d.type === 'purchase' ? '🛒' : '💰'} *${(d.type||'').toUpperCase()}*\n👤 Party: *${d.party_name}*\n🌾 ${d.quantity} ${d.unit} ${d.commodity}\n💰 Rate: *${fmt(d.rate)}/${d.unit}*\n📊 Total: *${fmt(d.total_amount)}*\n💵 Advance: ${fmt(d.advance_paid)}\n⏳ Pending: *${fmt(d.pending_amount)}*\n\n1️⃣ Confirm ✅\n2️⃣ Redo ❌`,

  paymentConfirm: (d) =>
    `💸 *Payment Confirm?*\n\n👤 Party: *${d.party_name}*\n💰 Amount: *${fmt(d.total_amount)}*\n\n1️⃣ Yes ✅\n2️⃣ No ❌`,

  askRate: (d) =>
    `🤔 *Rate cheppaledu!*\n\n${d.type === 'purchase' ? '🛒' : '💰'} ${d.type}\n👤 ${d.party_name}\n📦 ${d.quantity} ${d.unit}\n\nOka ${d.unit} ki enta rate?\n\n(Just type the number)\nExample: *2350*`,

  success: (d) =>
    `✅ *Saved!*\n\n👤 ${d.party_name}\n📊 ${fmt(d.total_amount)}\n⏳ Pending: ${fmt(d.pending_amount)}\n\n🔗 vyaparbook.com`,

  pendingQuery: (partyName, summary) =>
    `👤 *${partyName} Summary*\n\n📊 Total: ${fmt(summary.total)}\n✅ Paid: ${fmt(summary.paid)}\n🔴 *Pending: ${fmt(summary.pending)}*\n\n🔗 vyaparbook.com`,

  stockQuery: (items) =>
    `📦 *Current Stock*\n\n${items.length > 0 ? items.map(s => `• *${s.commodity}*: ${s.current_stock} ${s.unit}`).join('\n') : 'Stock information not available.'}\n\n🔗 vyaparbook.com`,

  error: (msg) =>
    `❌ *Error!*\n\n${msg}\n\nPlease try again or open:\n🔗 vyaparbook.com`,

  sessionExpired: () =>
    `⏰ *Session expire aindi!*\n\nMalli record cheyyandi 🎤`,
};

// ─── Gemini Parser ────────────────────────────────────────────────────────────
const parseWithGemini = async (text, geminiKey) => {
  const prompt = `You are VyaparBook AI for Indian grain traders.
Extract transaction from: "${text}"
Text may be Telugu/English/Tenglish.
Return ONLY valid JSON, no markdown:
{"party_name":"string","type":"purchase|sale|payment","commodity":"string or null","quantity":number or null,"unit":"bags|lorry|quintal|ton|kg or null","rate":number or null,"total_amount":number,"advance_paid":number,"pending_amount":number,"notes":"string or null"}
Rules: purchase=we bought, sale=we sold, payment=money transfer. If qty and rate given, total=qty*rate. Telugu: degara=from, ki=to, konna=bought, ammanu=sold, pay chesanu=paid.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  const json = await res.json();
  let raw = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(raw);
};

// ─── Main Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );
    const geminiKey = Deno.env.get('GEMINI_API_KEY');

    const body = await req.json();
    const { phone, message_type, text, message_id } = body;

    if (!phone || !text) {
      return new Response(JSON.stringify({ reply: tmpl.error('Invalid request') }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Step 1: Find user by phone ──────────────────────────────────────────
    const { data: waUser } = await supabase
      .from('whatsapp_users')
      .select('*, users(*)')
      .eq('phone', phone)
      .eq('is_active', true)
      .maybeSingle();

    if (!waUser) {
      return new Response(JSON.stringify({ reply: tmpl.notRegistered(phone) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const user = waUser.users;
    const userId = user.id;

    // ── Step 2: Check for pending session ──────────────────────────────────
    await supabase.rpc('expire_whatsapp_sessions'); // Clean expired sessions

    const { data: pendingSession } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('phone', phone)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const pendingIntent = pendingSession?.pending_intent || null;

    // ── Step 3: Detect intent ───────────────────────────────────────────────
    const intent = detectIntent(text, pendingIntent);

    // ── Step 4: Route by intent ─────────────────────────────────────────────

    // -- Confirmation YES --
    if (intent === 'CONFIRM_YES' && pendingSession) {
      const data = pendingSession.session_data;

      // Mark session confirmed
      await supabase
        .from('whatsapp_sessions')
        .update({ status: 'confirmed' })
        .eq('id', pendingSession.id);

      // Save the deal
      const today = new Date().toISOString().split('T')[0];

      // Find or create party
      let partyId;
      const { data: existingParty } = await supabase
        .from('parties')
        .select('id')
        .eq('user_id', userId)
        .ilike('name', data.party_name.trim())
        .maybeSingle();

      if (existingParty) {
        partyId = existingParty.id;
      } else {
        const { data: newParty } = await supabase
          .from('parties')
          .insert([{ user_id: userId, name: data.party_name, type: 'other' }])
          .select()
          .single();
        partyId = newParty.id;
      }

      if (data.type === 'payment') {
        await supabase.from('payments').insert([{
          user_id: userId,
          amount: data.total_amount,
          payment_mode: 'cash',
          payment_date: today,
          source: 'whatsapp',
        }]);
      } else {
        const { data: deal } = await supabase
          .from('deals')
          .insert([{
            user_id: userId,
            party_id: partyId,
            type: data.type,
            commodity: data.commodity,
            quantity: data.quantity,
            unit: data.unit,
            rate: data.rate,
            total_amount: data.total_amount,
            deal_date: today,
            source: 'whatsapp',
          }])
          .select()
          .single();

        if (data.advance_paid > 0) {
          await supabase.from('payments').insert([{
            deal_id: deal.id,
            user_id: userId,
            amount: data.advance_paid,
            payment_mode: 'cash',
            payment_date: today,
            source: 'whatsapp',
          }]);
        }

        // Update stock
        if (data.commodity && data.quantity > 0) {
          const { data: existing } = await supabase
            .from('stock')
            .select('*')
            .eq('user_id', userId)
            .ilike('commodity', data.commodity)
            .maybeSingle();

          const delta = data.type === 'purchase' ? data.quantity : -data.quantity;
          if (existing) {
            await supabase.from('stock')
              .update({ current_stock: Math.max(0, existing.current_stock + delta) })
              .eq('id', existing.id);
          } else {
            await supabase.from('stock').insert([{
              user_id: userId,
              commodity: data.commodity,
              unit: data.unit,
              current_stock: Math.max(0, delta),
            }]);
          }
        }
      }

      return new Response(JSON.stringify({ reply: tmpl.success(data) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // -- Confirmation NO --
    if (intent === 'CONFIRM_NO' && pendingSession) {
      await supabase
        .from('whatsapp_sessions')
        .update({ status: 'rejected' })
        .eq('id', pendingSession.id);

      return new Response(
        JSON.stringify({ reply: `🎤 Ok! Meruppu cheseyandi malli.\n\nNew voice note send cheyyandi.` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // -- Provide Rate (bot asked for rate, user replied with number) --
    if (intent === 'PROVIDE_RATE' && pendingSession) {
      const rate = parseFloat(text.trim());
      const data = { ...pendingSession.session_data, rate, total_amount: pendingSession.session_data.quantity * rate };
      data.pending_amount = Math.max(0, data.total_amount - (data.advance_paid || 0));

      await supabase
        .from('whatsapp_sessions')
        .update({ session_data: data, pending_intent: 'CONFIRM' })
        .eq('id', pendingSession.id);

      return new Response(JSON.stringify({ reply: tmpl.transactionConfirm(data) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // -- Pending Query --
    if (intent === 'QUERY_PENDING') {
      const { data: deals } = await supabase
        .from('deals')
        .select('*, payments(*)')
        .eq('user_id', userId);

      const total = (deals || []).reduce((s, d) => s + d.total_amount, 0);
      const paid = (deals || []).reduce((s, d) => s + (d.payments || []).reduce((ps, p) => ps + Number(p.amount), 0), 0);
      const pending = Math.max(0, total - paid);

      return new Response(
        JSON.stringify({ reply: tmpl.pendingQuery('Your Account', { total, paid, pending }) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // -- Stock Query --
    if (intent === 'QUERY_STOCK') {
      const { data: stock } = await supabase
        .from('stock')
        .select('*')
        .eq('user_id', userId)
        .gt('current_stock', 0);

      return new Response(
        JSON.stringify({ reply: tmpl.stockQuery(stock || []) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // -- New Transaction (default) --
    let parsed;
    try {
      parsed = await parseWithGemini(text, geminiKey);
    } catch {
      return new Response(
        JSON.stringify({ reply: tmpl.error('Samajhaledu. Please try again with more details.') }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    parsed.total_amount = Number(parsed.total_amount) || 0;
    parsed.advance_paid = Number(parsed.advance_paid) || 0;
    parsed.pending_amount = Math.max(0, parsed.total_amount - parsed.advance_paid);

    // Check if rate is missing
    if (!parsed.rate && parsed.type !== 'payment') {
      await supabase.from('whatsapp_sessions').insert([{
        phone,
        user_id: userId,
        session_data: parsed,
        pending_intent: 'ASK_RATE',
        status: 'pending',
      }]);

      return new Response(
        JSON.stringify({ reply: tmpl.askRate(parsed) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // All fields present — ask for confirmation
    await supabase.from('whatsapp_sessions').insert([{
      phone,
      user_id: userId,
      session_data: parsed,
      pending_intent: 'CONFIRM',
      status: 'pending',
    }]);

    const reply = parsed.type === 'payment'
      ? tmpl.paymentConfirm(parsed)
      : tmpl.transactionConfirm(parsed);

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('whatsapp-incoming error:', err);
    return new Response(
      JSON.stringify({ reply: `❌ Server error. Please try again.\n\n🔗 vyaparbook.com` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
