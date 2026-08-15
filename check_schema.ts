import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8')
let url = '', key = ''
for (const line of env.split('\n')) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim()
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim()
}

const supabase = createClient(url, key)

async function run() {
  const { data, error } = await supabase.from('product_images').insert({
    product_id: '00000000-0000-0000-0000-000000000000',
    image_url: 'test',
    storage_path: 'test',
    display_order: 1,
    is_primary: false,
    alt_text: 'test'
  })
  console.log('Error:', error)
}
run()
