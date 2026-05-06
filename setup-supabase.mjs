/**
 * VyaparBook — Supabase Setup Script
 * Run this once to apply all RLS policies and views.
 * 
 * Usage: node setup-supabase.mjs
 */

const SUPABASE_URL = 'https://eevquavwamubibejlktw.supabase.co';

// NOTE: You need the SERVICE ROLE key (not the publishable key) to run this.
// Find it at: https://supabase.com/dashboard/project/eevquavwamubibejlktw/settings/api
// Look for "service_role" under "Project API keys"
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';

if (SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  console.log('❌ Please set SUPABASE_SERVICE_KEY environment variable');
  console.log('   Run: $env:SUPABASE_SERVICE_KEY="your-service-role-key"; node setup-supabase.mjs');
  console.log('   Or paste the service role key directly in this file.');
  process.exit(1);
}

const sql = `
-- Disable RLS on all tables (simpler for phone-auth app)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE parties DISABLE ROW LEVEL SECURITY;
ALTER TABLE deals DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock DISABLE ROW LEVEL SECURITY;
ALTER TABLE voice_logs DISABLE ROW LEVEL SECURITY;

-- Create party_summary view
CREATE OR REPLACE VIEW party_summary AS
SELECT
  p.user_id,
  p.id AS party_id,
  p.name AS party_name,
  d.type AS deal_type,
  SUM(d.total_amount) AS total_business,
  COALESCE(SUM(pay.paid), 0) AS total_paid,
  SUM(d.total_amount) - COALESCE(SUM(pay.paid), 0) AS total_pending
FROM parties p
JOIN deals d ON d.party_id = p.id
LEFT JOIN (
  SELECT deal_id, SUM(amount) AS paid
  FROM payments
  GROUP BY deal_id
) pay ON pay.deal_id = d.id
GROUP BY p.user_id, p.id, p.name, d.type;

-- Create deal_summary view
CREATE OR REPLACE VIEW deal_summary AS
SELECT
  d.user_id,
  d.id,
  d.party_id,
  d.type,
  d.commodity,
  d.total_amount,
  COALESCE(SUM(p.amount), 0) AS total_paid,
  d.total_amount - COALESCE(SUM(p.amount), 0) AS pending_amount
FROM deals d
LEFT JOIN payments p ON p.deal_id = d.id
GROUP BY d.user_id, d.id, d.party_id, d.type, d.commodity, d.total_amount;
`;

const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

// Try pg-meta approach
const pgMetaResponse = await fetch(`${SUPABASE_URL}/pg-meta/v1/query`, {
  method: 'POST',
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

if (pgMetaResponse.ok) {
  const result = await pgMetaResponse.json();
  console.log('✅ SQL applied successfully!', result);
} else {
  const err = await pgMetaResponse.text();
  console.log('Result:', pgMetaResponse.status, err);
  console.log('\n📋 Please run the SQL manually in Supabase SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/eevquavwamubibejlktw/sql/new');
  console.log('\nSQL to run:\n', sql);
}
