import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) acc[key.trim()] = rest.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_KEY);

async function test() {
  const { data, error } = await supabase.rpc('create_deal_atomic', {
    p_party_id: '00000000-0000-0000-0000-000000000000',
    p_type: 'purchase',
    p_commodity: 'test',
    p_quantity: 1,
    p_unit: 'bags',
    p_rate: 1,
    p_total_amount: 1,
    p_advance_paid: 0,
    p_deal_date: new Date().toISOString().split('T')[0],
    p_source: 'whatsapp',
    p_user_id: '00000000-0000-0000-0000-000000000000'
  });
  console.log({ data, error });
}

test();
