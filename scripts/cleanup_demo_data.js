import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching dummy records for backup...');
  
  const backup = { products: [], categories: [], collections: [] };

  // Fetch demo categories
  const { data: catData } = await supabase.from('categories').select('*').in('id', [
    'aa79d7b3-81f8-41d6-8f42-b344d769e709',
    '5275f3dd-388f-47ee-ad8e-4f7dc2d92191',
    '598f98a3-328c-4c4d-a058-cf77484ce49c'
  ]);
  backup.categories = catData || [];

  // Fetch demo collections
  const { data: colData } = await supabase.from('collections').select('*').in('id', [
    'dbd2d87a-28e9-486f-a4a0-ead183748dc7',
    '16887c80-c9ac-440c-b033-5315b32b5372'
  ]);
  backup.collections = colData || [];

  // Fetch demo products
  const { data: prodData } = await supabase.from('products').select('*').in('id', [
    '98795639-e130-4fbe-9b3a-2864d5d1b3c3',
    '8c760fac-83c3-4847-b290-804cd03a396b',
    '13d3292d-0970-4872-a5d2-683d082d592e'
  ]);
  backup.products = prodData || [];

  fs.writeFileSync('demo_data_backup.json', JSON.stringify(backup, null, 2));
  console.log('Backup saved to demo_data_backup.json');

  console.log('Beginning deletion...');
  
  // 1. Delete Products (cascades or we can manually delete them)
  const { error: pErr } = await supabase.from('products').delete().in('id', backup.products.map(p => p.id));
  if (pErr) console.error('Error deleting products:', pErr);
  else console.log(`Deleted ${backup.products.length} dummy products.`);

  // 2. Delete Categories
  const { error: cErr } = await supabase.from('categories').delete().in('id', backup.categories.map(c => c.id));
  if (cErr) console.error('Error deleting categories:', cErr);
  else console.log(`Deleted ${backup.categories.length} dummy categories.`);

  // 3. Delete Collections
  const { error: colErr } = await supabase.from('collections').delete().in('id', backup.collections.map(c => c.id));
  if (colErr) console.error('Error deleting collections:', colErr);
  else console.log(`Deleted ${backup.collections.length} dummy collections.`);

  console.log('Cleanup complete.');
}

run();
