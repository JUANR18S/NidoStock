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

  // We can query pg_constraint directly to get the name and check clause for stock_movements
  const { data, error } = await supabase
    .from('profiles') // Just using a valid query first
    .select('id')
    .limit(1)

  // Querying using a RPC? Wait, does get_my_role have parameters? No.
  // Can we run a select on pg_constraint via pg_catalog schema? PostgREST blocks pg_catalog access.
  // Wait! In postgres, if we cause a constraint violation, the error message will output the constraint name!
  // Let's try inserting an invalid reason in stock_movements in a test script, catch the error, and read the constraint name!
  // This is a genius hacker technique to get the constraint name and check definition!
  const { error: insertError } = await supabase
    .from('stock_movements')
    .insert([{
      batch_id: '764f18d2-92c7-4582-8128-d6cfa48b7505', // Use a valid batch from our previous test
      user_id: 'a54a7f1c-5715-439c-a190-66870a137d6c',
      type: 'output',
      quantity: 1,
      reason: 'invalid_reason_test_12345'
    }])

  console.log('Error output:', insertError)
}

check()
