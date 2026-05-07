import { supabase } from './supabase'

const computePending = (deal) => {
  const totalPaid = (deal.payments || []).reduce(
    (sum, p) => sum + Number(p.amount || 0), 0
  )
  const totalAmount = Number(deal.total_amount || 0)
  return {
    total_paid: totalPaid,
    pending_amount: Math.max(0, totalAmount - totalPaid)
  }
}

const inferQueryIntent = (text = '') => {
  const q = text.toLowerCase()
  if (/feature|help|what can you do|what is vyaparbook|capabilit|commands|guide|how to use/.test(q)) return 'QUERY_FEATURES'
  if (
    /all transaction|all deals|all records|complete history|show me deals|transactions list/.test(q) ||
    /deal|transaction/.test(q) && /(show|list|all|history|last|top|purchase|sale)/.test(q) ||
    /record|records/.test(q) && /(show|list|all|history|last|top|purchase|sale)/.test(q)
  ) return 'QUERY_ALL_TRANSACTIONS'
  if (/stock|inventory|godown/.test(q)) return 'QUERY_STOCK'
  if (/(today|aaj|ivvaalu).*(business|transaction|deal|payment|report|summary|entries)|today business|today transactions|aaj ka hisab|today entries/.test(q)) return 'QUERY_TODAY'
  if (/(month|monthly|nela).*(business|transaction|deal|payment|report|summary|pending|analytics|data)|this month|monthly report|ee nela business|past 30 days business|month data/.test(q)) return 'QUERY_MONTHLY'
  if (/who owes me|who needs to pay me|receive|raavali|receivable|incoming pending|collect/.test(q)) return 'QUERY_TO_RECEIVE'
  if (/whom.*pay|who should i pay|to pay|pay cheyali|send money|outgoing pending|must pay|payables|pay(?!\s*me)/.test(q)) return 'QUERY_TO_PAY'
  if (/pending|baaki|balance/.test(q)) return 'QUERY_PARTY_PENDING'
  return 'UNKNOWN'
}

const buildQueryPlan = (intent) => {
  const text = (intent?.original_text || '').toLowerCase()
  const entities = intent?.entities || {}
  const plan = {
    commodity: entities.commodity || null,
    transactionType: entities.transaction_type || null,
    dateRange: entities.date_range || null,
    limit: 20
  }

  if (/purchase|konna|buy/.test(text)) plan.transactionType = 'purchase'
  if (/sale|sold|amm/.test(text)) plan.transactionType = 'sale'
  if (/(last|past)\s*7\s*(day|days)|week/.test(text)) plan.dateRange = '7d'
  if (/(last|past)\s*30\s*(day|days)|month/.test(text)) plan.dateRange = '30d'

  const limitMatch = text.match(/(top|last)\s+(\d{1,2})/)
  if (limitMatch) plan.limit = Math.min(50, Math.max(1, Number(limitMatch[2])))

  return plan
}

const applyDateRange = (query, dateRange) => {
  if (!dateRange) return query
  const now = new Date()
  if (dateRange === 'today') {
    return query.eq('deal_date', now.toISOString().split('T')[0])
  }
  if (dateRange === '7d') {
    const from = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))
    return query.gte('deal_date', from.toISOString().split('T')[0])
  }
  if (dateRange === '30d' || dateRange === 'month') {
    const from = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
    return query.gte('deal_date', from.toISOString().split('T')[0])
  }
  return query
}

const applyQueryPlan = (query, plan) => {
  let q = query
  if (plan.transactionType) q = q.eq('type', plan.transactionType)
  if (plan.commodity) q = q.ilike('commodity', `%${plan.commodity}%`)
  q = applyDateRange(q, plan.dateRange)
  return q
}

