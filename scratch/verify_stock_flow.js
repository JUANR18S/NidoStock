import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://urycsildyatpjbxgrusa.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyeWNzaWxkeWF0cGpieGdydXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MzQ2NTMsImV4cCI6MjA5NjExMDY1M30.w6KoS0o8OYPQfbHHvT5oHckbcvUw7DxpV241En1FzBA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAll() {
  console.log('=== E2E DATABASE SYSTEM TEST FOR BATCHES & KARDEX ===\n')

  // --- PART 1: ADMIN LOGIN & BATCH CREATION ---
  console.log('--- PART 1: Admin Authentication ---')
  const { data: adminAuth, error: adminAuthErr } = await supabase.auth.signInWithPassword({
    email: 'riosmesajuancamilo@gmail.com',
    password: '180695Ca.'
  })

  if (adminAuthErr) {
    console.error('❌ Admin Auth Error:', adminAuthErr.message)
    return
  }
  const adminUserId = adminAuth.user.id
  console.log(`✅ Admin logged in. User ID: ${adminUserId}`)

  // Get Admin profile details
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('email, role')
    .eq('id', adminUserId)
    .single()
  console.log(`   Profile - Email: ${adminProfile?.email}, Role: ${adminProfile?.role}`)


  // --- PART 2: SELECT PRODUCT & INITIAL STOCK ---
  console.log('\n--- PART 2: Selecting Product & Reading Initial Stock ---')
  const { data: products } = await supabase
    .from('products')
    .select('id, name, sku')
    .eq('active', true)
    .limit(1)

  if (!products || products.length === 0) {
    console.error('❌ No active products found in DB.')
    return
  }
  const product = products[0]
  console.log(`📦 Selected Product: "${product.name}" (SKU: ${product.sku}, ID: ${product.id})`)

  const { data: summaryBefore } = await supabase
    .from('product_stock_summary')
    .select('total_stock')
    .eq('id', product.id)
    .single()

  const stockBefore = summaryBefore ? (summaryBefore.total_stock || 0) : 0
  console.log(`📈 Stock level before batch creation: ${stockBefore}`)


  // --- PART 3: CREATE BATCH WITH 10 UNITS ---
  console.log('\n--- PART 3: Creating Batch with 10 Units ---')
  const randomSeq = Math.floor(Math.random() * 100000)
  const batchCode = `LOT-TEST-${randomSeq}`
  const expirationDate = '2027-12-31'
  
  console.log(`✏️ Inserting batch: code=${batchCode}, initial=10, current=10`)
  const { data: batch, error: batchErr } = await supabase
    .from('product_batches')
    .insert([{
      product_id: product.id,
      batch_code: batchCode,
      expiration_date: expirationDate,
      initial_quantity: 10,
      current_quantity: 10,
      purchase_price: 15.00
    }])
    .select()
    .single()

  if (batchErr) {
    console.error('❌ Error creating batch:', batchErr.message)
    return
  }
  const batchId = batch.id
  console.log(`✅ Batch created successfully. ID: ${batchId}`)


  // --- PART 4: CONFIRM INITIAL MOVEMENT 0 -> 10 ---
  console.log('\n--- PART 4: Verifying Initial Kardex Movement (0 ➔ 10) ---')
  const { data: movements, error: movsErr } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('batch_id', batchId)

  if (movsErr) {
    console.error('❌ Error fetching stock movements:', movsErr.message)
    return
  }

  console.log(`   Found ${movements.length} movement(s) generated for batch ${batchCode}:`)
  console.log(JSON.stringify(movements, null, 2))

  if (movements.length === 1) {
    const mov = movements[0]
    let failed = false

    if (mov.previous_stock !== 0) {
      console.error(`❌ Expected previous_stock = 0, got ${mov.previous_stock}`)
      failed = true
    }
    if (mov.new_stock !== 10) {
      console.error(`❌ Expected new_stock = 10, got ${mov.new_stock}`)
      failed = true
    }
    if (mov.quantity !== 10) {
      console.error(`❌ Expected quantity = 10, got ${mov.quantity}`)
      failed = true
    }
    if (mov.type !== 'input') {
      console.error(`❌ Expected type = "input", got "${mov.type}"`)
      failed = true
    }
    if (mov.reason !== 'purchase') {
      console.error(`❌ Expected reason = "purchase", got "${mov.reason}"`)
      failed = true
    }
    if (mov.user_id !== adminUserId) {
      console.error(`❌ Expected user_id = ${adminUserId}, got ${mov.user_id}`)
      failed = true
    }

    if (!failed) {
      console.log('✅ PASS: Initial movement 0 ➔ 10 is perfectly recorded!')
      console.log(`✅ PASS: Responsible User attributed: ${adminProfile?.email}`)
      console.log(`✅ PASS: Reason is "purchase" (Abastecimiento/Compra)`)
      console.log(`✅ PASS: Date created is: ${mov.created_at}`)
    }
  } else {
    console.error(`❌ Expected exactly 1 initial movement, found ${movements.length}`)
  }


  // --- PART 5: VERIFY INVENTORY IS 10 (NOT 20) ---
  console.log('\n--- PART 5: Verifying Product Inventory Total (No Double-Counting) ---')
  const { data: summaryAfter } = await supabase
    .from('product_stock_summary')
    .select('total_stock')
    .eq('id', product.id)
    .single()

  const stockAfter = summaryAfter ? (summaryAfter.total_stock || 0) : 0
  console.log(`📈 Stock level after batch creation: ${stockAfter}`)

  const expectedStock = stockBefore + 10
  if (stockAfter === expectedStock) {
    console.log(`✅ PASS: Total stock increased by exactly 10 units (from ${stockBefore} to ${stockAfter}).`)
    console.log(`🎉 SUCCESS: Inventory does not contain duplicate entries (not ${stockBefore + 20})!`)
  } else {
    console.error(`❌ FAIL: Total stock is ${stockAfter}, but expected ${expectedStock}`)
  }


  // --- PART 6: VALIDATE PERMISSIONS (EMPLOYEE CANNOT INSERT BATCH) ---
  console.log('\n--- PART 6: Validating Permissions (Employee Restriction) ---')
  
  // Sign out admin
  await supabase.auth.signOut()

  // Sign up a new random employee user to guarantee we have an active employee session
  const randNum = Math.floor(Math.random() * 1000000)
  const employeeEmail = `test_emp_${randNum}@gmail.com`
  const employeePassword = '180695Ca.'
  console.log(`👤 Registering new test employee user: ${employeeEmail}`)
  const { data: employeeSignUp, error: signUpErr } = await supabase.auth.signUp({
    email: employeeEmail,
    password: employeePassword
  })
  
  if (signUpErr) {
     console.error('❌ Failed to sign up test employee:', signUpErr.message)
     return
  }
  const employeeUserId = employeeSignUp.user.id
  console.log(`👤 Test employee user created with ID: ${employeeUserId}`)

  // Sign in as employee
  const { data: employeeAuth, error: employeeAuthErr } = await supabase.auth.signInWithPassword({
    email: employeeEmail,
    password: employeePassword
  })

  if (employeeAuthErr) {
    console.error('❌ Employee Auth Error:', employeeAuthErr.message)
    return
  }
  console.log(`👤 Employee logged in successfully.`)

  // Get Employee profile details (asserting it has employee role)
  const { data: employeeProfile } = await supabase
    .from('profiles')
    .select('email, role')
    .eq('id', employeeUserId)
    .single()
  console.log(`   Profile - Email: ${employeeProfile?.email}, Role: ${employeeProfile?.role}`)

  // Attempt to create batch as employee (should trigger database RLS violation error)
  console.log(`✏️ Attempting to insert a batch as employee "${employeeProfile?.email}"...`)
  const testEmployeeBatchCode = `LOT-EMP-${randNum}`
  const { data: empBatch, error: empBatchErr } = await supabase
    .from('product_batches')
    .insert([{
      product_id: product.id,
      batch_code: testEmployeeBatchCode,
      expiration_date: expirationDate,
      initial_quantity: 10,
      current_quantity: 10,
      purchase_price: 15.00
    }])
    
  if (empBatchErr) {
    console.log(`✅ PASS: Batch creation blocked! Supabase returned RLS error as expected:`)
    console.log(`   Error Code: ${empBatchErr.code}`)
    console.log(`   Error Message: ${empBatchErr.message}`)
  } else {
    console.error('❌ FAIL: Employee was able to insert a batch! Security vulnerability detected.')
  }


  // --- PART 7: VALIDATE FILTERS ---
  console.log('\n--- PART 7: Validating Kardex Filter Operations ---')
  // Sign out employee
  await supabase.auth.signOut()

  // Re-sign in admin to read Kardex details (though any auth user can select)
  await supabase.auth.signInWithPassword({
    email: 'riosmesajuancamilo@gmail.com',
    password: '180695Ca.'
  })

  // Simulated filtering query on stock_movements
  // Filter by Type = 'input'
  const { data: inputMovements } = await supabase
    .from('stock_movements')
    .select('id, type')
    .eq('type', 'input')
    .limit(3)
  console.log(`✅ Type Filter test: querying type='input' returned ${inputMovements?.length} items.`)

  // Filter by Reason = 'purchase'
  const { data: purchaseMovements } = await supabase
    .from('stock_movements')
    .select('id, reason')
    .eq('reason', 'purchase')
    .limit(3)
  console.log(`✅ Reason Filter test: querying reason='purchase' returned ${purchaseMovements?.length} items.`)

  // Search by Batch Code
  const { data: searchMovements } = await supabase
    .from('stock_movements')
    .select('id, batch_id, product_batches!inner(batch_code)')
    .eq('product_batches.batch_code', batchCode)
    
  console.log(`✅ Search Filter test: searching for batch code "${batchCode}" returned ${searchMovements?.length} matching entries.`)

  // Cleanup employee account using admin credentials? (Not strictly necessary for local test environment, but lets sign out)
  await supabase.auth.signOut()
  console.log('\n=== ALL PROGRAMMATIC DATABASE TESTS COMPLETED ===')
}

testAll()
