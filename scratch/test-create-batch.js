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

  // Get a product first
  const { data: products, error: prodError } = await supabase.from('products').select('id').limit(1)
  if (prodError || !products.length) {
    console.error('No products found or error:', prodError)
    return
  }
  const product_id = products[0].id
  console.log('Using product:', product_id)

  // Insert a test batch
  const randomSeq = Math.floor(Math.random() * 1000)
  const batch_code = `TEST-LOT-${randomSeq}`
  const { data: batchData, error: batchError } = await supabase
    .from('product_batches')
    .insert([{
      product_id,
      batch_code,
      expiration_date: '2026-12-31',
      initial_quantity: 10,
      current_quantity: 8,
      purchase_price: 15.5
    }])
    .select()

  if (batchError) {
    console.error('Batch Error:', batchError)
  } else {
    console.log('Batch created successfully:', batchData)
    
    // Check stock_movements
    const { data: movements, error: movError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('batch_id', batchData[0].id)
    if (movError) {
      console.error('Movements Error:', movError)
    } else {
      console.log('Created movements:', movements)
    }
  }
}

test()
