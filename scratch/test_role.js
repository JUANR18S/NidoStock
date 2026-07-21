import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://urycsildyatpjbxgrusa.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyeWNzaWxkeWF0cGpieGdydXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MzQ2NTMsImV4cCI6MjA5NjExMDY1M30.w6KoS0o8OYPQfbHHvT5oHckbcvUw7DxpV241En1FzBA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'riosmesajuancamilo@gmail.com',
    password: '180695Ca.'
  })

  if (authError) {
    console.error('Auth Error:', authError.message)
    return
  }

  // Get all triggers in public schema
  const { data: triggers, error: trigError } = await supabase.rpc('get_my_role')
  console.log('Role:', triggers)
  
  // We can query pg_trigger via raw sql using a RPC or just querying if we have access
  const { data, error } = await supabase.from('profiles').select('id, email, role').limit(5)
  console.log('Profiles:', data, error)
}

test()
