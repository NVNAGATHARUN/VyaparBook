import { describe, it, expect } from 'vitest'
import { __queryEngineInternals } from './queryEngine'

const { inferQueryIntent, buildQueryPlan } = __queryEngineInternals

const makeCases = (items, expected) => items.map((text) => ({ text, expected }))

const cases = [
  ...makeCases([
    'show all transactions',
    'give me all transactions',
    'all deals',
    'transactions list',
    'complete history',
    'last 10 deals',
    'top 15 transactions',
    'show me deals',
    'all records',
    'display all deals'
  ], 'QUERY_ALL_TRANSACTIONS'),
  ...makeCases([
    'Ravi pending?',
    'how much pending',
    'pending amount',
    'total pending',
    'baaki enta',
    'balance cheppu',
    'pending details',
    'all pending',
    'pending list',
    'party pending summary'
  ], 'QUERY_PARTY_PENDING'),
  ...makeCases([
    'who owes me money',
    'naku enta raavali',
    'receive cheyali enta',
    'to receive details',
    'who needs to pay me',
    'receivable list',
    'due to receive',
    'incoming pending',
    'payment I should receive',
    'money to collect',
    'who owes me most amount'
  ], 'QUERY_TO_RECEIVE'),
  ...makeCases([
    'who should i pay',
    'nenu enta pay cheyali',
    'to pay list',
    'pay cheyali evvariki',
    'whom do i need to pay',
    'outgoing pending',
    'money i must pay',
    'supplier pending payables',
    'to pay details',
    'send money pending list'
  ], 'QUERY_TO_PAY'),
  ...makeCases([
    'today business',
    'today transactions',
    'aaj ka hisab',
    'ivvaalu summary',
    'today report',
    'today deals',
    'today payments',
    'today business status',
    'today amount summary',
    'today entries'
  ], 'QUERY_TODAY'),
  ...makeCases([
    'monthly report',
    'this month summary',
    'ee nela business',
    'month wise report',
    'monthly deals',
    'past 30 days business',
    'this month analytics',
    'monthly pending summary',
    'current month report',
    'month data'
  ], 'QUERY_MONTHLY'),
  ...makeCases([
    'stock ela undi',
    'inventory details',
    'godown stock',
    'how much stock',
    'stock summary',
    'current inventory',
    'rice stock',
    'paddy stock details',
    'warehouse stock',
    'stock report'
  ], 'QUERY_STOCK'),
  ...makeCases([
    'features',
    'help',
    'what can you do',
    'how to use',
    'vyaparbook features',
    'what is vyaparbook',
    'commands list',
    'capabilities',
    'guide',
    'usage help'
  ], 'QUERY_FEATURES'),
  ...makeCases([
    'random sentence',
    'weather today',
    'movie suggestion',
    'cricket score',
    'tell me joke',
    'translate this',
    'email draft',
    'set alarm',
    'open camera',
    'whatsapp status ideas'
  ], 'UNKNOWN'),
  ...makeCases([
    'show all transactions for last 7 days',
    'purchase transactions this month',
    'sale deals last 30 days',
    'top 5 all deals',
    'last 8 purchase deals',
    'last 6 sale transactions',
    'all paddy purchase deals',
    'all rice sale records',
    'show last 12 transactions month wise'
  ], 'QUERY_ALL_TRANSACTIONS')
]

describe('Query intent evaluation corpus', () => {
  it('classifies broad query corpus deterministically', () => {
    expect(cases.length).toBe(100)
    for (const c of cases) {
      const actual = inferQueryIntent(c.text)
      expect(actual, `Case failed: "${c.text}"`).toBe(c.expected)
    }
  })

  it('extracts query plan fields from mixed natural language', () => {
    const p1 = buildQueryPlan({
      original_text: 'show last 12 purchase paddy deals for past 30 days'
    })
    expect(p1.limit).toBe(12)
    expect(p1.transactionType).toBe('purchase')
    expect(p1.dateRange).toBe('30d')
  })
})