const attachAudit = (result, intentType) => {
  if (!result || typeof result !== 'object') return result
  const audit = {
    intent: intentType,
    generated_at: new Date().toISOString(),
    checks: []
  }

  if (result.type === 'ALL_TRANSACTIONS') {
    const dealsTotal = (result.deals || []).reduce(
      (s, d) => s + Number(d.total_amount || 0), 0
    )
    const pendingTotal = (result.deals || []).reduce(
      (s, d) => s + Number(d.pending_amount || 0), 0
    )
    audit.checks.push({
      name: 'total_business_matches_deals_sum',
      expected: dealsTotal,
      actual: Number(result.totalBusiness || 0),
      ok: dealsTotal === Number(result.totalBusiness || 0)
    })
    audit.checks.push({
      name: 'total_pending_matches_deals_sum',
      expected: pendingTotal,
      actual: Number(result.totalPending || 0),
      ok: pendingTotal === Number(result.totalPending || 0)
    })
  }

  if (result.type === 'PENDING_TO_PAY') {
    const expected = (result.parties || []).reduce(
      (s, p) => s + Number(p.pending_amount || 0), 0
    )
    audit.checks.push({
      name: 'pending_to_pay_total_consistent',
      expected,
      actual: Number(result.totalPending || 0),
      ok: expected === Number(result.totalPending || 0)
    })
  }

  if (result.type === 'PENDING_TO_RECEIVE') {
    const expected = (result.deals || []).reduce(
      (s, d) => s + Number(d.pending_amount || 0), 0
    )
    audit.checks.push({
      name: 'pending_to_receive_total_consistent',
      expected,
      actual: Number(result.totalPending || 0),
      ok: expected === Number(result.totalPending || 0)
    })
  }

  return { ...result, audit }
}

// Fuzzy party name search with disambiguation
const findParty = async (userId, partyName) => {
  if (!partyName) return null
  const { data } = await supabase
    .from('parties')
    .select('*')
    .eq('user_id', userId)
    .ilike('name', `%${partyName}%`)
    .limit(5)
  const matches = data || []
  if (matches.length === 0) return null

  const exact = matches.find(
    (p) => p.name?.trim().toLowerCase() === partyName.trim().toLowerCase()
  )
  if (exact) return exact

  if (matches.length > 1) {
    return {
      __ambiguous: true,
      options: matches.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type
      }))
    }
  }
  return matches[0]
}

// Main router — call this from anywhere
export const executeQuery = async (intent, userId, context = null) => {
  const inferredType = inferQueryIntent(intent?.original_text || '')
  const type = intent?.intent && intent.intent !== 'UNKNOWN'
    ? intent.intent
    : inferredType
  const entities = { ...(intent?.entities || {}) }
  const plan = buildQueryPlan(intent)
  if (!entities.party_name && context?.party_name) {
    entities.party_name = context.party_name
  }

  try {
    switch (type) {
      case 'QUERY_PARTY_TRANSACTIONS':
        // If no party specified, return ALL transactions
        if (!entities.party_name) return attachAudit(await getAllTransactions(userId), type)
        return attachAudit(await getPartyTransactions(userId, entities.party_name, plan), type)
      case 'QUERY_ALL_TRANSACTIONS':
        return attachAudit(await getAllTransactions(userId, plan), type)
      case 'QUERY_PARTY_PENDING':
        if (!entities.party_name) {
          return attachAudit(await getAllPending(userId), type)
        }
        return attachAudit(await getPartyPending(userId, entities.party_name), type)
      case 'QUERY_PARTY_PAYMENTS':
        return attachAudit(await getPartyPayments(userId, entities.party_name), type)
      case 'QUERY_ALL_PENDING':
        return attachAudit(await getAllPending(userId), type)
      case 'QUERY_TO_PAY':
        return attachAudit(await getPendingToPay(userId), type)
      case 'QUERY_TO_RECEIVE':
        return attachAudit(await getPendingToReceive(userId), type)
      case 'QUERY_TOP_PENDING':
        return attachAudit(await getTopPending(userId), type)
      case 'QUERY_TODAY':
        return attachAudit(await getTodayBusiness(userId), type)
      case 'QUERY_MONTHLY':
        return attachAudit(await getMonthlyBusiness(userId), type)
      case 'QUERY_STOCK':
        return attachAudit(await getStockSummary(userId), type)
      case 'QUERY_LAST_PAYMENT':
        if (!entities.party_name) {
          return { type: 'CLARIFY', question: 'Party peru cheppandi. Evari last payment kavali?' }
        }
        return attachAudit(await getLastPayment(userId, entities.party_name), type)
      case 'QUERY_FEATURES':
        return { type: 'FEATURES' }
      default:
        return { type: 'UNKNOWN' }
    }
  } catch (error) {
    console.error('Query execution failed:', error)
    return { type: 'ERROR', error: error.message }
  }
}

