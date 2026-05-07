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
    .order('deal_date', { ascending: false })
    .limit(limit);
  return { data, error };
};

export const getDealsByParty = async (partyId) => {
  const { data, error } = await supabase
    .from('deals')
    .select('*, payments(*)')
    .eq('party_id', partyId)
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
  // Fetch deals with payments to calculate pending amounts reliably
  const { data: deals, error } = await supabase
    .from('deals')
    .select('total_amount, type, deal_date, payments(amount)')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching dashboard summary:', error);
    return { toPay: 0, toReceive: 0, todayTotal: 0 };
  }

  let toPay = 0;
  let toReceive = 0;
  let todayTotal = 0;
  const today = new Date().toISOString().split('T')[0];

  if (deals) {
    deals.forEach((deal) => {
      const paid = (deal.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const total = Number(deal.total_amount || 0);
      const pending = Math.max(0, total - paid);

      if (deal.type === 'purchase') toPay += pending;
      if (deal.type === 'sale') toReceive += pending;
      
      if (deal.deal_date === today) {
        todayTotal += total;
      }
    });
  }

  return { toPay, toReceive, todayTotal };
};

// ─── Party Summary (pending per party) ────────────────────────────────────────

export const getPartySummary = async (userId) => {
  // Fetch all deals with payments to calculate per-party pending amounts
  const { data: deals, error } = await supabase
    .from('deals')
    .select('party_id, total_amount, type, payments(amount)')
    .eq('user_id', userId);

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
