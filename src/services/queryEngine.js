import { supabase } from './supabase'

// Fuzzy party name search
const findParty = async (userId, partyName) => {
  const { data } = await supabase
    .from('parties')
    .select('*')
    .eq('user_id', userId)
    .ilike('name', `%${partyName}%`)
    .limit(1)
  return data?.[0] || null
}

// Main router — call this from anywhere
export const executeQuery = async (intent, userId) => {
  const { intent: type, entities } = intent

  try {
    switch (type) {
      case 'QUERY_PARTY_TRANSACTIONS':
        // If no party specified, return ALL transactions
        if (!entities.party_name) return getAllTransactions(userId)
        return getPartyTransactions(userId, entities.party_name)
      case 'QUERY_ALL_TRANSACTIONS':
        return getAllTransactions(userId)
      case 'QUERY_PARTY_PENDING':
        return getPartyPending(userId, entities.party_name)
      case 'QUERY_PARTY_PAYMENTS':
        return getPartyPayments(userId, entities.party_name)
      case 'QUERY_ALL_PENDING':
        return getAllPending(userId)
      case 'QUERY_TO_PAY':
        return getPendingToPay(userId)
      case 'QUERY_TO_RECEIVE':
        return getPendingToReceive(userId)
      case 'QUERY_TOP_PENDING':
        return getTopPending(userId)
      case 'QUERY_TODAY':
        return getTodayBusiness(userId)
      case 'QUERY_MONTHLY':
        return getMonthlyBusiness(userId)
      case 'QUERY_STOCK':
        return getStockSummary(userId)
      case 'QUERY_LAST_PAYMENT':
        return getLastPayment(userId, entities.party_name)
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

// 1. All transactions for a party
const getPartyTransactions = async (userId, partyName) => {
  const party = await findParty(userId, partyName)
  if (!party) return {
    type: 'ERROR',
    error: 'party_not_found',
    partyName
  }

  // Fetch all deals for this party with their payments
  const { data: deals, error } = await supabase
    .from('deals')
    .select('*, payments(amount)')
    .eq('party_id', party.id)
    .order('deal_date', { ascending: false })

  if (error) throw error;

  const dealsWithSummary = (deals || []).map(d => {
    const total_paid = (d.payments || []).reduce((sum, p) => sum + Number(p.amount), 0)
    return {
      ...d,
      total_paid,
      pending_amount: Math.max(0, Number(d.total_amount) - total_paid)
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
    const total_paid = (d.payments || []).reduce((sum, p) => sum + Number(p.amount), 0)
    return {
      ...d,
      total_paid,
      pending_amount: Math.max(0, Number(d.total_amount) - total_paid)
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
    const total_paid = (d.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const pending = Math.max(0, Number(d.total_amount) - total_paid);
    
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
const getAllTransactions = async (userId) => {
  const { data: deals, error } = await supabase
    .from('deals')
    .select('*, parties(name, type), payments(amount)')
    .eq('user_id', userId)
    .order('deal_date', { ascending: false })
    .limit(100)

  if (error) throw error

  const dealsWithSummary = (deals || []).map(d => {
    const total_paid = (d.payments || []).reduce((sum, p) => sum + Number(p.amount), 0)
    return {
      ...d,
      total_paid,
      pending_amount: Math.max(0, Number(d.total_amount) - total_paid)
    }
  })

  return {
    type: 'ALL_TRANSACTIONS',
    deals: dealsWithSummary,
    totalDeals: dealsWithSummary.length,
    totalBusiness: dealsWithSummary.reduce((s, d) => s + Number(d.total_amount), 0),
    totalPending: dealsWithSummary.reduce((s, d) => s + d.pending_amount, 0)
  }
}

// 11. Pending amounts I need to PAY (purchase deals)
const getPendingToPay = async (userId) => {
  const { data: deals, error } = await supabase
    .from('deals')
    .select('*, parties(name, type), payments(amount)')
    .eq('user_id', userId)
    .eq('type', 'purchase')

  if (error) throw error

  const partySummaryMap = {}
  ;(deals || []).forEach(d => {
    const total_paid = (d.payments || []).reduce((sum, p) => sum + Number(p.amount), 0)
    const pending = Math.max(0, Number(d.total_amount) - total_paid)
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
    .select('*, parties(name, type), payments(amount)')
    .eq('user_id', userId)
    .eq('type', 'sale')

  if (error) throw error

  const dealsWithPending = (deals || []).map(d => {
    const total_paid = (d.payments || []).reduce((sum, p) => sum + Number(p.amount), 0)
    return {
      ...d,
      pending_amount: Math.max(0, Number(d.total_amount) - total_paid)
    }
  }).filter(d => d.pending_amount > 0)
    .sort((a, b) => b.pending_amount - a.pending_amount)

  return {
    type: 'PENDING_TO_RECEIVE',
    deals: dealsWithPending,
    totalPending: dealsWithPending.reduce((s, d) => s + d.pending_amount, 0)
  }
}
