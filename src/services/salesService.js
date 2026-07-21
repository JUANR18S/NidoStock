import { supabase } from '../lib/supabaseClient'

/**
 * Obtiene el listado de clientes ordenados alfabéticamente.
 */
export const getCustomers = async () => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('full_name', { ascending: true })

  if (error) {
    console.error('Error en getCustomers:', error.message)
    throw error
  }
  return data || []
}

/**
 * Registra un nuevo cliente en la base de datos.
 * @param {Object} customer - Objeto con full_name, document_number, phone, email, active
 */
export const createCustomer = async (customer) => {
  const { data, error } = await supabase
    .from('customers')
    .insert([customer])
    .select()
    .single()

  if (error) {
    console.error('Error en createCustomer:', error.message)
    throw error
  }
  return data
}

/**
 * Obtiene el listado histórico de todas las ventas del negocio.
 */
export const getSales = async () => {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      id,
      sale_number,
      subtotal,
      total,
      payment_method,
      status,
      cancellation_reason,
      cancelled_at,
      created_at,
      customers (
        full_name,
        document_number
      ),
      profiles:user_id (
        email,
        full_name
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error en getSales:', error.message)
    throw error
  }
  return data || []
}

/**
 * Obtiene el desglose de productos y lotes vendidos para una venta específica.
 * @param {string} saleId - ID de la venta
 */
export const getSaleDetails = async (saleId) => {
  const { data, error } = await supabase
    .from('sale_items')
    .select(`
      id,
      quantity,
      unit_price,
      subtotal,
      products (
        name,
        sku
      ),
      product_batches (
        batch_code
      )
    `)
    .eq('sale_id', saleId)

  if (error) {
    console.error('Error en getSaleDetails:', error.message)
    throw error
  }
  return data || []
}

/**
 * Registra una venta a través de la función RPC segura.
 * @param {string|null} customerId - ID del cliente
 * @param {string} paymentMethod - Método de pago ('efectivo', 'tarjeta', etc.)
 * @param {Array} items - Carrito de compras [{"product_id": "...", "quantity": 1}]
 */
export const registerSale = async (customerId, paymentMethod, items) => {
  const { data, error } = await supabase
    .rpc('register_sale', {
      p_customer_id: customerId || null,
      p_payment_method: paymentMethod,
      p_items: items
    })

  if (error) {
    console.error('Error en registerSale:', error.message)
    throw error
  }
  return data
}

/**
 * Anula una venta registrada a través de la función RPC segura.
 * @param {string} saleId - ID de la venta
 * @param {string} reason - Motivo detallado
 */
export const cancelSale = async (saleId, reason) => {
  const { data, error } = await supabase
    .rpc('cancel_sale', {
      p_sale_id: saleId,
      p_reason: reason
    })

  if (error) {
    console.error('Error en cancelSale:', error.message)
    throw error
  }
  return data
}
