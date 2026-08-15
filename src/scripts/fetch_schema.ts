import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf-8');
for (const line of envFile.split('\n')) {
  if (line.includes('=')) {
    const [key, ...vals] = line.split('=');
    process.env[key.trim()] = vals.join('=').trim().replace(/^"|"$/g, '');
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const tables = ['products', 'product_variants', 'inventory', 'inventory_history', 'inventory_transactions'];
  for (const table of tables) {
    console.log(`\n--- Structure of ${table} ---`);
    const { data: cols, error } = await supabase.from('products').select('id').limit(1); // just a dummy to test connection
    
    // Using postgres raw query via rpc is not possible if it doesn't exist.
    // I can get the schema from the generated types or just run psql.
    // Let's use the PostgREST introspection endpoint!
  }
}
async function queryPg() {
  const res = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/', {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY! }
  });
  const spec = await res.json();
  fs.writeFileSync('spec.json', JSON.stringify(spec, null, 2));
  console.log('Wrote spec.json');
}

queryPg().catch(console.error);
