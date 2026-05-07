import fs from 'fs';

// Read .env file manually
const envFile = fs.readFileSync('.env', 'utf8');
const groqKeyLine = envFile.split('\\n').find(line => line.startsWith('VITE_GROQ_API_KEY='));
const GROQ_API_KEY = groqKeyLine ? groqKeyLine.split('=')[1].trim() : '';

const INTENT_PROMPT = `
You are VyaparBook AI Agent — an intelligent accounting assistant for Indian traders.
Analyze the user's message and return a JSON object identifying the intent and entities.
Do not wrap the JSON in Markdown code blocks. Output raw JSON only.

Intent Types:
- QUERY_PARTY_TRANSACTIONS → asking about specific party's deals/transactions
- QUERY_PARTY_PENDING → asking pending amount for specific party
- QUERY_PARTY_PAYMENTS → asking payment history for specific party  
- QUERY_ALL_PENDING → asking overall pending
- QUERY_TOP_PENDING → who owes most / who do I owe most
- QUERY_TODAY → today's business/transactions
- QUERY_MONTHLY → this month summary
- QUERY_DATE_RANGE → specific date range
- QUERY_STOCK → stock/inventory status
- QUERY_LAST_PAYMENT → when was last payment
- QUERY_DEAL_DETAIL → specific deal details
- ADD_DEAL → recording new purchase/sale
- ADD_PAYMENT → recording payment
- UNKNOWN → cannot understand

Response Format MUST be exact JSON like this:
{
  "intent": "INTENT_TYPE",
  "confidence": 0.0 to 1.0,
  "entities": {
    "party_name": "string or null",
    "amount": "number or null",
    "date_range": "today/week/month/year or null",
    "commodity": "string or null",
    "transaction_type": "purchase/sale or null",
    "quantity": "number or null",
    "unit": "string or null",
    "rate": "number or null"
  },
  "original_language": "telugu/english/mixed"
}

Examples:

Input: "Ravi transactions anni chupinchu"
Output: {
  "intent": "QUERY_PARTY_TRANSACTIONS",
  "confidence": 0.98,
  "entities": {
    "party_name": "Ravi",
    "date_range": null
  },
  "original_language": "mixed"
}

Input: "Naga Tharun pending amount enta?"
Output: {
  "intent": "QUERY_PARTY_PENDING",
  "confidence": 0.99,
  "entities": {
    "party_name": "Naga Tharun"
  },
  "original_language": "mixed"
}

Input: "Evaru naku ekkuva pay cheyali?"
Output: {
  "intent": "QUERY_TOP_PENDING",
  "confidence": 0.95,
  "entities": {
    "party_name": null
  },
  "original_language": "telugu"
}

Input: "This month total business enta?"
Output: {
  "intent": "QUERY_MONTHLY",
  "confidence": 0.97,
  "entities": {
    "date_range": "month"
  },
  "original_language": "mixed"
}

Input: "Ravi ki last payment epudu chesamu?"
Output: {
  "intent": "QUERY_LAST_PAYMENT",
  "confidence": 0.96,
  "entities": {
    "party_name": "Ravi"
  },
  "original_language": "mixed"
}

Input: "Ravi degara 5 lorry paddy 2350 konna"
Output: {
  "intent": "ADD_DEAL",
  "confidence": 0.99,
  "entities": {
    "party_name": "Ravi",
    "transaction_type": "purchase",
    "quantity": 5,
    "unit": "lorry",
    "commodity": "paddy",
    "rate": 2350
  },
  "original_language": "mixed"
}

Now analyze this message and return ONLY valid JSON:
`;

export const detectIntent = async (message) => {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: INTENT_PROMPT },
          { role: 'user', content: message }
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq API Error: ${err}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanContent);
  } catch (error) {
    console.error('Intent Detection Error:', error);
    return null;
  }
};

const runTests = async () => {
  const queries = [
    "Ravi transactions anni chupinchu",
    "Naga Tharun pending amount enta?",
    "Today emi chesamu?",
    "Stock ela undi?",
    "Ravi degara 5 lorry paddy 2350 konna"
  ];

  console.log("🔥 Starting Agent Brain Tests with Llama-3.3-70b-versatile\\n");

  for (const query of queries) {
    console.log("Query: " + query);
    console.log("Thinking...");
    const start = Date.now();
    const result = await detectIntent(query);
    const end = Date.now();
    console.log("Time: " + (end - start) + "ms");
    console.log(JSON.stringify(result, null, 2));
    console.log("--------------------------------------------------\\n");
  }
};

runTests();
