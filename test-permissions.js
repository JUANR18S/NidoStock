import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/)
  if (match) {
    const key = match[1].trim()
    let val = match[2].trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1)
    }
    env[key] = val
  }
})

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
})

async function check() {
  // Login
  await supabase.auth.signInWithPassword({
    email: 'riosmesajuancamilo@gmail.com',
    password: '180695Ca.'
  })

  const tables = ['profiles', 'product_categories', 'products', 'product_batches', 'stock_movements', 'product_stock_summary']
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1)
    if (error) {
      console.log(`Table ${table}: ERROR -> ${error.message}`)
    } else {
      console.log(`Table ${table}: OK -> fetched ${data.length} rows`)
    }
  }
}

check()
