import fs from 'fs'
import { GoogleGenerativeAI } from '@google/generative-ai'

const envFile = fs.readFileSync('.env', 'utf8')
const geminiKeyLine = envFile
  .split('\n')
  .find((line) => line.startsWith('VITE_GEMINI_API_KEY='))
const GEMINI_API_KEY = geminiKeyLine
  ? geminiKeyLine.split('=')[1].trim()
  : ''

const INTENT_PROMPT = fs
  .readFileSync('./src/services/agentBrain.js', 'utf8')
  .split('const INTENT_PROMPT = `')[1]
  .split('`\n\nexport const detectIntent')[0]

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

const detectIntent = async (message) => {
  let result
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    result = await model.generateContent(INTENT_PROMPT + message)
  } catch {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })
    result = await model.generateContent(INTENT_PROMPT + message)
  }
  const text = result.response.text()
  const clean = text.replace(/```json/g, '').replace(/```/g, '').trim()
  return JSON.parse(clean)
}

const runTests = async () => {
  const queries = [
    'give me all transactions',
    'show all transactions',
    'total pending amount',
    'give me all details to whom I want to send money pending',
    'Naga Tharun pending enta?',
    'who owes me money',
    'today business?',
    'stock kaise hai',
    'hi',
    'Ravi se 5 lorry 2350 kharida'
  ]

  for (const query of queries) {
    const result = await detectIntent(query)
    console.log(`${query} -> ${result.intent} (${result.confidence})`)
  }
}

runTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
