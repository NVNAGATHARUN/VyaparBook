
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eevquavwamubibejlktw.supabase.co';
const supabaseKey = 'sb_publishable_ustN8SYsf0ynE8OassXUsQ_W4m4Z-mn';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  // Simulate Reports.jsx query without is_deleted
  const { data, error } = await supabase
    .from('deals')
    .select('id, party_id, type, total_amount, commodity, deal_date, parties(name, phone), payments(amount)');
  
  if (error) {
    console.error('Query Error:', error);
    return;
  }

  console.log('Successfully fetched', data.length, 'deals');
  if (data.length > 0) {
    console.log('First deal sample:', JSON.stringify(data[0], null, 2));
  }
}

testQuery();
