// Supabase Edge Function: whatsapp-daily
// Returns a morning summary for all active WhatsApp users
// Called by n8n Cron at 8:00 AM daily
//
// GET /whatsapp-daily
// Returns: { summaries: [{ phone, message }] }
// n8n then sends each message to the respective phone

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const fmt = (n) => {
  const num = Number(n) || 0;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000)   return `₹${(num / 100000).toFixed(2)} L`;
  if (num >= 1000)     return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toLocaleString('en-IN')}`;
};

const buildSummaryMessage = (oweList, receiveList, stockItems) =>
  `🌅 *Good Morning!*

📊 *VyaparBook Summary*

🔴 *Meeru pay cheyali:*
${oweList.length > 0 ? oweList.map(p => `• ${p.name}: *${fmt(p.pending)}*`).join('\n') : '• Emi ledu ✅'}

🟢 *Meeku pay cheyali:*
${receiveList.length > 0 ? receiveList.map(p => `• ${p.name}: *${fmt(p.pending)}*`).join('\n') : '• Emi ledu ✅'}

📦 *Stock:*
${stockItems.length > 0 ? stockItems.map(s => `• ${s.commodity}: *${s.current_stock} ${s.unit}*`).join('\n') : '• Stock ledu'}

🔗 vyaparbook.com`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    // Get all active WhatsApp users
    const { data: waUsers } = await supabase
      .from('whatsapp_users')
      .select('*, users(*)')
      .eq('is_active', true);

    if (!waUsers || waUsers.length === 0) {
      return new Response(JSON.stringify({ summaries: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const summaries = [];

    for (const waUser of waUsers) {
      const userId = waUser.user_id;

      // Get all deals with their payments
      const { data: deals } = await supabase
        .from('deals')
        .select('*, parties(*), payments(*)')
        .eq('user_id', userId);

      // Get stock
      const { data: stock } = await supabase
        .from('stock')
        .select('*')
        .eq('user_id', userId)
        .gt('current_stock', 0);

      // Group pending by party
      const partyMap = {};
      for (const deal of (deals || [])) {
        const partyName = deal.parties?.name || 'Unknown';
        const totalPaid = (deal.payments || []).reduce((s, p) => s + Number(p.amount), 0);
        const pending = Math.max(0, deal.total_amount - totalPaid);

        if (pending > 0) {
          if (!partyMap[partyName]) partyMap[partyName] = { name: partyName, owe: 0, receive: 0 };
          if (deal.type === 'purchase') partyMap[partyName].owe += pending;
          if (deal.type === 'sale') partyMap[partyName].receive += pending;
        }
      }

      const oweList = Object.values(partyMap)
        .filter(p => p.owe > 0)
        .map(p => ({ name: p.name, pending: p.owe }));

      const receiveList = Object.values(partyMap)
        .filter(p => p.receive > 0)
        .map(p => ({ name: p.name, pending: p.receive }));

      const message = buildSummaryMessage(oweList, receiveList, stock || []);

      summaries.push({ phone: waUser.phone, message });
    }

    return new Response(JSON.stringify({ summaries }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('whatsapp-daily error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
