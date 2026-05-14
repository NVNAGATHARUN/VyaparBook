import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Users ───────────────────────────────────────────────────────────────────

export const getUserByPhone = async (phone) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .single();
  return { data, error };
};

export const createUser = async ({ phone, name, business_name }) => {
  const { data, error } = await supabase
    .from('users')
    .insert([{ phone, name, business_name }])
    .select()
    .single();
  return { data, error };
};

// ─── Parties ─────────────────────────────────────────────────────────────────

export const getParties = async (userId) => {
  const { data, error } = await supabase
    .from('parties')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });
  return { data, error };
};

export const getPartyById = async (partyId) => {
  const { data, error } = await supabase
    .from('parties')
    .select('*')
    .eq('id', partyId)
    .single();
  return { data, error };
};

export const createParty = async (party) => {
  const { data, error } = await supabase
    .from('parties')
    .insert([party])
    .select()
    .single();
  return { data, error };
};

export const updateParty = async (partyId, updates) => {
  const { data, error } = await supabase
    .from('parties')
    .update(updates)
    .eq('id', partyId)
    .select()
    .single();
  return { data, error };
};

export const findOrCreateParty = async (userId, name, type = 'other') => {
  // Try to find by name (case insensitive)
  const { data: existing } = await supabase
    .from('parties')
    .select('*')
    .eq('user_id', userId)
    .ilike('name', name.trim())
    .maybeSingle();

  if (existing) return { data: existing, error: null };

  // Create new party
  return createParty({ user_id: userId, name: name.trim(), type });
};

// ─── Deals ───────────────────────────────────────────────────────────────────

export const getDeals = async (userId, limit = 50) => {
  const { data, error } = await supabase
    .from('deals')
    .select('*, parties(name, type)')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('deal_date', { ascending: false })
    .limit(limit);
  return { data, error };
};

export const getDealsByParty = async (partyId) => {
  const { data, error } = await supabase
    .from('deals')
    .select('*, payments(*)')
    .eq('party_id', partyId)
    .eq('is_deleted', false)
    .order('deal_date', { ascending: false });
  return { data, error };
};

export const createDeal = async (deal) => {
  const { data, error } = await supabase
    .from('deals')
    .insert([deal])
    .select()
    .single();
  return { data, error };
};

export const updateDeal = async (dealId, updates) => {
  const { data, error } = await supabase
    .from('deals')
    .update(updates)
    .eq('id', dealId)
    .select()
    .single();
  return { data, error };
};

export const softDeleteDeal = async (dealId, userId) => {
  const { error } = await supabase
    .from('deals')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', dealId)
    .eq('user_id', userId);
  return { error };
};

export const createDealAtomic = async (params) => {
  const { data, error } = await supabase.rpc('create_deal_atomic', {
    p_party_id: params.party_id,
    p_type: params.type,
    p_commodity: params.commodity,
    p_quantity: params.quantity,
    p_unit: params.unit,
    p_rate: params.rate,
    p_total_amount: params.total_amount,
    p_advance_paid: params.advance_paid,
    p_deal_date: params.deal_date,
    p_source: params.source || 'pwa',
    p_payment_mode: params.payment_mode || 'cash',
    p_notes: params.notes || null,
    p_user_id: params.user_id,
  });
  return { data, error };
};

export const getDealSummary = async (userId) => {
  const { data, error } = await supabase
    .from('deal_summary')
    .select('*')
    .eq('user_id', userId);
  return { data, error };
};

// ─── Payments ────────────────────────────────────────────────────────────────

export const getPayments = async (userId, limit = 50) => {
  const { data, error } = await supabase
    .from('payments')
    .select('*, deals(commodity, type, parties(name))')
    .eq('user_id', userId)
    .order('payment_date', { ascending: false })
    .limit(limit);
  return { data, error };
};

export const getPaymentsByDeal = async (dealId) => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('deal_id', dealId)
    .order('payment_date', { ascending: false });
  return { data, error };
};

