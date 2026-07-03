import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createProduct, getCategories } from '../services/productService'
import { X, Tag, Package, DollarSign, FileText, AlertTriangle } from 'lucide-react'

export const ProductForm = ({ onClose, onSuccess }) => {
  const { role } = useAuth()
  const [categories, setCategories] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    sku: '',
    sale_price: '',
    active: true,
    base_unit: 'unidad',
    presentation_unit: 'unidad',
    conversion_factor: 1
  })
  const [loadingCats, setLoadingCats] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Cargar categorías disponibles al montar
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCats(true)
        const cats = await getCategories()
        setCategories(cats)
        if (cats.length > 0) {
          setFormData(prev => ({ ...prev, category_id: cats[0].id }))
        }
      } catch (err) {
        console.error('Error al cargar categorías:', err)
        setError('No se pudieron cargar las categorías de productos.')
      } finally {
        setLoadingCats(false)
      }
    }
    loadCategories()
  }, [])

  // Validar rol de administrador
  if (role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-xl text-center">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">Acceso Restringido</h3>
          <p className="text-sm text-slate-500 mt-2">
            Solo los administradores tienen permisos para agregar nuevos productos.
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
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validaciones básicas
    if (!formData.name.trim()) {
      setError('El nombre del producto es obligatorio.')
      return
    }
    if (!formData.sku.trim()) {
      setError('El SKU es obligatorio.')
      return
    }
    if (!formData.category_id) {
      setError('Debes seleccionar una categoría.')
      return
    }
    
    const price = parseFloat(formData.sale_price)
    if (isNaN(price) || price < 0) {
      setError('El precio de venta debe ser un número mayor o igual a 0.')
      return
    }

    const factor = parseInt(formData.conversion_factor)
    if (isNaN(factor) || factor < 1) {
      setError('El factor de conversión debe ser un número entero mayor o igual a 1.')
      return
    }

    try {
      setSubmitting(true)
      await createProduct({
        ...formData,
        sale_price: price,
        conversion_factor: factor
      })
      onSuccess()
    } catch (err) {
      console.error(err)
      if (err.code === '23505') {
        setError('El SKU ingresado ya está registrado con otro producto.')
      } else {
        setError(err.message || 'Error al guardar el producto. Inténtalo de nuevo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg relative animate-fade-in my-8">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 leading-tight">Nuevo Producto</h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Catálogo de Inventario
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

          {/* Nombre del Producto */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Nombre del Producto *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Package className="w-4 h-4" />
              </span>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej. Crema Hidratante Aloe Vera"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-xs font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SKU */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                SKU / Código Único *
              </label>
              <input
                type="text"
                name="sku"
                required
                value={formData.sku}
                onChange={handleChange}
                placeholder="Ej. FAC-CRE-005"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-xs font-medium"
              />
            </div>

            {/* Precio de Venta */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Precio de Venta ($) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <DollarSign className="w-4 h-4" />
                </span>
                <input
                  type="number"
                  name="sale_price"
                  required
                  min="0"
                  step="0.01"
                  value={formData.sale_price}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Categoría *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Tag className="w-4 h-4" />
              </span>
              <select
                name="category_id"
                required
                value={formData.category_id}
                onChange={handleChange}
                disabled={loadingCats}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-xs font-medium appearance-none"
              >
                {loadingCats ? (
                  <option value="">Cargando categorías...</option>
                ) : (
                  categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Unidades de Medida */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Unidad Base *
              </label>
              <input
                type="text"
                name="base_unit"
                required
                value={formData.base_unit}
                onChange={handleChange}
                placeholder="ej. unidad"
                className="w-full px-3 py-2 bg-white border border-slate-200 text-slate-800 rounded-xl outline-none focus:border-brand-500 transition-all text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Presentación Comercial *
              </label>
              <input
                type="text"
                name="presentation_unit"
                required
                value={formData.presentation_unit}
                onChange={handleChange}
                placeholder="ej. caja"
                className="w-full px-3 py-2 bg-white border border-slate-200 text-slate-800 rounded-xl outline-none focus:border-brand-500 transition-all text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Factor Conversión *
              </label>
              <input
                type="number"
                name="conversion_factor"
                required
                min="1"
                value={formData.conversion_factor}
                onChange={handleChange}
                placeholder="ej. 50"
                className="w-full px-3 py-2 bg-white border border-slate-200 text-slate-800 rounded-xl outline-none focus:border-brand-500 transition-all text-xs font-medium"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Descripción Corta
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-400">
                <FileText className="w-4 h-4" />
              </span>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Detalle del producto, tamaño, volumen..."
                rows="3"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-xs font-medium"
              ></textarea>
            </div>
          </div>

          {/* Estado Activo */}
          <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <input
              type="checkbox"
              id="active"
              name="active"
              checked={formData.active}
              onChange={handleChange}
              className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500 accent-brand-600"
            />
            <label htmlFor="active" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
              Habilitar producto inmediatamente en el catálogo
            </label>
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
              className="flex-1 py-3 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-semibold rounded-2xl text-xs shadow-md shadow-brand-600/10 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
