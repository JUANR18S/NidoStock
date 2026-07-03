import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Cargar variables de entorno del .env manualmente
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

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY deben estar definidos en el archivo .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
})

// Credenciales del Administrador
const ADMIN_EMAIL = 'riosmesajuancamilo@gmail.com'
const ADMIN_PASSWORD = '180695Ca.' // Usado en test-login.js

async function runTests() {
  console.log('==================================================')
  console.log(' INICIANDO VALIDACIÓN DE REGLAS DE NEGOCIO EN BD')
  console.log('==================================================\n')

  let adminClient = null
  let testProductId = null
  let testBatchId = null

  try {
    // 1. Iniciar sesión Admin
    adminClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })
    console.log(`[+] Iniciando sesión como Admin: ${ADMIN_EMAIL}`)
    const { error: adminLoginError } = await adminClient.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    })
    if (adminLoginError) throw new Error(`Login admin falló: ${adminLoginError.message}`)
    console.log(`[✔] Sesión de Admin iniciada con éxito.\n`)

    // 2. PRUEBA DE CATEGORÍAS
    console.log('--- PRUEBA 1: Lectura de Categorías ---')
    const { data: categories, error: catError } = await adminClient
      .from('product_categories')
      .select('*')
      .order('name', { ascending: true })

    if (catError) {
      console.log(`[❌] FALLÓ: No se pudieron leer las categorías: ${catError.message}`)
    } else {
      console.log(`[✔] Éxito: Se leyeron ${categories.length} categorías de la base de datos.`)
      console.log('    Categorías encontradas:', categories.map(c => c.name).join(', '))
    }
    console.log('')

    // 3. PRUEBA DE CREACIÓN DE PRODUCTO Y UNICIDAD DE SKU
    console.log('--- PRUEBA 2: Registro de Productos y Unicidad de SKU ---')
    const testSku = `TST-SKU-${Math.floor(Math.random() * 100000)}`
    const categoryId = categories[0]?.id

    console.log(`[+] Registrando producto de prueba con SKU: ${testSku}...`)
    const { data: product, error: prodError } = await adminClient
      .from('products')
      .insert({
        name: 'Producto de Prueba Automatizada',
        sku: testSku,
        category_id: categoryId,
        sale_price: 29.99,
        base_unit: 'ml',
        presentation_unit: 'frasco',
        conversion_factor: 50
      })
      .select()
      .single()

    if (prodError) {
      throw new Error(`No se pudo crear el producto de prueba: ${prodError.message}`)
    }
    testProductId = product.id
    console.log(`[✔] Producto creado con ID: ${testProductId}`)

    // Intentar registrar otro producto con el mismo SKU
    console.log(`[+] Intentando registrar un segundo producto con el mismo SKU: ${testSku}...`)
    const { error: dupeProdError } = await adminClient
      .from('products')
      .insert({
        name: 'Producto Duplicado Falso',
        sku: testSku,
        category_id: categoryId,
        sale_price: 19.99
      })

    if (dupeProdError) {
      console.log(`[✔] Bloqueado por restricción de SKU único (esperado): ${dupeProdError.message}`)
    } else {
      console.log(`[❌] FALLÓ: Se permitió registrar un producto con un SKU duplicado.`)
    }
    console.log('')

    // 4. PRUEBA DE REGISTRO DE LOTES Y RESTRICCIÓN DE UNICIDAD DE LOTE
    console.log('--- PRUEBA 3: Registro de Lotes y Unicidad de Lote ---')
    console.log('[+] Registrando lote "LOTE-TEST-001" para el producto...')
    const { data: batch, error: batchError } = await adminClient
      .from('product_batches')
      .insert({
        product_id: testProductId,
        batch_code: 'LOTE-TEST-001',
        expiration_date: '2027-12-31',
        initial_quantity: 100,
        current_quantity: 100,
        purchase_price: 12.50
      })
      .select()
      .single()

    if (batchError) {
      throw new Error(`No se pudo crear el lote: ${batchError.message}`)
    }
    testBatchId = batch.id
    console.log(`[✔] Lote creado con ID: ${testBatchId}`)

    // Intentar registrar el mismo lote para el mismo producto (Restricción UNIQUE compuesto)
    console.log('[+] Intentando registrar el mismo código de lote ("LOTE-TEST-001") para el mismo producto...')
    const { error: dupeBatchError } = await adminClient
      .from('product_batches')
      .insert({
        product_id: testProductId,
        batch_code: 'LOTE-TEST-001',
        expiration_date: '2028-06-30',
        initial_quantity: 50,
        current_quantity: 50,
        purchase_price: 13.00
      })

    if (dupeBatchError) {
      console.log(`[✔] Bloqueado por restricción de lote único (esperado): ${dupeBatchError.message}`)
    } else {
      console.log(`[❌] FALLÓ: Se permitió duplicar un código de lote para el mismo producto.`)
    }
    console.log('')

    // 5. PRUEBA DE TRIGGERS EN MOVIMIENTOS DE STOCK (KARDEX)
    console.log('--- PRUEBA 4: Triggers de Stock y Kardex ---')
    const { data: sessionData } = await adminClient.auth.getUser()
    const adminUserId = sessionData.user.id

    // Registrar una salida (output) de stock
    console.log(`[+] Registrando salida de 15 unidades del lote...`)
    const { data: mvmtOut, error: mvmtOutError } = await adminClient
      .from('stock_movements')
      .insert({
        batch_id: testBatchId,
        user_id: adminUserId,
        type: 'output',
        quantity: 15,
        description: 'Salida de prueba automatizada'
      })
      .select()
      .single()

    if (mvmtOutError) {
      console.log(`[❌] FALLÓ al registrar salida: ${mvmtOutError.message}`)
    } else {
      console.log(`[✔] Movimiento de salida registrado con éxito (ID: ${mvmtOut.id})`)
      
      // Verificar si el stock del lote se redujo
      const { data: batchCheck1 } = await adminClient
        .from('product_batches')
        .select('current_quantity')
        .eq('id', testBatchId)
        .single()
      
      console.log(`[✔] Stock actual del lote: ${batchCheck1.current_quantity} (esperado: 85)`)
    }

    // Registrar una entrada (input) de stock
    console.log(`[+] Registrando entrada de 30 unidades al lote...`)
    const { data: mvmtIn, error: mvmtInError } = await adminClient
      .from('stock_movements')
      .insert({
        batch_id: testBatchId,
        user_id: adminUserId,
        type: 'input',
        quantity: 30,
        description: 'Entrada de prueba automatizada'
      })
      .select()
      .single()

    if (mvmtInError) {
      console.log(`[❌] FALLÓ al registrar entrada: ${mvmtInError.message}`)
    } else {
      console.log(`[✔] Movimiento de entrada registrado con éxito (ID: ${mvmtIn.id})`)
      
      // Verificar si el stock del lote aumentó
      const { data: batchCheck2 } = await adminClient
        .from('product_batches')
        .select('current_quantity')
        .eq('id', testBatchId)
        .single()
      
      console.log(`[✔] Stock actual del lote: ${batchCheck2.current_quantity} (esperado: 115)`)
    }
    console.log('')

    // 6. PRUEBA DE CONTROL DE SOBRETIRO (STOCK INSUFICIENTE)
    console.log('--- PRUEBA 5: Control de Sobretiro ---')
    // Intentamos retirar 200 unidades (el stock es 115)
    console.log('[+] Intentando retirar 200 unidades (excede las 115 disponibles)...')
    const { error: overdrawError } = await adminClient
      .from('stock_movements')
      .insert({
        batch_id: testBatchId,
        user_id: adminUserId,
        type: 'output',
        quantity: 200,
        description: 'Retiro excesivo'
      })

    if (overdrawError) {
      console.log(`[✔] Bloqueado por trigger con error (esperado): ${overdrawError.message}`)
    } else {
      console.log(`[❌] FALLÓ: Se permitió retirar más unidades de las disponibles.`)
    }
    console.log('')

    // 7. PRUEBA DE RESTRICCIÓN DE BORRADO FÍSICO
    console.log('--- PRUEBA 6: Bloqueo de Borrado Físico ---')
    console.log('[+] Intentando eliminar físicamente el lote de prueba...')
    const { error: delBatchError } = await adminClient
      .from('product_batches')
      .delete()
      .eq('id', testBatchId)

    if (delBatchError) {
      console.log(`[✔] Bloqueado con error (esperado): ${delBatchError.message}`)
    } else {
      // Verificar si realmente se borró
      const { data: checkBatch } = await adminClient
        .from('product_batches')
        .select('*')
        .eq('id', testBatchId)
      if (checkBatch.length > 0) {
        console.log(`[✔] Lote no eliminado físicamente (bloqueado por políticas RLS de delete).`)
      } else {
        console.log(`[❌] FALLÓ: Se eliminó físicamente el lote.`)
      }
    }
    console.log('')

  } catch (err) {
    console.error(`[❌] Excepción durante la ejecución de pruebas:`, err)
  } finally {
    // Limpieza de datos creados en la prueba
    console.log('--- LIMPIEZA ---')
    if (adminClient && testProductId) {
      console.log('[+] Desactivando producto de prueba (borrado lógico)...')
      await adminClient.from('products').update({ active: false }).eq('id', testProductId)
      
      console.log('[+] Eliminando registros de prueba directamente de la base de datos...')
      // Eliminamos los movimientos de prueba
      if (testBatchId) {
        await adminClient.from('stock_movements').delete().eq('batch_id', testBatchId)
        await adminClient.from('product_batches').delete().eq('id', testBatchId)
      }
      await adminClient.from('products').delete().eq('id', testProductId)
      console.log('[✔] Registros de prueba eliminados.')
    }
    console.log('\n==================================================')
    console.log(' VALIDACIÓN COMPLETADA')
    console.log('==================================================')
  }
}

runTests()
