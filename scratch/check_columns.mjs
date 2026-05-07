
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eevquavwamubibejlktw.supabase.co';
const supabaseKey = 'sb_publishable_ustN8SYsf0ynE8OassXUsQ_W4m4Z-mn';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error fetching deal:', error);
    return;
  }

  if (data.length > 0) {
    console.log('Columns in deals table:', Object.keys(data[0]));
  } else {
    console.log('No deals found to check columns.');
    // Try to get one deal without any filters just in case
    const { data: allDeals } = await supabase.from('deals').select('*').limit(1);
    if (allDeals && allDeals.length > 0) {
       console.log('Columns in deals table (unfiltered):', Object.keys(allDeals[0]));
    }
  }
}

checkColumns();
