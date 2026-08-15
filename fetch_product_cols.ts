import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8')
let url = '', key = ''
for (const line of env.split('\n')) {
  if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim()
  if (line.trim().startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim()
}

const supabase = createClient(url, key)

async function run() {
  const { data, error } = await supabase.from('products').select('*').limit(1).single()
  console.log('Product row:', data, error)
}

run()
