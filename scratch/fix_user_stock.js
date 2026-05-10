
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eevquavwamubibejlktw.supabase.co';
const supabaseKey = 'sb_publishable_ustN8SYsf0ynE8OassXUsQ_W4m4Z-mn';

const supabase = createClient(supabaseUrl, supabaseKey);

async function recalculateStock(userId) {
  console.log('🔄 Recalculating stock (Clean Fix) for user:', userId);

  const { data: deals } = await supabase.from('deals').select('*').eq('user_id', userId);
  
  const stockMap = {};
  deals.forEach(d => {
    const comm = (d.commodity || 'unknown').toLowerCase();
    if (!stockMap[comm]) stockMap[comm] = { purchased: 0, sold: 0, unit: d.unit };
    if (d.type === 'purchase') stockMap[comm].purchased += Number(d.quantity);
    else stockMap[comm].sold += Number(d.quantity);
  });

  // Delete existing stock for this user to be safe
  await supabase.from('stock').delete().eq('user_id', userId);

  // Insert fresh data
  for (const [comm, stats] of Object.entries(stockMap)) {
    const current = Math.max(0, stats.purchased - stats.sold);
    console.log(`Saving ${comm}: ${current}`);
    await supabase.from('stock').insert({
      user_id: userId,
      commodity: comm,
      total_purchased: stats.purchased,
      total_sold: stats.sold,
      current_stock: current,
      unit: stats.unit
    });
  }

  console.log('✅ Fix applied!');
}

recalculateStock('d311a9bc-4f15-4b6d-af15-f8a45329e8fb');
