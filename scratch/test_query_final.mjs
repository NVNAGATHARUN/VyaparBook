
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eevquavwamubibejlktw.supabase.co';
const supabaseKey = 'sb_publishable_ustN8SYsf0ynE8OassXUsQ_W4m4Z-mn';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFinalQuery() {
  const now = new Date();
  const fromDateObj = new Date(now.getFullYear(), now.getMonth(), 1);
  const y = fromDateObj.getFullYear();
  const m = String(fromDateObj.getMonth() + 1).padStart(2, '0');
  const d = String(fromDateObj.getDate()).padStart(2, '0');
  const fromDate = `${y}-${m}-${d}`;
  
  console.log('Testing query with fromDate:', fromDate);

  // Simulate Reports.jsx query after fix
  const { data, error } = await supabase
    .from('deals')
    .select('id, party_id, type, total_amount, commodity, deal_date, parties(name, phone), payments(amount)')
    .gte('deal_date', fromDate);
  
  if (error) {
    console.error('Query Error:', error);
    return;
  }

  console.log('Successfully fetched', data.length, 'deals for this month');
  if (data.length > 0) {
    console.log('Total business this month:', data.reduce((s, d) => s + Number(d.total_amount), 0));
  }
}

testFinalQuery();
