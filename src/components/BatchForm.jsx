import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createBatch, getProducts } from '../services/productService'
import { X, Calendar, Layers, Clipboard, AlertTriangle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'

/**
 * Genera un código de lote automático con formato LOT-YYYYMMDD-XXX
 * donde XXX es un número aleatorio de 3 dígitos para evitar duplicados.
 */
const generateBatchCode = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const seq = String(Math.floor(Math.random() * 900) + 100) // 100-999
  return `LOT-${year}${month}${day}-${seq}`
}

export const BatchForm = ({ onClose, onSuccess, preselectedProductId }) => {
  const { role } = useAuth()
  const [products, setProducts] = useState([])
  const [formData, setFormData] = useState({
    product_id: preselectedProductId || '',
    batch_code: generateBatchCode(),
    expiration_date: '',
    initial_quantity: '',
    current_quantity: '',
    purchase_price: ''
  })
  const [loadingProds, setLoadingProds] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showHelp, setShowHelp] = useState(false)

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
        setError('No se pudieron cargar los productos. Intenta nuevamente.')
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
          <h3 className="text-lg font-bold text-slate-800">Acción no disponible</h3>
          <p className="text-sm text-slate-500 mt-2">
            Solo los administradores pueden registrar nuevos lotes de mercancía.
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

  const selectedProduct = products.find(p => p.id === formData.product_id)

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

    // Validaciones amigables
    if (!formData.product_id) {
      setError('Selecciona el producto al que pertenece este lote.')
      return
    }
    if (!formData.batch_code.trim()) {
      setError('Ingresa un código para identificar este lote.')
      return
    }
    if (!formData.expiration_date) {
      setError('Indica la fecha de vencimiento del lote.')
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expirationTime = new Date(formData.expiration_date + 'T00:00:00').getTime()
    if (expirationTime < today.getTime()) {
      setError('La fecha de vencimiento debe ser una fecha futura.')
      return
    }

    const initQty = parseInt(formData.initial_quantity, 10)
    const currQty = parseInt(formData.current_quantity, 10)
    const price = parseFloat(formData.purchase_price)

    if (isNaN(initQty) || initQty < 0) {
      setError('Indica cuántas unidades recibiste (debe ser un número válido).')
      return
    }
    if (isNaN(currQty) || currQty < 0) {
      setError('Indica cuántas unidades están disponibles actualmente (debe ser un número válido).')
      return
    }
    if (currQty > initQty) {
      setError('Las unidades disponibles no pueden superar las unidades recibidas.')
      return
    }
    if (isNaN(price) || price < 0) {
      setError('Ingresa un costo de compra válido (debe ser un número válido).')
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
      // Manejar errores comunes de forma amigable
      const msg = err.message || ''
      if (err.code === '23505' || msg.toLowerCase().includes('duplicate')) {
        setError('Ya existe un lote con ese código. Usa un código diferente.')
      } else {
        setError('No fue posible registrar el lote. Verifica la información e intenta nuevamente.')
      }
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
              <h3 className="font-bold text-slate-800 leading-tight">Registrar nuevo lote</h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Ingresa la mercancía que recibiste
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

        {/* Bloque educativo colapsable */}
        <div className="px-6 pt-4">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center space-x-2 text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>¿Qué es un lote y para qué sirve?</span>
            {showHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showHelp && (
            <div className="mt-3 bg-brand-50 border border-brand-100 rounded-2xl p-4 text-[11px] text-slate-600 leading-relaxed space-y-2 animate-fade-in">
              <p><strong className="text-slate-700">¿Qué es un lote?</strong> Un lote representa un grupo de productos comprados o recibidos al mismo tiempo.</p>
              <p><strong className="text-slate-700">¿Por qué es útil?</strong> Permite controlar fechas de vencimiento, compras y el inventario de forma precisa.</p>
              <p><strong className="text-slate-700">¿Cómo funciona?</strong> Cuando realizas una venta, el sistema selecciona automáticamente el lote más antiguo disponible para evitar pérdidas por vencimiento.</p>
            </div>
          )}
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
                  <option value="">Primero necesitas crear un producto</option>
                ) : (
                  products.map(prod => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} ({prod.sku})
                    </option>
                  ))
                )}
              </select>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 ml-1">Selecciona el producto al que pertenece este lote.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Código de Lote */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Código del lote *
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
                  placeholder="LOT-20260714-001"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-xs font-medium"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 ml-1">Se genera automáticamente. Puedes modificarlo si lo deseas.</p>
            </div>

            {/* Fecha de Vencimiento */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Fecha de vencimiento *
              </label>
              <input
                type="date"
                name="expiration_date"
                required
                value={formData.expiration_date}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-xs font-medium"
              />
              <p className="text-[10px] text-slate-400 mt-1.5 ml-1">Te avisaremos cuando el producto esté próximo a vencer.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cantidad Inicial */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Unidades recibidas *
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
              <p className="text-[10px] text-slate-400 mt-1.5 ml-1">Cantidad que ingresan al inventario.</p>
            </div>

            {/* Cantidad Actual */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Disponibles *
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
              <p className="text-[10px] text-slate-400 mt-1.5 ml-1">Normalmente igual a las recibidas.</p>
            </div>

            {/* Precio de Adquisición */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Costo por unidad ($) *
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
              <p className="text-[10px] text-slate-400 mt-1.5 ml-1">Precio de compra. Sirve para calcular tu ganancia.</p>
            </div>
          </div>

          {/* Equivalencia de Unidades en Lotes */}
          {selectedProduct && selectedProduct.conversion_factor > 1 && (
            <div className="bg-amber-50 border border-amber-100 p-3 rounded-2xl text-[11px] text-amber-800 font-medium leading-relaxed animate-fade-in">
              <span className="font-bold block text-xs mb-1">Equivalencia de inventario</span>
              <p>
                Este producto se maneja por presentación:{' '}
                <strong>1 {selectedProduct.presentation_unit} = {selectedProduct.conversion_factor} {selectedProduct.base_unit}s</strong>.
              </p>
              <p className="mt-1">
                La cantidad ingresada equivale a:{' '}
                <strong>
                  {Math.floor((parseInt(formData.initial_quantity, 10) || 0) / selectedProduct.conversion_factor)}{' '}
                  {selectedProduct.presentation_unit}s
                </strong>
                {' '}y{' '}
                <strong>
                  {(parseInt(formData.initial_quantity, 10) || 0) % selectedProduct.conversion_factor}{' '}
                  {selectedProduct.base_unit}s sueltas
                </strong>.
              </p>
            </div>
          )}

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
              {submitting ? 'Guardando...' : 'Registrar lote'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
