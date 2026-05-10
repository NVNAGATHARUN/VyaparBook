import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(
  import.meta.env.VITE_GEMINI_API_KEY
)

const INTENT_PROMPT = `
You are VyaparBook AI — a sophisticated accounting agent for Indian traders.
Your goal is to analyze the user's message, understand their business need, and provide a structured response.

Current Date: ${new Date().toLocaleDateString('en-IN')}
User context: {business_type: "Grains/Rice/Paddy"}

## Capabilities:
1. RECORDING: Add deals (purchase/sale) or payments.
2. REPORTING: Show pending, transactions, stock, today's summary, monthly reports.
3. ANALYSIS: Answer complex questions about business health, top parties, or trends.
4. GREETING: Friendly conversation.

## Critical Rules:
- If the user is asking "What is...", "How much...", "Show...", "List...", "Who...", it's a QUERY.
- If the user is stating a fact like "Ravi se 5 lorry konna", it's an ACTION (ADD_DEAL).
- If the user is stating a payment like "Ravi ki 2 lakh diya", it's an ACTION (ADD_PAYMENT).
- Be extremely careful with "Telugu" and "Tenglish".
  - "enta raavali" = how much to receive (QUERY_TO_RECEIVE)
  - "enta pay cheyali" = how much to pay (QUERY_TO_PAY)
  - "chupinchu" = show (QUERY)
  - "ivvaalu" = today (QUERY_TODAY)

## Output Format (JSON):
{
  "reasoning": "Briefly explain your understanding of the user's need",
  "intent": "INTENT_TYPE",
  "confidence": 0.0 to 1.0,
  "entities": {
    "party_name": "string or null",
    "amount": number or null,
    "commodity": "string or null",
    "transaction_type": "purchase/sale or null",
    "quantity": number or null,
    "unit": "string or null",
    "rate": number or null,
    "date_range": "today/week/month/year/all or null"
  },
  "original_text": "the user's message"
}

## Intent Types:
- QUERY_PARTY_TRANSACTIONS
- QUERY_PARTY_PENDING
- QUERY_ALL_PENDING
- QUERY_TO_PAY
- QUERY_TO_RECEIVE
- QUERY_TOP_PENDING
- QUERY_TODAY
- QUERY_MONTHLY
- QUERY_STOCK
- QUERY_LAST_PAYMENT
- QUERY_ALL_TRANSACTIONS
- QUERY_FEATURES
- QUERY_GENERAL_ANALYSIS (For complex questions like "How was my business last week?")
- ADD_DEAL
- ADD_PAYMENT
- GREETING
- THANK_YOU

Now, analyze this message and respond in JSON:
`;

const inferIntentFromText = (message) => {
  const text = (message || '').toLowerCase().trim()
  const startsLikeQuery = /^(show|give me|tell me|what|how much|list|all|which|who)/.test(text)

  if (/^(hi|hello|hey|good morning|good evening|good afternoon|namaste|hii|helo)\b/.test(text)) {
    return 'GREETING'
  }
  if (/thank you|thanks|dhanyawaad|shukriya/.test(text)) {
    return 'THANK_YOU'
  }
  if (/feature|help|what can you do|how to use|vyaparbook/.test(text)) {
    return 'QUERY_FEATURES'
  }
  if (/stock|inventory|godown/.test(text)) {
    return 'QUERY_STOCK'
  }
  if (/today|aaj|ivvaalu/.test(text)) {
    return 'QUERY_TODAY'
  }
  if (/month|monthly|nela/.test(text)) {
    return 'QUERY_MONTHLY'
  }
  if (/who owes me|receive|raavali/.test(text)) {
    return 'QUERY_TO_RECEIVE'
  }
  if (/whom.*pay|who should i pay|to pay|pay cheyali|send money/.test(text)) {
    return 'QUERY_TO_PAY'
  }
  if (/all transaction|all deals|complete history|show me deals|transactions list/.test(text)) {
    return 'QUERY_ALL_TRANSACTIONS'
  }
  if (/pending/.test(text) && startsLikeQuery) {
    return 'QUERY_PARTY_PENDING'
  }
  return 'UNKNOWN'
}

export const detectIntent = async (message, context = null) => {
  try {
    const contextPrompt = context
      ? `\n\nPrevious conversation context (use only if user message is follow-up):\n${JSON.stringify(context)}\n`
      : ''

    let result
    try {
      const primaryModel = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash'
      })
      result = await primaryModel.generateContent(
        INTENT_PROMPT + contextPrompt + message
      )
    } catch {
      // Some keys/projects only expose the "-latest" alias.
      const fallbackModel = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash-latest'
      })
      result = await fallbackModel.generateContent(
        INTENT_PROMPT + contextPrompt + message
      )
    }

    const text = result.response.text()
    const clean = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()

    const parsed = JSON.parse(clean)
    console.log('Intent detected:', parsed)
    if (!parsed.intent || parsed.intent === 'UNKNOWN') {
      return {
        ...parsed,
        intent: inferIntentFromText(message),
        original_text: parsed.original_text || message
      }
    }
    return { ...parsed, original_text: parsed.original_text || message }

  } catch (error) {
    console.error('Intent detection failed:', error)
    return {
      intent: inferIntentFromText(message),
      confidence: 0,
      entities: {},
      original_text: message
    }
  }
}

export const isQueryIntent = (intent) => {
  return intent.intent.startsWith('QUERY_')
}

export const isActionIntent = (intent) => {
  return intent.intent === 'ADD_DEAL' ||
         intent.intent === 'ADD_PAYMENT'
}

export const isSocialIntent = (intent) => {
  return intent.intent === 'GREETING' || intent.intent === 'THANK_YOU'
}
