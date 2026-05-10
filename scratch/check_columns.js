
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eevquavwamubibejlktw.supabase.co';
const supabaseKey = 'sb_publishable_ustN8SYsf0ynE8OassXUsQ_W4m4Z-mn';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDeals() {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .limit(1);
  
  if (error) console.error(error);
  else console.log('Deal columns:', Object.keys(data[0]));
}

checkDeals();
