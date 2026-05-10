
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const waToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Fetch all users
    const { data: users } = await supabase.from('users').select('*');
    if (!users) return new Response('No users', { status: 200 });

    for (const user of users) {
      if (!user.phone) continue;

      // 2. Fetch Today's Transactions
      const [
        { data: deals },
        { data: payments },
        { data: expenses }
      ] = await Promise.all([
        supabase.from('deals').select('*, parties(name)').eq('user_id', user.id).eq('deal_date', today),
        supabase.from('payments').select('*, parties(name)').eq('user_id', user.id).eq('payment_date', today),
        supabase.from('expenses').select('*').eq('user_id', user.id).eq('expense_date', today)
      ]);

      // 3. Calculate Global Balances (Baaki)
      // We can use a query or RPC for this. For now, let's fetch all deals for simplicity (though not efficient for many records)
      // A better way is to query the global pending status
      const { data: allPendingDeals } = await supabase.from('deals').select('total_amount, type, payments(amount)').eq('user_id', user.id);
      
      let toReceiveTotal = 0;
      let toPayTotal = 0;

      (allPendingDeals || []).forEach(d => {
        const paid = (d.payments || []).reduce((s, p) => s + Number(p.amount), 0);
        const pending = Math.max(0, Number(d.total_amount) - paid);
        if (pending > 0) {
          if (d.type === 'sale') toReceiveTotal += pending;
          else toPayTotal += pending;
        }
      });

      // 4. Construct Message
      let report = `📋 *Daily Vyapar Summary* (${today})\n\n`;
      
      if ((deals?.length || 0) + (payments?.length || 0) > 0) {
        report += `*Today's Activity:*\n`;
        deals?.forEach(d => {
          report += `• ${d.type === 'sale' ? '💰' : '🛒'} ${d.parties?.name}: ${d.quantity} ${d.commodity} (₹${d.total_amount})\n`;
        });
        payments?.forEach(p => {
          report += `• 💸 ${p.parties?.name || 'Cash'}: ₹${p.amount} (${p.type})\n`;
        });
      } else {
        report += `_No transactions today._\n`;
      }

      report += `\n*Global Balances:* 📊\n`;
      report += `💰 *To Receive (Collect):* ₹${toReceiveTotal.toLocaleString('en-IN')}\n`;
      report += `💸 *To Pay (Payable):* ₹${toPayTotal.toLocaleString('en-IN')}\n\n`;
      report += `Great job today! 👍`;

      // 5. Send to WhatsApp
      await fetch(`https://graph.facebook.com/v20.0/${Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${waToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: user.phone,
          type: "text",
          text: { body: report }
        })
      });
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
