
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eevquavwamubibejlktw.supabase.co';
const supabaseKey = 'sb_publishable_ustN8SYsf0ynE8OassXUsQ_W4m4Z-mn';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDeals() {
  const { data, error } = await supabase
    .from('deals')
    .select('id, deal_date, is_deleted');
  
  if (error) {
    console.error('Error fetching deals:', error);
    return;
  }

  console.log('Total deals:', data.length);
  if (data.length > 0) {
    console.log('Sample deals:', data.slice(0, 5));
    const nullDeleted = data.filter(d => d.is_deleted === null);
    console.log('Deals with is_deleted as NULL:', nullDeleted.length);
    const trueDeleted = data.filter(d => d.is_deleted === true);
    console.log('Deals with is_deleted as true:', trueDeleted.length);
    const falseDeleted = data.filter(d => d.is_deleted === false);
    console.log('Deals with is_deleted as false:', falseDeleted.length);
  }
}

checkDeals();