export const __queryEngineInternals = {
  inferQueryIntent,
  buildQueryPlan
}

// 1. All transactions for a party
const getPartyTransactions = async (userId, partyName, plan) => {
  const party = await findParty(userId, partyName)
  if (party?.__ambiguous) {
    return {
      type: 'CLARIFY_PARTY',
      question: `"${partyName}" కి multiple parties unnayi. Exact party select cheyyandi.`,
      options: party.options
    }
  }
  if (!party) return {
    type: 'ERROR',
    error: 'party_not_found',
    partyName
  }

  // Fetch all deals for this party with their payments
  let dealsQuery = supabase
    .from('deals')
    .select('*, payments(amount)')
    .eq('party_id', party.id)
    .order('deal_date', { ascending: false })
    .limit(plan?.limit || 20)
  dealsQuery = applyQueryPlan(dealsQuery, plan || {})
  const { data: deals, error } = await dealsQuery

  if (error) throw error;

  const dealsWithSummary = (deals || []).map(d => {
    const { total_paid, pending_amount } = computePending(d)
    return {
      ...d,
      total_paid,
      pending_amount
    }
  })

  return {
    type: 'PARTY_TRANSACTIONS',
    party,
    deals: dealsWithSummary,
    summary: {
      totalDeals: dealsWithSummary.length,
      totalBusiness: dealsWithSummary.reduce((s, d) => s + d.total_amount, 0),
      totalPaid: dealsWithSummary.reduce((s, d) => s + d.total_paid, 0),
      totalPending: dealsWithSummary.reduce((s, d) => s + d.pending_amount, 0)
    }
  }
}

// 2. Pending amount for party
const getPartyPending = async (userId, partyName) => {
  const party = await findParty(userId, partyName)
  if (party?.__ambiguous) {
    return {
      type: 'CLARIFY_PARTY',
      question: `"${partyName}" కి multiple parties unnayi. Exact party select cheyyandi.`,
      options: party.options
    }
  }
  if (!party) return {
    type: 'ERROR',
    error: 'party_not_found',
    partyName
  }

  // Fetch all deals with payments
  const { data: deals, error } = await supabase
    .from('deals')
    .select('*, payments(amount)')
    .eq('party_id', party.id)

  if (error) throw error;

  const dealsWithSummary = (deals || []).map(d => {
    const { total_paid, pending_amount } = computePending(d)
    return {
      ...d,
      total_paid,
      pending_amount
    }
  })

  const openDeals = dealsWithSummary.filter(d => d.pending_amount > 0)
    .sort((a, b) => new Date(b.deal_date) - new Date(a.deal_date))

  const total_pending_to_pay = dealsWithSummary
    .filter(d => d.type === 'purchase')
    .reduce((s, d) => s + d.pending_amount, 0)
    
  const total_pending_to_receive = dealsWithSummary
    .filter(d => d.type === 'sale')
    .reduce((s, d) => s + d.pending_amount, 0)

  return {
    type: 'PARTY_PENDING',
    party,
    summary: {
      pending_to_pay: total_pending_to_pay,
      pending_to_receive: total_pending_to_receive,
      total_pending: total_pending_to_pay + total_pending_to_receive
    },
    openDeals
  }
}