export const createPayment = async (payment) => {
  const { data, error } = await supabase
    .from('payments')
    .insert([payment])
    .select()
    .single();
  return { data, error };
};

export const uploadPaymentProof = async (file) => {
  if (!file) return { url: null, error: null };
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${fileName}`;
 
  const { error } = await supabase.storage
    .from('payment_proofs')
    .upload(filePath, file);

  if (error) return { url: null, error };

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from('payment_proofs')
    .getPublicUrl(filePath);

  return { url: publicUrlData.publicUrl, error: null };
};

// ─── Stock ───────────────────────────────────────────────────────────────────

export const getStock = async (userId) => {
  const { data, error } = await supabase
    .from('stock')
    .select('*')
    .eq('user_id', userId)
    .order('commodity', { ascending: true });
  return { data, error };
};

export const upsertStock = async (userId, commodity, unit, quantityDelta, type) => {
  // Check if stock row exists
  const { data: existing } = await supabase
    .from('stock')
    .select('*')
    .eq('user_id', userId)
    .eq('commodity', commodity.toLowerCase())
    .maybeSingle();

  if (existing) {
    const updates = {
      total_purchased: existing.total_purchased + (type === 'purchase' ? quantityDelta : 0),
      total_sold: existing.total_sold + (type === 'sale' ? quantityDelta : 0),
      current_stock:
        existing.current_stock +
        (type === 'purchase' ? quantityDelta : -quantityDelta),
    };
    const { data, error } = await supabase
      .from('stock')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single();
    return { data, error };
  } else {
    const newRow = {
      user_id: userId,
      commodity: commodity.toLowerCase(),
      unit,
      total_purchased: type === 'purchase' ? quantityDelta : 0,
      total_sold: type === 'sale' ? quantityDelta : 0,
      current_stock: type === 'purchase' ? quantityDelta : -quantityDelta,
    };
    const { data, error } = await supabase
      .from('stock')
      .insert([newRow])
      .select()
      .single();
    return { data, error };
  }
};

// ─── Voice Logs ──────────────────────────────────────────────────────────────

export const saveVoiceLog = async (log) => {
  const { data, error } = await supabase
    .from('voice_logs')
    .insert([log])
    .select()
    .single();
  return { data, error };
};

export const getVoiceLogs = async (userId, limit = 20) => {
  const { data, error } = await supabase
    .from('voice_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data, error };
};

// ─── Dashboard Summary ────────────────────────────────────────────────────────

export const getDashboardSummary = async (userId) => {
  // Fetch deals, payments and expenses in parallel
  const [
    { data: deals, error: dealErr },
    { data: expenses, error: expErr }
  ] = await Promise.all([
    supabase.from('deals').select('total_amount, type, deal_date, payments(amount)').eq('user_id', userId).eq('is_deleted', false),
    supabase.from('expenses').select('amount').eq('user_id', userId)
  ]);

  if (dealErr || expErr) {
    console.error('Error fetching dashboard summary:', dealErr || expErr);
    return { toPay: 0, toReceive: 0, todayTotal: 0, netProfit: 0, totalSales: 0 };
  }

  let toPay = 0;
  let toReceive = 0;
  let todayTotal = 0;
  let totalSales = 0;
  let totalPurchase = 0;
  const today = new Date().toISOString().split('T')[0];

  if (deals) {
    deals.forEach((deal) => {
      const paid = (deal.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const total = Number(deal.total_amount || 0);
      const pending = Math.max(0, total - paid);

      if (deal.type === 'purchase') {
        toPay += pending;
        totalPurchase += total;
      }
      if (deal.type === 'sale') {
        toReceive += pending;
        totalSales += total;
      }
      
      if (deal.deal_date === today) {
        todayTotal += total;
      }
    });
  }

  const totalExp = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);
  const netProfit = totalSales - totalPurchase - totalExp;

  return { toPay, toReceive, todayTotal, netProfit, totalSales, totalExp };
};

// ─── Detailed Reports ────────────────────────────────────────────────────────
export const getDetailedReports = async (userId) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const startDate = sixMonthsAgo.toISOString().split('T')[0];

  const [
    { data: deals, error: dealErr },
    { data: expenses, error: expErr }
  ] = await Promise.all([
    supabase.from('deals').select('total_amount, type, deal_date, commodity').eq('user_id', userId).eq('is_deleted', false).gte('deal_date', startDate),
    supabase.from('expenses').select('amount, expense_date, category').eq('user_id', userId).gte('expense_date', startDate)
  ]);

  if (dealErr || expErr) throw dealErr || expErr;

  const monthlyData = {};
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Initialize last 6 months
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
    monthlyData[key] = { name: key, sales: 0, purchase: 0, expenses: 0, profit: 0 };
  }

  deals?.forEach(d => {
    const date = new Date(d.deal_date);
    const key = `${months[date.getMonth()]} ${date.getFullYear()}`;
    if (monthlyData[key]) {
      if (d.type === 'sale') monthlyData[key].sales += Number(d.total_amount);
      else monthlyData[key].purchase += Number(d.total_amount);
    }
  });

  expenses?.forEach(e => {
    const date = new Date(e.expense_date);
    const key = `${months[date.getMonth()]} ${date.getFullYear()}`;
    if (monthlyData[key]) {
      monthlyData[key].expenses += Number(e.amount);
    }
  });

  const chartData = Object.values(monthlyData).reverse().map(m => ({
    ...m,
    profit: m.sales - m.purchase - m.expenses
  }));

  return chartData;
};

// ─── Party Summary (pending per party) ────────────────────────────────────────

export const getPartySummary = async (userId) => {
  // Fetch all deals with payments to calculate per-party pending amounts
  const { data: deals, error } = await supabase
    .from('deals')
    .select('party_id, total_amount, type, payments(amount)')
    .eq('user_id', userId)
    .eq('is_deleted', false);

  if (error) return { data: [], error };

  const summaryMap = {};
  deals.forEach((deal) => {
    const paid = (deal.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const pending = Math.max(0, Number(deal.total_amount || 0) - paid);

    if (!summaryMap[deal.party_id]) {
      summaryMap[deal.party_id] = { party_id: deal.party_id, pending_to_pay: 0, pending_to_receive: 0 };
    }

    if (deal.type === 'purchase') {
      summaryMap[deal.party_id].pending_to_pay += pending;
    } else if (deal.type === 'sale') {
      summaryMap[deal.party_id].pending_to_receive += pending;
    }
  });

  return { data: Object.values(summaryMap), error: null };
};

// ─── Recent Transactions ──────────────────────────────────────────────────────

export const getRecentTransactions = async (userId, limit = 10) => {
  const { data: deals, error } = await supabase
    .from('deals')
    .select('*, parties(name)')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data: deals, error };
};

// ─── WhatsApp Integration ────────────────────────────────────────────────────

export const getWhatsAppUser = async (phone) => {
  const { data, error } = await supabase
    .from('whatsapp_users')
    .select('*, users(*)')
    .eq('phone', phone)
    .eq('is_active', true)
    .maybeSingle();
  return { data, error };
};

export const registerWhatsAppUser = async (phone, userId) => {
  const { data, error } = await supabase
    .from('whatsapp_users')
    .upsert([{ phone, user_id: userId, is_active: true }], { onConflict: 'phone' })
    .select()
    .single();
  return { data, error };
};

export const createWhatsAppSession = async (session) => {
  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .insert([session])
    .select()
    .single();
  return { data, error };
};

export const getLatestPendingSession = async (phone) => {
  // First expire old sessions
  await supabase.rpc('expire_whatsapp_sessions');

  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('phone', phone)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data, error };
};

export const updateSessionStatus = async (id, status, extraData = {}) => {
  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .update({ status, ...extraData })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
};
