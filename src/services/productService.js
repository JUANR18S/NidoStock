import { supabase } from '../lib/supabaseClient'

/**
 * Obtiene el resumen de stock de todos los productos (activos e inactivos)
 * desde la vista product_stock_summary.
 */
export const getProducts = async () => {
  const { data, error } = await supabase
    .from('product_stock_summary')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error en getProducts:', error.message)
    throw error
  }
  return data || []
}

/**
 * Crea un nuevo producto.
 * @param {Object} product - Objeto con name, description, sku, category_id, sale_price, active
 */
export const createProduct = async (product) => {
  const { data, error } = await supabase
    .from('products')
    .insert([product])
    .select()
    .single()

  if (error) {
    console.error('Error en createProduct:', error.message)
    throw error
  }
  return data
}

/**
 * Actualiza las propiedades de un producto existente.
 * @param {string} id - UUID del producto
 * @param {Object} updates - Campos a actualizar
 */
export const updateProduct = async (id, updates) => {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error en updateProduct:', error.message)
    throw error
  }
  return data
}

/**
 * Desactiva un producto (borrado lógico).
 * @param {string} id - UUID del producto
 */
export const deactivateProduct = async (id) => {
  return updateProduct(id, { active: false })
}

/**
 * Obtiene el listado de categorías disponibles ordenadas alfabéticamente.
 */
export const getCategories = async () => {
  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error en getCategories:', error.message)
    throw error
  }
  return data || []
}

/**
 * Desactiva un lote (borrado lógico).
 * @param {string} id - UUID del lote
 */
export const deactivateBatch = async (id) => {
  const { data, error } = await supabase
    .from('product_batches')
    .update({ active: false })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error en deactivateBatch:', error.message)
    throw error
  }
  return data
}

/**
 * Registra la entrada de un nuevo lote para un producto.
 * @param {Object} batch - Objeto con product_id, batch_code, expiration_date, initial_quantity, current_quantity, purchase_price
 */
export const createBatch = async (batch) => {
  // Asegurar que el current_quantity inicial sea igual al initial_quantity si no se especifica
  const payload = {
    ...batch,
    current_quantity: batch.current_quantity !== undefined ? batch.current_quantity : batch.initial_quantity
  }

  const { data, error } = await supabase
    .from('product_batches')
    .insert([payload])
    .select()
    .single()

  if (error) {
    console.error('Error en createBatch:', error.message)
    throw error
  }
  return data
}