// 3. Payment history for party
const getPartyPayments = async (userId, partyName) => {
  const party = await findParty(userId, partyName)
  if (party?.__ambiguous) {
    return {
      type: 'CLARIFY_PARTY',
      question: `"${partyName}" కి multiple parties unnayi. Exact party select cheyyandi.`,
      options: party.options
    }
  }
  if (!party) return {
    type: 'ERROR',
    error: 'party_not_found',
    partyName
  }

  const { data: payments, error } = await supabase
    .from('payments')
    .select('*, deals(commodity, type)')
    .eq('user_id', userId)
    .order('payment_date', { ascending: false })

  if (error) throw error;

  // Filter payments for this party (since payments don't have party_id directly, we check the deal)
  // Wait, payments DO have deal_id. We should fetch payments for deals belonging to this party.
  const { data: partyDeals } = await supabase
    .from('deals')
    .select('id')
    .eq('party_id', party.id);
    
  const partyDealIds = (partyDeals || []).map(d => d.id);
  const filteredPayments = (payments || []).filter(p => partyDealIds.includes(p.deal_id));

  return {
    type: 'PARTY_PAYMENTS',
    party,
    payments: filteredPayments,
    totalPaid: filteredPayments.reduce((s, p) => s + p.amount, 0)
  }
}

// 4. All parties with pending
const getAllPending = async (userId) => {
  // We need to fetch all deals and their payments, then aggregate by party
  const { data: deals, error } = await supabase
    .from('deals')
    .select('*, parties(name, type), payments(amount)')
    .eq('user_id', userId);

  if (error) throw error;

  const partySummaryMap = {};
  (deals || []).forEach(d => {
    const { pending_amount: pending } = computePending(d)
    
    if (pending > 0) {
      if (!partySummaryMap[d.party_id]) {
        partySummaryMap[d.party_id] = {
          party_id: d.party_id,
          party_name: d.parties?.name || 'Unknown',
          party_type: d.parties?.type || 'other',
          pending_amount: 0
        };
      }
      partySummaryMap[d.party_id].pending_amount += pending;
    }
  });

  const partiesWithPending = Object.values(partySummaryMap)
    .sort((a, b) => b.pending_amount - a.pending_amount);

  return {
    type: 'ALL_PENDING',
    parties: partiesWithPending,
    totalPending: partiesWithPending.reduce((s, p) => s + p.pending_amount, 0)
  }
}

// 5. Top 5 pending parties
const getTopPending = async (userId) => {
  const result = await getAllPending(userId);
  return {
    type: 'TOP_PENDING',
    parties: result.parties.slice(0, 5)
  }
}

// 6. Today's business
const getTodayBusiness = async (userId) => {
  const today = new Date().toISOString().split('T')[0]

  const { data: deals } = await supabase
    .from('deals')
    .select('*, parties(name)')
    .eq('user_id', userId)
    .eq('deal_date', today)
    .order('created_at', { ascending: false })

  const { data: payments } = await supabase
    .from('payments')
    .select('*, deals(parties(name))')
    .eq('user_id', userId)
    .eq('payment_date', today)

  return {
    type: 'TODAY_BUSINESS',
    deals: deals || [],
    payments: payments || [],
    totalDeals: deals?.reduce(
      (s, d) => s + d.total_amount, 0) || 0,
    totalPayments: payments?.reduce(
      (s, p) => s + p.amount, 0) || 0
  }
}

// 7. This month summary
const getMonthlyBusiness = async (userId) => {
  const now = new Date()
  const firstDay = new Date(
    now.getFullYear(), now.getMonth(), 1
  ).toISOString().split('T')[0]
  const lastDay = new Date(
    now.getFullYear(), now.getMonth() + 1, 0
  ).toISOString().split('T')[0]

  const { data: deals } = await supabase
    .from('deals')
    .select('*, parties(name)')
    .eq('user_id', userId)
    .gte('deal_date', firstDay)
    .lte('deal_date', lastDay)

  const purchases = deals?.filter(d => d.type === 'purchase') || []
  const sales = deals?.filter(d => d.type === 'sale') || []

  return {
    type: 'MONTHLY_BUSINESS',
    month: now.toLocaleString('en-IN', { month: 'long' }),
    year: now.getFullYear(),
    deals: deals || [],
    purchases: {
      count: purchases.length,
      total: purchases.reduce((s, d) => s + d.total_amount, 0)
    },
    sales: {
      count: sales.length,
      total: sales.reduce((s, d) => s + d.total_amount, 0)
    }
  }
}

