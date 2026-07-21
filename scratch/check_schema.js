import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://urycsildyatpjbxgrusa.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyeWNzaWxkeWF0cGpieGdydXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MzQ2NTMsImV4cCI6MjA5NjExMDY1M30.w6KoS0o8OYPQfbHHvT5oHckbcvUw7DxpV241En1FzBA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'riosmesajuancamilo@gmail.com',
    password: '180695Ca.'
  })

  if (authError) {
    console.error('Auth Error:', authError.message)
    return
  }

  // Query to get all check constraints on stock_movements
  const { data, error } = await supabase.rpc('get_my_role')
  
  // We can query pg_constraint to find constraint names for public.stock_movements
  // Let's call supabase.from('profiles').select() or run a query using another table if we can
  // Wait, let's see if we can get constraint names by causing a violation in a transaction? No, we don't want to fail.
  // Actually, we can check pg_constraint table via PostgREST if it is exposed. Is pg_catalog exposed? No.
  // But wait, can we write an RPC or query? Let's try to query pg_constraint using an RPC. Is there any SQL RPC?
  // Let's check if there is an RPC we can use. We saw 'get_my_role' exists.
  console.log('Role:', data)
}

check()
