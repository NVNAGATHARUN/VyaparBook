import { describe, it } from 'vitest'
import { detectIntent } from './src/services/agentBrain.js'

describe('Intent Detection Tests', () => {
  const examples = [
    "give me all transactions",
    "show all transactions",
    "total pending amount",
    "give me all details to whom I want to send money",
    "Naga Tharun pending enta?",
    "who owes me money",
    "today business?",
    "stock kaise hai",
    "Ravi se 5 lorry 2350 kharida",
    "Kumar ko 2 lakh diya"
  ];

  it('should detect intents for 10 examples', async () => {
    for (const text of examples) {
      console.log(`\nTesting: "${text}"`);
      const result = await detectIntent(text);
      console.log(`Intent: ${result.intent}`);
      if (result.intent === 'ADD_DEAL' || result.intent === 'ADD_PAYMENT') {
        console.log(`Entities:`, result.entities);
      }
    }
  }, 30000); // 30 seconds timeout
});
