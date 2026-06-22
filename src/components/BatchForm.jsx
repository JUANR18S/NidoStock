import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createBatch, getProducts } from '../services/productService'
import { X, Calendar, Layers, Clipboard, AlertTriangle } from 'lucide-react'

export const BatchForm = ({ onClose, onSuccess, preselectedProductId }) => {
  const { role } = useAuth()
  const [products, setProducts] = useState([])
  const [formData, setFormData] = useState({
    product_id: preselectedProductId || '',
    batch_code: '',
    expiration_date: '',
    initial_quantity: '',
    current_quantity: '',
    purchase_price: ''
  })
  const [loadingProds, setLoadingProds] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Cargar productos al montar
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProds(true)
        const prods = await getProducts()
        setProducts(prods)
        if (prods.length > 0 && !preselectedProductId) {
          setFormData(prev => ({ ...prev, product_id: prods[0].id }))
        }
      } catch (err) {
        console.error('Error al cargar productos:', err)
        setError('No se pudieron cargar los productos del catálogo.')
      } finally {
        setLoadingProds(false)
      }
    }
    loadProducts()
  }, [preselectedProductId])

  // Validar rol de administrador
  if (role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-xl text-center">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">Acceso Restringido</h3>
          <p className="text-sm text-slate-500 mt-2">
            Solo los administradores tienen permisos para registrar nuevos lotes.
          </p>
          <button
            onClick={onClose}
            className="mt-6 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Si cambia el initial_quantity y el current_quantity está vacío o coincide con el anterior, actualizarlo automáticamente
    if (name === 'initial_quantity') {
      setFormData(prev => {
        const updatedCurrent = (prev.current_quantity === '' || prev.current_quantity === prev.initial_quantity) 
          ? value 
          : prev.current_quantity
        return {
          ...prev,
          initial_quantity: value,
          current_quantity: updatedCurrent
        }
      })
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validaciones básicas
    if (!formData.product_id) {
      setError('Debes seleccionar un producto.')
      return
    }
    if (!formData.batch_code.trim()) {
      setError('El código de lote es obligatorio.')
      return
    }
    if (!formData.expiration_date) {
      setError('La fecha de vencimiento es obligatoria.')
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expirationTime = new Date(formData.expiration_date + 'T00:00:00').getTime()
    if (expirationTime < today.getTime()) {
      setError('La fecha de vencimiento no puede ser anterior a hoy.')
      return
    }

    const initQty = parseInt(formData.initial_quantity, 10)
    const currQty = parseInt(formData.current_quantity, 10)
    const price = parseFloat(formData.purchase_price)

    if (isNaN(initQty) || initQty < 0) {
      setError('La cantidad inicial debe ser un número entero mayor o igual a 0.')
      return
    }
    if (isNaN(currQty) || currQty < 0) {
      setError('La cantidad actual debe ser un número entero mayor o igual a 0.')
      return
    }
    if (currQty > initQty) {
      setError('La cantidad actual no puede ser mayor que la cantidad inicial.')
      return
    }
    if (isNaN(price) || price < 0) {
      setError('El precio de compra debe ser un número mayor o igual a 0.')
      return
    }

    try {
      setSubmitting(true)
      await createBatch({
        product_id: formData.product_id,
        batch_code: formData.batch_code,
        expiration_date: formData.expiration_date,
        initial_quantity: initQty,
        current_quantity: currQty,
        purchase_price: price
      })
      onSuccess()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Error al registrar el lote. Inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg relative animate-fade-in my-8">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gold-50 text-gold-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 leading-tight">Registrar Lote de Stock</h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Control de Caducidad y Abastecimiento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl font-medium">
              {error}
            </div>
          )}

          {/* Selección de Producto */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Producto *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Layers className="w-4 h-4" />
              </span>
              <select
                name="product_id"
                required
                value={formData.product_id}
                onChange={handleChange}
                disabled={loadingProds || !!preselectedProductId}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-xs font-medium appearance-none"
              >
                {loadingProds ? (
                  <option value="">Cargando productos...</option>
                ) : products.length === 0 ? (
                  <option value="">No hay productos creados en el sistema</option>
                ) : (
                  products.map(prod => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} ({prod.sku})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Código de Lote */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Código del Lote *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <Clipboard className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  name="batch_code"
                  required
                  value={formData.batch_code}
                  onChange={handleChange}
                  placeholder="Ej. LOT-2026-X1"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-xs font-medium"
                />
              </div>
            </div>

            {/* Fecha de Vencimiento */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Fecha de Vencimiento *
              </label>
              <input
                type="date"
                name="expiration_date"
                required
                value={formData.expiration_date}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-xs font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cantidad Inicial */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Cant. Inicial *
              </label>
              <input
                type="number"
                name="initial_quantity"
                required
                min="0"
                value={formData.initial_quantity}
                onChange={handleChange}
                placeholder="Ej. 100"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-xs font-medium"
              />
            </div>

            {/* Cantidad Actual */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Cant. Actual *
              </label>
              <input
                type="number"
                name="current_quantity"
                required
                min="0"
                value={formData.current_quantity}
                onChange={handleChange}
                placeholder="Ej. 100"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-xs font-medium"
              />
            </div>

            {/* Precio de Adquisición */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Costo Unit. ($) *
              </label>
              <input
                type="number"
                name="purchase_price"
                required
                min="0"
                step="0.01"
                value={formData.purchase_price}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-xs font-medium"
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold rounded-2xl text-xs active:scale-[0.98] transition-all border border-slate-200/60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white font-semibold rounded-2xl text-xs shadow-md shadow-gold-500/10 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {submitting ? 'Registrando...' : 'Registrar Lote'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
