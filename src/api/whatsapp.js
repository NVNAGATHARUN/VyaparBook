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
  } catch (_) { /* ignore if RPC not defined */ }

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

      const { data: deals } = await getDealsByParty(partyRecord.id)
      const openDeal = (deals || []).find(d => {
        const paid = (d.payments || []).reduce((s, p) => s + Number(p.amount), 0)
        return Number(d.total_amount) - paid > 0
      })

      if (!openDeal && (!deals || deals.length === 0)) {
        await rejectSession(session.id)
        return `❌ ${partyRecord.name} ke liye koi open deal nahi hai. Pehle deal create karo.`
      }

      const dealId = openDeal?.id || deals[0].id
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

      const { error: dealError } = await supabase
        .from('deals')
        .insert([{
          user_id: user.id,
          party_id: partyRecord.id,
          type: parsed.type || 'purchase',
          commodity: parsed.commodity || null,
          quantity: parsed.quantity || null,
          unit: parsed.unit || null,
          rate: parsed.rate || null,
          total_amount: parsed.total_amount,
          advance_paid: parsed.advance_paid || 0,
          pending_amount: parsed.pending_amount || parsed.total_amount,
          deal_date: new Date().toISOString().split('T')[0],
          notes: parsed.notes || null
        }])

      if (dealError) throw dealError

      // Update stock if commodity present
      if (parsed.commodity && parsed.quantity) {
        await supabase.rpc('upsert_stock', {
          p_user_id: user.id,
          p_commodity: parsed.commodity.toLowerCase(),
          p_unit: parsed.unit || 'unit',
          p_quantity: parsed.quantity,
          p_type: parsed.type
        }).catch(() => { /* stock RPC optional */ })
      }

      // Save advance payment if any
      if (parsed.advance_paid && parsed.advance_paid > 0) {
        // Get the deal we just created
        const { data: newDeal } = await supabase
          .from('deals')
          .select('id')
          .eq('user_id', user.id)
          .eq('party_id', partyRecord.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (newDeal) {
          await supabase
            .from('payments')
            .insert([{
              deal_id: newDeal.id,
              user_id: user.id,
              amount: parsed.advance_paid,
              payment_mode: 'advance',
              payment_date: new Date().toISOString().split('T')[0]
            }])
        }
      }

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
    } catch (err) {
      return `❌ Audio samajh nahi aaya.
Text mein likh ke bhejo ya dubara try karo.`
    }
  }

  if (!messageText || messageText.trim() === '') {
    return `❌ Message empty lag raha hai. Dobara try karo.`
  }

  const cleanText = messageText.trim()
  console.log('Processing message:', cleanText)

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
  const intent = await detectIntent(cleanText)
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
    return `🚀 *VyaparBook Features*

🎤 *Voice Entry*
  Telugu/English mein bolo, auto save!

💸 *Deal Tracking*
  Purchase aur Sale track karo

💰 *Payment Tracking*
  Partial payments supported

📊 *Pending Amounts*
  Party-wise pending instantly

📋 *Transaction History*
  Complete deal history

📦 *Stock Tracking*
  Godown inventory auto-updated

📱 *WhatsApp Integration*
  Voice notes se entry karo

🔄 *Real-time Sync*
  WhatsApp entry = instant app update

_${APP_URL}_`
  }

  // Step 7: Handle QUERY intents
  if (isQueryIntent(intent)) {
    try {
      const result = await executeQuery(intent, user.id)

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
