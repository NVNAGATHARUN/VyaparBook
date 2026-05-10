
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eevquavwamubibejlktw.supabase.co';
const supabaseKey = 'sb_publishable_ustN8SYsf0ynE8OassXUsQ_W4m4Z-mn';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStock() {
  const { data: deals, error: dealErr } = await supabase
    .from('deals')
    .select('id, type, commodity, quantity, unit, deal_date')
    .ilike('commodity', 'rice');
  
  if (dealErr) console.error('Deal Error:', dealErr);
  else console.log('Rice Deals:', deals);

  const { data: stock, error: stockErr } = await supabase
    .from('stock')
    .select('*')
    .ilike('commodity', 'rice');

  if (stockErr) console.error('Stock Error:', stockErr);
  else console.log('Rice Stock:', stock);
}

checkStock();
