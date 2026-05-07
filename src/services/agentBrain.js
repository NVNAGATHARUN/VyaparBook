import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(
  import.meta.env.VITE_GEMINI_API_KEY
)

const INTENT_PROMPT = `
You are VyaparBook — an intelligent WhatsApp 
accounting assistant for Indian traders.

Your job: Understand EXACTLY what the user wants
and classify it correctly.

CRITICAL RULE:
If user is ASKING for information → it is a QUERY
If user is RECORDING a transaction → it is an ACTION
NEVER confuse these two.

## QUERY Intents (User wants information):

QUERY_PARTY_TRANSACTIONS:
User wants to see deals/transactions of a person.
Examples:
- "show all transactions"
- "give me all transactions"  
- "Ravi transactions chupinchu"
- "all deals show karo"
- "transactions list"
- "show me deals"

QUERY_PARTY_PENDING:
User wants to know pending amount of someone.
Examples:
- "Ravi pending?"
- "Naga Tharun pending amount enta?"
- "how much pending for Ravi"
- "Ravi balance"

QUERY_ALL_PENDING:
User wants to know ALL pending amounts overall.
Examples:
- "total pending amount"
- "what is total pending"
- "how much total pending u want to pay"
- "overall pending"
- "total baaki"

QUERY_TO_PAY:
User wants to know who THEY owe money to.
Examples:
- "whom do I need to pay"
- "give me all details to whom I want to send money"
- "who should I pay"
- "pending amount details I need to pay"
- "nenu pay cheyali evvarike"
- "nenu enta pay cheyali"

QUERY_TO_RECEIVE:
User wants to know who owes THEM money.
Examples:
- "who needs to pay me"
- "who owes me money"
- "naku enta raavali"
- "receive cheyali enta"

QUERY_TOP_PENDING:
User wants ranked list of pending.
Examples:
- "who owes most"
- "biggest pending"
- "top pending parties"

QUERY_TODAY:
User wants today's business summary.
Examples:
- "today business"
- "ivvaalu emi chesamu"
- "today transactions"
- "aaj ka hisab"

QUERY_MONTHLY:
User wants this month's summary.
Examples:
- "this month summary"
- "monthly report"
- "ee nela business"

QUERY_STOCK:
User wants stock/inventory status.
Examples:
- "stock ela undi"
- "how much stock"
- "godown stock"
- "inventory"

QUERY_LAST_PAYMENT:
User wants to know when last payment was made.
Examples:
- "Ravi last payment epudu"
- "when did I last pay Ravi"
- "last payment details"

QUERY_ALL_TRANSACTIONS:
User wants ALL transactions without party filter.
Examples:
- "show all transactions"
- "give me all transactions"
- "all deals"
- "all records"
- "complete history"

QUERY_FEATURES:
User wants to know what the app can do.
Examples:
- "what can you do"
- "features emi unnay"
- "what are your features"
- "help"
- "how to use"
- "what is vyaparbook"

## ACTION Intents (User is recording data):

ADD_DEAL:
User is recording a NEW purchase or sale.
MUST have a party name AND quantity/amount.
Examples:
- "Ravi degara 5 lorry paddy 2350 rate ki konna"
- "Kumar ki 10 bags rice ammanu"
- "bought 5 lorry from Ravi"

ADD_PAYMENT:
User is recording a payment made/received.
MUST have a party name AND amount.
Examples:
- "Ravi ki 2 lakh pay chesanu"
- "Kumar nunchi 50000 tiskunnanu"
- "paid 2L to Ravi"

## SOCIAL Intents (Greetings/Conversation):

GREETING:
User saying hello or being friendly.
Examples:
- "hi", "hello", "hey"
- "good morning", "good evening"
- "namaste", "hii", "helo"
- "how are you"

UNKNOWN:
Cannot understand or off-topic.

---

## CRITICAL CLASSIFICATION RULES:

1. "give me all transactions" = QUERY_ALL_TRANSACTIONS
   NOT a new transaction entry

2. "show me deals" = QUERY_ALL_TRANSACTIONS
   NOT a new transaction entry

3. "pending amount details" = QUERY_TO_PAY
   NOT a new transaction entry

4. Any message with "show", "give me", "tell me",
   "what is", "how much", "list", "all" at start
   = ALMOST ALWAYS a QUERY

5. Only classify as ADD_DEAL if user mentions:
   - A person's name AND
   - A quantity/amount AND
   - Buying or selling action

6. Only classify as ADD_PAYMENT if user mentions:
   - A person's name AND
   - A specific amount AND
   - Payment action word

---

## Return Format (ONLY JSON, no other text):

{
  "intent": "INTENT_TYPE",
  "confidence": 0.0 to 1.0,
  "entities": {
    "party_name": "string or null",
    "amount": number or null,
    "date_range": "today/week/month/year or null",
    "commodity": "string or null",
    "transaction_type": "purchase/sale or null",
    "quantity": number or null,
    "unit": "string or null",
    "rate": number or null
  },
  "original_text": "the user's message"
}

Now classify this message:
`

const inferIntentFromText = (message) => {
  const text = (message || '').toLowerCase().trim()
  const startsLikeQuery = /^(show|give me|tell me|what|how much|list|all|which|who)/.test(text)

  if (/^(hi|hello|hey|good morning|good evening|good afternoon|namaste)\b/.test(text)) {
    return 'GREETING'
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
    } catch (primaryError) {
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
  return intent.intent === 'GREETING'
}
