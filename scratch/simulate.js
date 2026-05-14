import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) acc[key.trim()] = rest.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_KEY);

async function simulate() {
  // 1. Get a user
  const { data: users } = await supabase.from('users').select('*').limit(1);
  if (!users || !users.length) {
     console.log("No users found");
     return;
  }
  const user = users[0];
  console.log("Testing with user:", user.phone);

  // 2. Create a pending session
  const sessionData = {
    intent: 'TRANSACTION',
    party_name: 'Test Party',
    commodity: 'Test Commodity',
    quantity: 10,
    rate: 100,
    total_amount: 1000,
    type: 'purchase'
  };

  const { data: session } = await supabase.from('whatsapp_sessions').insert([{
    phone: user.phone,
    user_id: user.id,
    session_data: sessionData,
    status: 'pending'
  }]).select().single();

  console.log("Created session:", session.id);

  // 3. Simulate CONFIRM_YES logic
  let partyId = session.session_data.party_id;
  const s = session.session_data;

  if (!partyId && s.party_name) {
    console.log("Looking up party...");
    const { data: p, error: pErr } = await supabase.from('parties').select('id').eq('user_id', user.id).ilike('name', s.party_name).maybeSingle();
    console.log("Lookup result:", p, pErr);
    if (p) partyId = p.id;
    else {
      console.log("Creating party...");
      const { data: newP, error: newPErr } = await supabase.from('parties').insert([{ name: s.party_name, user_id: user.id }]).select().single();
      console.log("Create result:", newP, newPErr);
      partyId = newP?.id;
    }
  }

  console.log("Resolved Party ID:", partyId);

  const total = s.total_amount || (Number(s.quantity || 0) * Number(s.rate || 0));

  console.log("Calling create_deal_atomic...");
  const { data: atomicRes, error: atomicErr } = await supabase.rpc('create_deal_atomic', {
    p_party_id: partyId,
    p_type: s.type || 'purchase',
    p_commodity: s.commodity,
    p_quantity: Number(s.quantity) || 0,
    p_unit: s.unit || 'bags',
    p_rate: Number(s.rate) || 0,
    p_total_amount: total,
    p_advance_paid: 0,
    p_deal_date: new Date().toISOString().split('T')[0],
    p_source: 'whatsapp',
    p_user_id: user.id 
  });

  console.log("Atomic Result:", atomicRes, atomicErr);
}

simulate().catch(console.error);
