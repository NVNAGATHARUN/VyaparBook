import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const GEMINI_PROMPT = `
You are VyaparBook AI — an accounting assistant for Indian traders dealing in rice, paddy, and grains.

Extract transaction details from the given text.
Text may be in Telugu, English, or mixed (Tenglish).

Return ONLY a valid JSON object. No explanation. No markdown. No code blocks. Just raw JSON.

JSON Format:
{
  "party_name": "string — name of person/company",
  "type": "purchase OR sale OR payment",
  "commodity": "string — rice/paddy/wheat/etc or null",
  "quantity": number or null,
  "unit": "bags OR lorry OR quintal OR ton OR kg or null",
  "rate": number or null,
  "total_amount": number,
  "advance_paid": number (0 if not mentioned),
  "pending_amount": number,
  "notes": "string or null"
}

Rules:
- "purchase" = we bought from them (we owe them)
- "sale" = we sold to them (they owe us)
- "payment" = money transfer (paying or receiving)
- If quantity and rate given, total_amount = quantity * rate
- pending_amount = total_amount - advance_paid
- For lorry loads: 1 lorry ≈ 10 tons (don't calculate, just use given values)
- Telugu words: degara=from/with, ki=to, konna=bought, ammanu=sold, chesanu=did, tiskunnanu=took/received, icchanu=gave, lakh/lakhs=100000, velu=going

Telugu-English Examples:
Input: "Ravi degara 5 lorry paddy 2350 rate ki konna"
Output: {"party_name":"Ravi","type":"purchase","commodity":"paddy","quantity":5,"unit":"lorry","rate":2350,"total_amount":11750,"advance_paid":0,"pending_amount":11750,"notes":null}

Input: "Kumar ki 10 bags rice sell chesanu 50000 advance tiskunnanu"
Output: {"party_name":"Kumar","type":"sale","commodity":"rice","quantity":10,"unit":"bags","rate":null,"total_amount":0,"advance_paid":50000,"pending_amount":0,"notes":"advance received 50000"}

Input: "Ravi ki 2 lakh pay chesanu"
Output: {"party_name":"Ravi","type":"payment","commodity":null,"quantity":null,"unit":null,"rate":null,"total_amount":200000,"advance_paid":200000,"pending_amount":0,"notes":"payment made to Ravi"}

Input: "Suresh degara wheat 100 quintal 2800 rate ki konna, 50000 advance ichanu"
Output: {"party_name":"Suresh","type":"purchase","commodity":"wheat","quantity":100,"unit":"quintal","rate":2800,"total_amount":280000,"advance_paid":50000,"pending_amount":230000,"notes":null}

Now parse this text:
`;

/**
 * Parse voice transcription into structured deal data using Gemini
 * @param {string} text - Transcribed text
 * @returns {Promise<{data: Object, error: string|null}>}
 */
export const parseTransaction = async (text) => {
  const tryParse = async (modelName) => {
    console.log(`Attempting Gemini parse with model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const prompt = GEMINI_PROMPT + `"${text}"`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let responseText = response.text().trim();
    
    // Strip markdown code blocks if present
    responseText = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(responseText);
    
    // Validate required fields
    if (!parsed.party_name) {
      throw new Error('Could not identify party name');
    }
    
    // Ensure numeric fields
    parsed.total_amount = Number(parsed.total_amount) || 0;
    parsed.advance_paid = Number(parsed.advance_paid) || 0;
    parsed.pending_amount = Number(parsed.pending_amount) || 0;
    
    // Recalculate pending if total and advance are known
    if (parsed.total_amount > 0 && parsed.advance_paid >= 0) {
      parsed.pending_amount = Math.max(0, parsed.total_amount - parsed.advance_paid);
    }

    return parsed;
  };

  const modelsToTry = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];

  let lastError = null;
  let hitQuota = false;

  for (const modelName of modelsToTry) {
    try {
      const data = await tryParse(modelName);
      return { data, error: null };
    } catch (err) {
      console.warn(`Model ${modelName} failed:`, err.message);
      lastError = err;
      
      if (err.message.includes('429')) {
        hitQuota = true;
      }
      
      // If it's a quota or auth error, we probably shouldn't retry, 
      // but for 503, 404, 500, or 429, we should keep trying the next model.
      if (!err.message.includes('503') && !err.message.includes('404') && !err.message.includes('500') && !err.message.includes('429')) {
         break; // Stop trying if it's a JSON parsing error or auth error
      }
    }
  }

  if (hitQuota) {
    return { data: null, error: "Google API Quota Limit Reached. Please wait 1 minute before trying again." };
  }

  console.error('All Gemini models failed. Last error:', lastError);
  return { data: null, error: lastError?.message || 'Could not understand the transaction' };
};