// 8. Current stock
const getStockSummary = async (userId) => {
  const { data } = await supabase
    .from('stock')
    .select('*')
    .eq('user_id', userId)
    .gt('current_stock', 0)
    .order('commodity')

  return {
    type: 'STOCK_SUMMARY',
    items: data || []
  }
}

// 9. Last payment for party
const getLastPayment = async (userId, partyName) => {
  const party = await findParty(userId, partyName)
  if (party?.__ambiguous) {
    return {
      type: 'CLARIFY_PARTY',
      question: `"${partyName}" కి multiple parties unnayi. Exact party select cheyyandi.`,
      options: party.options
    }
  }
  if (!party) return {
    type: 'ERROR',
    error: 'party_not_found',
    partyName
  }

  const { data: deals } = await supabase
    .from('deals')
    .select('id')
    .eq('party_id', party.id)

  const partyDealIds = (deals || []).map(d => d.id);

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .in('deal_id', partyDealIds)
    .order('payment_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    type: 'LAST_PAYMENT',
    party,
    payment: payment || null
  }
}

// 10. All transactions (no party filter)
const getAllTransactions = async (userId, plan = {}) => {
  let dealsQuery = supabase
    .from('deals')
    .select(`
      *,
      parties(name),
      payments(amount)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(plan.limit || 20)
  dealsQuery = applyQueryPlan(dealsQuery, plan)
  const { data: deals, error } = await dealsQuery

  if (error) throw error

  const dealsWithSummary = (deals || []).map((d) => ({
    ...d,
    ...computePending(d)
  }))
  const totalBusiness = dealsWithSummary.reduce(
    (s, d) => s + Number(d.total_amount || 0), 0
  )
  const totalPending = dealsWithSummary.reduce(
    (s, d) => s + Number(d.pending_amount || 0), 0
  )

  return {
    type: 'ALL_TRANSACTIONS',
    deals: dealsWithSummary,
    totalBusiness,
    totalPending,
    totalDeals: dealsWithSummary.length
  }
}

// 11. Pending amounts I need to PAY (purchase deals)
const getPendingToPay = async (userId) => {
  const { data: deals, error } = await supabase
    .from('deals')
    .select(`
      *,
      parties(name, type),
      payments(amount)
    `)
    .eq('user_id', userId)
    .eq('type', 'purchase')

  if (error) throw error

  const partySummaryMap = {}
  ;(deals || []).forEach(d => {
    const { pending_amount: pending } = computePending(d)
    if (pending > 0) {
      const key = d.party_id
      if (!partySummaryMap[key]) {
        partySummaryMap[key] = {
          party_id: key,
          party_name: d.parties?.name || 'Unknown',
          party_type: d.parties?.type || 'supplier',
          pending_amount: 0
        }
      }
      partySummaryMap[key].pending_amount += pending
    }
  })

  const parties = Object.values(partySummaryMap)
    .sort((a, b) => b.pending_amount - a.pending_amount)

  return {
    type: 'PENDING_TO_PAY',
    parties,
    totalPending: parties.reduce((s, p) => s + p.pending_amount, 0)
  }
}

// 12. Pending amounts to RECEIVE (sale deals)
const getPendingToReceive = async (userId) => {
  const { data: deals, error } = await supabase
    .from('deals')
    .select(`
      *,
      parties(name, type),
      payments(amount)
    `)
    .eq('user_id', userId)
    .eq('type', 'sale')

  if (error) throw error

  const dealsWithPending = (deals || []).map(d => {
    const { pending_amount } = computePending(d)
    return {
      ...d,
      pending_amount
    }
  }).filter(d => d.pending_amount > 0)
    .sort((a, b) => b.pending_amount - a.pending_amount)

  return {
    type: 'PENDING_TO_RECEIVE',
    deals: dealsWithPending,
    totalPending: dealsWithPending.reduce((s, d) => s + d.pending_amount, 0)
  }
}
