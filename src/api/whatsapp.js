import { detectIntent, isQueryIntent } from '../services/agentBrain'
import { executeQuery } from '../services/queryEngine'
import { formatForWhatsApp } from '../services/responseFormatter'
import { parseTransaction } from '../services/gemini'
import {
  supabase,
  findOrCreateParty,
  getDealsByParty
} from '../services/supabase'
import { transcribeAudio } from '../services/groq'

const APP_URL = import.meta.env.VITE_APP_URL || 'https://vyaparbook.vercel.app'

// ─── Helper: format numbers ───────────────────────────────────────────────────
const fmt = (n) => {
  const num = Number(n) || 0
  return num.toLocaleString('en-IN')
}

// ─── Session helpers (using whatsapp_sessions table) ─────────────────────────

const getPendingSession = async (phone) => {
  // Expire stale sessions (older than 10 minutes)
  try {
    await supabase.rpc('expire_whatsapp_sessions')
  } catch { /* ignore if RPC not defined */ }

  const { data } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('phone', phone)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data || null
}

const getLatestQueryContext = async (phone) => {
  const { data } = await supabase
    .from('whatsapp_sessions')
    .select('session_data')
    .eq('phone', phone)
    .eq('intent', 'QUERY_CONTEXT')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.session_data || null
}

const saveQueryContext = async (phone, userId, context) => {
  await supabase
    .from('whatsapp_sessions')
    .insert([{
      phone,
      user_id: userId,
      session_data: context,
      intent: 'QUERY_CONTEXT',
      status: 'resolved'
    }])
}

const getMessageFingerprint = (phone, text) => {
  const minuteBucket = new Date().toISOString().slice(0, 16)
  return `${phone}|${text.trim().toLowerCase()}|${minuteBucket}`
}

const isDuplicateMessage = async (phone, userId, text) => {
  const fingerprint = getMessageFingerprint(phone, text)
  const { data } = await supabase
    .from('whatsapp_message_events')
    .select('id')
    .eq('phone', phone)
    .eq('fingerprint', fingerprint)
    .limit(1)
  return !!(data && data.length > 0)
}

const saveMessageFingerprint = async (phone, userId, text) => {
  const fingerprint = getMessageFingerprint(phone, text)
  await supabase.from('whatsapp_message_events').insert([{
    phone,
    user_id: userId,
    fingerprint,
    raw_text: text
  }]).catch(() => {})
}

const logQueryAudit = async ({ userId, phone, question, intent, result }) => {
  const checks = result?.audit?.checks || []
  const isConsistent = checks.every((c) => c.ok !== false)
  await supabase.from('query_audit_logs').insert([{
    user_id: userId,
    phone,
    question,
    intent,
    result_type: result?.type || 'UNKNOWN',
    checks,
    is_consistent: isConsistent,
    result_payload: result
  }]).catch(() => {})
}

const saveSession = async ({ phone, user_id, session_data, intent, status }) => {
  // Cancel any existing pending sessions first
  await supabase
    .from('whatsapp_sessions')
    .update({ status: 'cancelled' })
    .eq('phone', phone)
    .eq('status', 'pending')

  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .insert([{ phone, user_id, session_data, intent, status }])
    .select()
    .single()
  if (error) console.error('saveSession error:', error)
  return data
}

const rejectSession = async (id) => {
  await supabase
    .from('whatsapp_sessions')
    .update({ status: 'cancelled' })
    .eq('id', id)
}

