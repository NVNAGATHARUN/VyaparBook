import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) acc[key.trim()] = rest.join('=').trim();
  return acc;
}, {});

const groqKey = env.GROQ_API_KEY;

const analyzeWithAI = async (text) => {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'system', content: 'Return JSON ONLY: { "intent": "TYPE" }' }, { role: 'user', content: text }],
      response_format: { type: 'json_object' }
    }),
  });
  const json = await res.json();
  console.log('JSON:', JSON.stringify(json, null, 2));
};

analyzeWithAI("Add a deal I am purchasing 10 lorry of channa from jagadeesh at price 100000 per lorry");