const updateSession = async (id, updates) => {
  const { data } = await supabase
    .from('whatsapp_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return data
}

// ─── Get user by phone ────────────────────────────────────────────────────────

const getUserByPhone = async (phone) => {
  // Check whatsapp_users linking table first
  const { data: waUser } = await supabase
    .from('whatsapp_users')
    .select('*, users(*)')
    .eq('phone', phone)
    .eq('is_active', true)
    .maybeSingle()

  if (waUser?.users) return waUser.users

  // Fallback: check users table directly
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .maybeSingle()

  return user || null
}

// ─── Confirm session → execute the actual save ────────────────────────────────

const confirmPendingSession = async (session, user) => {
  // Handle AWAITING_RATE: user just typed the rate number
  if (session.intent === 'AWAITING_RATE') {
    const rate = parseFloat(String(session.session_data?.awaitingInput || '').trim())
    if (isNaN(rate) || rate <= 0) {
      return `❌ Valid rate daalo.
Example: *2350*`
    }

    const data = { ...(session.session_data || {}) }
    data.rate = rate
    data.total_amount = (Number(data.quantity) || 1) * rate
    data.pending_amount = data.total_amount - (Number(data.advance_paid) || 0)

    await updateSession(session.id, {
      session_data: data,
      intent: 'ADD_DEAL',
      status: 'pending'
    })

    return formatTransactionConfirmation(data)
  }

  // Normal: ADD_DEAL or ADD_PAYMENT
  const parsed = session.session_data
  if (!parsed) {
    await rejectSession(session.id)
    return `❌ Session data missing. Dobara try karo.`
  }

  try {
    if (parsed.type === 'payment') {
      // Find the deal to attach payment to
      const { data: partyRecord } = await findOrCreateParty(user.id, parsed.party_name)
      if (!partyRecord) {
        await rejectSession(session.id)
        return `❌ Party "${parsed.party_name}" nahi mili. Pehle deal create karo.`
      }

      const { data: deals } = await getDealsByParty(partyRecord.id);
      // Import computePending dynamically since this runs in node/edge sometimes
      const computePending = (d) => {
        const paid = (d.payments || []).reduce((s, p) => s + Number(p.amount), 0);
        return Math.max(0, Number(d.total_amount) - paid);
      };

      // Filter strictly to OPEN deals, sort by oldest first (FIFO)
      const openDeals = (deals || [])
        .filter(d => computePending(d) > 0)
        .sort((a, b) => new Date(a.deal_date) - new Date(b.deal_date));

      if (openDeals.length === 0) {
        await rejectSession(session.id);
        return `❌ ${partyRecord.name} ke liye koi pending bill nahi hai. Pehle naya deal add karo.`;
      }

      const dealId = openDeals[0].id;
      const { error } = await supabase
        .from('payments')
        .insert([{
          deal_id: dealId,
          user_id: user.id,
          amount: parsed.total_amount || parsed.amount,
          payment_mode: parsed.payment_mode || 'cash',
          payment_date: new Date().toISOString().split('T')[0],
          notes: parsed.notes || null
        }])

      if (error) throw error

      await supabase
        .from('whatsapp_sessions')
        .update({ status: 'confirmed' })
        .eq('id', session.id)

      return `✅ *Payment Recorded!*

👤 Party: *${parsed.party_name}*
💰 Amount: *₹${fmt(parsed.total_amount || parsed.amount)}*
📅 Date: ${new Date().toLocaleDateString('en-IN')}

_VyaparBook mein save ho gaya!_ 🎉`

    } else {
      // ADD_DEAL: purchase or sale
      const { data: partyRecord } = await findOrCreateParty(
        user.id,
        parsed.party_name,
        parsed.type === 'purchase' ? 'supplier' : 'buyer'
      )

      if (!partyRecord) throw new Error('Party create failed')

      // Use atomic deal creation to guarantee consistency
      const { error: dealError } = await supabase.rpc('create_deal_atomic', {
        p_party_id: partyRecord.id,
        p_type: parsed.type || 'purchase',
        p_commodity: parsed.commodity || null,
        p_quantity: Number(parsed.quantity) || 0,
        p_unit: parsed.unit || null,
        p_rate: Number(parsed.rate) || 0,
        p_total_amount: Number(parsed.total_amount),
        p_advance_paid: Number(parsed.advance_paid) || 0,
        p_deal_date: new Date().toISOString().split('T')[0],
        p_source: 'whatsapp',
        p_payment_mode: 'cash',
        p_notes: parsed.notes || null
      });

      if (dealError) {
        console.error('[deal_atomic_error]', dealError.message, { userId: user.id, party: partyRecord.id });
        throw dealError;
      }

      // Advance payment and stock are already handled by createDealAtomic

      await supabase
        .from('whatsapp_sessions')
        .update({ status: 'confirmed' })
        .eq('id', session.id)

      return `✅ *Deal Recorded!*

${parsed.type === 'purchase' ? '🛒' : '💰'} *${(parsed.type || 'deal').toUpperCase()}*
👤 Party: *${parsed.party_name}*
📦 ${parsed.quantity || '?'} ${parsed.unit || ''} ${parsed.commodity || ''}
💰 Rate: ₹${fmt(parsed.rate)}
📊 Total: *₹${fmt(parsed.total_amount)}*
💵 Advance: ₹${fmt(parsed.advance_paid || 0)}
⏳ Pending: *₹${fmt(parsed.pending_amount || parsed.total_amount)}*

_VyaparBook mein save ho gaya!_ 🎉`
    }
  } catch (err) {
    console.error('confirmPendingSession error:', err)
    await rejectSession(session.id)
    return `❌ Save karne mein problem hui.
Dobara try karo ya app kholo: ${APP_URL}`
  }
}

// ─── Format transaction confirmation message ──────────────────────────────────

const formatTransactionConfirmation = (parsed) => {
  if (parsed.type === 'payment') {
    return `
💵 *Payment Confirm Karo?*

👤 Party: *${parsed.party_name || '?'}*
💰 Amount: *₹${fmt(parsed.total_amount || parsed.amount)}*

1️⃣ Haan ✅
2️⃣ Nahi ❌`.trim()
  }

  return `
✅ *Confirm Karo?*

${parsed.type === 'purchase' ? '🛒' : '💰'} *${(parsed.type || 'deal').toUpperCase()}*
👤 Party: *${parsed.party_name || '?'}*
📦 ${parsed.quantity || '?'} ${parsed.unit || ''} ${parsed.commodity || ''}
💰 Rate: ₹${parsed.rate ? fmt(parsed.rate) : 'N/A'}
📊 Total: *₹${fmt(parsed.total_amount)}*
💵 Advance: ₹${fmt(parsed.advance_paid || 0)}
⏳ Pending: *₹${fmt(parsed.pending_amount || parsed.total_amount)}*

1️⃣ Confirm ✅
2️⃣ Redo ❌`.trim()
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

export const handleIncomingMessage = async ({
  phone,
  message_type,
  text,
  audio_url
}) => {

  // Step 1: Find user
  const user = await getUserByPhone(phone)
  if (!user) {
    return `👋 *VyaparBook mein aapka swagat hai!*

Pehle register karo:
🔗 ${APP_URL}

App kholo aur apna phone number daalo.
Phir WhatsApp pe sab kuch kar sakte ho!`
  }

  // Step 2: Transcribe audio if needed
  let messageText = text
  if (message_type === 'audio' && audio_url) {
    try {
      messageText = await transcribeAudio(audio_url)
    } catch {
      return `❌ Audio samajh nahi aaya.
Text mein likh ke bhejo ya dubara try karo.`
    }
  }

  if (!messageText || messageText.trim() === '') {
    return `❌ Message empty lag raha hai. Dobara try karo.`
  }

  const cleanText = messageText.trim()
  console.log('Processing message:', cleanText)

  if (await isDuplicateMessage(phone, user.id, cleanText)) {
    return `✅ Same message already process chesanu. Duplicate save avoid chesanu.`
  }
  await saveMessageFingerprint(phone, user.id, cleanText)

  // Step 3: Check for pending confirmation
  const pendingSession = await getPendingSession(phone)
  if (pendingSession) {
    const reply = cleanText

    if (reply === '1') {
      return await confirmPendingSession(pendingSession, user)
    }

    if (reply === '2') {
      await rejectSession(pendingSession.id)
      return `❌ Cancel kar diya!

Dobara bolo ya type karo 🎤`
    }

    // Handle AWAITING_RATE — user typed a number
    if (pendingSession.intent === 'AWAITING_RATE') {
      const maybeRate = parseFloat(reply)
      if (!isNaN(maybeRate) && maybeRate > 0) {
        // Store the rate input in session_data and treat as confirmation
        const updatedData = {
          ...(pendingSession.session_data || {}),
          awaitingInput: reply
        }
        await updateSession(pendingSession.id, { session_data: updatedData })
        const freshSession = { ...pendingSession, session_data: updatedData }
        return await confirmPendingSession(freshSession, user)
      }
    }

    // User sent a new message — cancel old session and process fresh
    await rejectSession(pendingSession.id)
  }

  // Step 4: Detect intent
  const queryContext = await getLatestQueryContext(phone)
  const intent = await detectIntent(cleanText, queryContext)
  console.log('Intent:', intent.intent, 'Confidence:', intent.confidence)

  // Step 5: Handle GREETING
  if (intent.intent === 'GREETING') {
    const hour = new Date().getHours()
    const greeting = hour < 12
      ? 'Good Morning! 🌅'
      : hour < 17
        ? 'Good Afternoon! ☀️'
        : 'Good Evening! 🌙'

    return `${greeting} *${user.name}*!

Main VyaparBook hun — aapka digital munshi! 😊

Kya kar sakta hun:
• 🎤 Deals record karo (bol ke)
• 💸 Payments track karo
• 📊 Pending check karo
• 📋 Transactions dekho
• 📦 Stock track karo

*Kya help chahiye aaj?*

_"features" type karo sab dekhne ke liye_`
  }

  // Step 6: Handle FEATURES query
  if (intent.intent === 'QUERY_FEATURES') {
    const result = { type: 'FEATURES' }
    return formatForWhatsApp(result)
  }

  // Step 7: Handle QUERY intents
  if (isQueryIntent(intent)) {
    try {
      const result = await executeQuery(intent, user.id, queryContext)
      await saveQueryContext(phone, user.id, {
        party_name: intent?.entities?.party_name || queryContext?.party_name || null,
        last_intent: intent.intent,
        original_text: cleanText
      })
      await logQueryAudit({
        userId: user.id,
        phone,
        question: cleanText,
        intent: intent.intent,
        result
      })

      if (!result || result.type === 'UNKNOWN') {
        return `🤔 Ye query samajh nahi aaya.

Try karo:
• "Ravi pending?"
• "Show all transactions"
• "Today business?"
• "Mujhe kisko pay karna hai?"
• "Stock kaise hai?"`
      }

      return formatForWhatsApp(result)

    } catch (err) {
      console.error('Query error:', err)
      return `❌ Data fetch karne mein problem hui.
Thodi der baad try karo.`
    }
  }

  // Step 8: Handle ACTION intents (ADD_DEAL / ADD_PAYMENT)
  if (intent.intent === 'ADD_DEAL' || intent.intent === 'ADD_PAYMENT') {

    try {
      const parsed = await parseTransaction(cleanText)

      if (!parsed || !parsed.party_name) {
        return `🤔 Transaction samajh nahi aaya.

Example:
• _"Ravi se 5 lorry paddy 2350 rate mein kharida"_
• _"Kumar ko 2 lakh diya"_`
      }

      // Check if critical fields missing — need rate
      const needsRate = (
        (!parsed.total_amount || parsed.total_amount === 0) &&
        !parsed.rate &&
        parsed.quantity &&
        parsed.type !== 'payment'
      )

      if (needsRate) {
        await saveSession({
          phone,
          user_id: user.id,
          session_data: parsed,
          intent: 'AWAITING_RATE',
          status: 'pending'
        })

        return `🤔 *Rate nahi bataya!*

Ye samjha:
👤 ${parsed.party_name}
📦 ${parsed.quantity || '?'} ${parsed.unit || ''} ${parsed.commodity || ''}

*Ek ${parsed.unit || 'unit'} ka rate kya hai?*
Sirf number type karo:
Example: *2350*`
      }

      // Save session for confirmation
      await saveSession({
        phone,
        user_id: user.id,
        session_data: parsed,
        intent: intent.intent,
        status: 'pending'
      })

      return formatTransactionConfirmation(parsed)

    } catch (err) {
      console.error('Transaction parse error:', err)
      return `❌ Transaction samajh nahi aaya.
Dobara clearly bolo.`
    }
  }

  // Step 9: Unknown intent
  return `🤔 Ye samajh nahi aaya:
_"${cleanText}"_

Main yeh kar sakta hun:

📊 *Queries:*
• "Ravi pending?"
• "Show all transactions"
• "Today business?"
• "Mujhe kisko pay karna hai?"
• "Stock kaise hai?"

📝 *Entries:*
• "Ravi se 5 lorry 2350 rate kharida"
• "Kumar ko 2 lakh diya"

_"features" type karo puri list ke liye_`
}
