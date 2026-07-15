import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getProducts, getCategories, deactivateProduct } from '../services/productService'
import { ProductForm } from '../components/ProductForm'
import { BatchForm } from '../components/BatchForm'
import { 
  Package, 
  Plus, 
  Calendar, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Filter,
  Tag,
  LayoutGrid
} from 'lucide-react'

const formatStock = (total, factor, baseUnit, presUnit) => {
  if (total === 0) return `0 ${baseUnit || 'uds'}`;
  if (!factor || factor <= 1) {
    return `${total} ${baseUnit || 'uds'}`;
  }
  const boxes = Math.floor(total / factor);
  const units = total % factor;
  
  if (boxes > 0 && units > 0) {
    return `${boxes} ${presUnit || 'caja'}(s) + ${units} ${baseUnit || 'ud'}(s)`;
  } else if (boxes > 0) {
    return `${boxes} ${presUnit || 'caja'}(s)`;
  } else {
    return `${units} ${baseUnit || 'ud'}(s)`;
  }
}

export const Products = () => {
  const { role } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActive, setFilterActive] = useState('all') // 'all', 'active', 'inactive'
  const [selectedCategory, setSelectedCategory] = useState(null) // null = todas

  // Control de Modales
  const [showProductModal, setShowProductModal] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [selectedProductIdForBatch, setSelectedProductIdForBatch] = useState(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      const [productsData, categoriesData] = await Promise.all([
        getProducts(),
        getCategories()
      ])
      setProducts(productsData)
      setCategories(categoriesData)
    } catch (err) {
      console.error(err)
      setError('No fue posible cargar los productos. Verifica tu conexión e intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const init = async () => {
      await Promise.resolve()
      if (!active) return
      loadData()
    }
    init()
    return () => { active = false }
  }, [])

  // Leer categoría desde URL param al cargar datos
  useEffect(() => {
    if (categories.length > 0) {
      const categoryParam = searchParams.get('categoria')
      if (categoryParam) {
        const matchedCat = categories.find(
          c => c.name.toLowerCase() === categoryParam.toLowerCase()
        )
        if (matchedCat) {
          setSelectedCategory(matchedCat.name)
        } else {
          setSelectedCategory(null)
        }
      } else {
        setSelectedCategory(null)
      }
    }
  }, [categories, searchParams])

  // Contar productos por categoría
  const getCategoryCount = (categoryName) => {
    if (!categoryName) return products.length
    return products.filter(p => p.category_name === categoryName).length
  }

  // Manejar selección de categoría
  const handleCategorySelect = (categoryName) => {
    setSelectedCategory(categoryName)
    // Actualizar URL sin recargar la página
    if (categoryName) {
      setSearchParams({ categoria: categoryName })
    } else {
      setSearchParams({})
    }
  }

  // Calcular productos filtrados en tiempo de renderizado
  const filteredProducts = products.filter(p => {
    // Filtro por categoría
    if (selectedCategory && p.category_name !== selectedCategory) {
      return false
    }

    // Filtro por búsqueda
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase()
      const matches = 
        p.name.toLowerCase().includes(term) || 
        p.sku.toLowerCase().includes(term) ||
        (p.category_name && p.category_name.toLowerCase().includes(term))
      
      if (!matches) return false
    }

    // Filtro por estado
    if (filterActive === 'active') {
      return p.active
    } else if (filterActive === 'inactive') {
      return !p.active
    }

    return true
  })

  const handleDeactivate = async (id) => {
    if (!window.confirm('¿Deseas dejar de usar este producto? Su historial se conservará.')) return

    try {
      await deactivateProduct(id)
      loadData()
    } catch (err) {
      console.error(err)
      alert('No fue posible desactivar el producto. Intenta nuevamente.')
    }
  }

  const handleAddBatch = (productId) => {
    setSelectedProductIdForBatch(productId)
    setShowBatchModal(true)
  }

  const handleCloseBatchModal = () => {
    setShowBatchModal(false)
    setSelectedProductIdForBatch(null)
  }

  // Helper para clasificar vencimiento
  const getExpirationBadge = (dateString) => {
    if (!dateString) return <span className="text-slate-400 font-medium text-xs">Sin lotes</span>

    const expirationDate = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const diffTime = expirationDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // Formatear fecha legible en español
    const formattedDate = expirationDate.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    })

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-bold rounded-full uppercase tracking-wide">
          <AlertTriangle className="w-3 h-3" />
          <span>Vencido: {formattedDate}</span>
        </span>
      )
    } else if (diffDays <= 90) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wide">
          <AlertTriangle className="w-3 h-3" />
          <span>Vence pronto: {formattedDate} ({diffDays}d)</span>
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-wide">
          <Calendar className="w-3 h-3" />
          <span>{formattedDate}</span>
        </span>
      )
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      
      {/* Encabezado con Acciones */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 mb-8">
        <div>
          <span className="bg-brand-100 text-brand-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-brand-200/50 inline-block mb-2">
            Inventario
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800">
            Mis Productos
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Consulta, organiza y abastece tu inventario desde aquí.
          </p>
        </div>

        {role === 'admin' && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowBatchModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold rounded-2xl text-xs active:scale-95 transition-all shadow-sm"
            >
              <Calendar className="w-4 h-4 text-gold-600" />
              <span>Registrar lote</span>
            </button>
            <button
              onClick={() => setShowProductModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-semibold rounded-2xl text-xs active:scale-95 transition-all shadow-md shadow-brand-600/10"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo producto</span>
            </button>
          </div>
        )}
      </div>

      {/* Filtro por Categorías */}
      {!loading && !error && (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Tag className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Filtrar por categoría</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Botón "Todas" */}
            <button
              onClick={() => handleCategorySelect(null)}
              className={`group relative px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 active:scale-95 ${
                selectedCategory === null
                  ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md shadow-brand-600/15'
                  : 'bg-slate-50 text-slate-600 border border-slate-100 hover:bg-brand-50 hover:border-brand-100 hover:text-brand-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Todas</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  selectedCategory === null
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200/70 text-slate-500 group-hover:bg-brand-100 group-hover:text-brand-700'
                }`}>
                  {products.length}
                </span>
              </div>
            </button>

            {/* Categorías dinámicas */}
            {categories.map((cat) => {
              const count = getCategoryCount(cat.name)
              const isSelected = selectedCategory === cat.name
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.name)}
                  className={`group relative px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 active:scale-95 ${
                    isSelected
                      ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md shadow-brand-600/15'
                      : 'bg-slate-50 text-slate-600 border border-slate-100 hover:bg-brand-50 hover:border-brand-100 hover:text-brand-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span>{cat.name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/70 text-slate-500 group-hover:bg-brand-100 group-hover:text-brand-700'
                    }`}>
                      {count}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Buscador y Filtros */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="relative flex-grow max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre, código o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-xs font-medium"
          />
        </div>

        <div className="flex items-center space-x-2 self-end md:self-auto">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5" />
            <span>Estado:</span>
          </span>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-1 flex space-x-1">
            <button
              onClick={() => setFilterActive('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterActive === 'all'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterActive('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterActive === 'active'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Activos
            </button>
            <button
              onClick={() => setFilterActive('inactive')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterActive === 'inactive'
                  ? 'bg-white text-slate-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Inactivos
            </button>
          </div>
        </div>
      </div>

      {/* Texto dinámico de filtro activo */}
      {!loading && !error && (
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-xs text-slate-400 font-medium">
            {selectedCategory 
              ? <>Mostrando productos de <strong className="text-slate-600">{selectedCategory}</strong></>
              : 'Mostrando todos los productos'
            }
            {searchTerm && <> · Búsqueda: "<strong className="text-slate-600">{searchTerm}</strong>"</>}
            <span className="ml-2 text-slate-300">({filteredProducts.length} resultado{filteredProducts.length !== 1 ? 's' : ''})</span>
          </p>
          {selectedCategory && (
            <button
              onClick={() => handleCategorySelect(null)}
              className="text-[10px] text-brand-600 hover:text-brand-700 font-bold hover:underline transition-colors"
            >
              Limpiar filtro
            </button>
          )}
        </div>
      )}

      {/* Estados de Carga, Error y Vacío */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 text-sm font-medium">Cargando productos...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 text-rose-800 flex items-start space-x-4">
          <AlertTriangle className="w-6 h-6 text-rose-600 mt-0.5" />
          <div>
            <span className="font-bold block text-sm">No se pudo cargar la información</span>
            <p className="text-xs text-rose-700/90 mt-1">{error}</p>
            <p className="text-xs text-rose-700/70 mt-2">
              Si el problema persiste, contacta al administrador del sistema.
            </p>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            {selectedCategory 
              ? `No hay productos en "${selectedCategory}"`
              : 'No se encontraron productos'
            }
          </h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm">
            {searchTerm || filterActive !== 'all' 
              ? 'Intenta con otros términos de búsqueda o cambia el filtro.'
              : selectedCategory
                ? 'No hay productos registrados en esta categoría.'
                : 'Tu inventario está vacío. Comienza agregando tu primer producto.'
            }
          </p>
          {role === 'admin' && !searchTerm && filterActive === 'all' && (
            <button
              onClick={() => setShowProductModal(true)}
              className="mt-6 inline-flex items-center space-x-2 px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl text-xs transition-all shadow-md shadow-brand-600/10"
            >
              <Plus className="w-4 h-4" />
              <span>Crear producto</span>
            </button>
          )}
        </div>
      ) : (
        /* Listado de Productos en Tabla */
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Precio Venta</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stock Total</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Próximo Vencimiento</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                  {role === 'admin' && (
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => (
                  <tr 
                    key={product.id} 
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-bold text-slate-800 text-xs block group-hover:text-brand-700 transition-colors">
                          {product.name}
                        </span>
                        {product.description && (
                          <span className="text-[10px] text-slate-400 font-medium block mt-0.5 line-clamp-1">
                            {product.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleCategorySelect(product.category_name)}
                        className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider transition-all hover:scale-105 cursor-pointer ${
                          selectedCategory === product.category_name
                            ? 'bg-brand-100 text-brand-700 border border-brand-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-600'
                        }`}
                      >
                        {product.category_name || 'Sin Categoría'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-700">
                      ${parseFloat(product.sale_price || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-bold ${
                          product.total_stock === 0 
                            ? 'text-rose-600' 
                            : product.total_stock <= 10 
                            ? 'text-amber-600' 
                            : 'text-slate-700'
                        }`}>
                          {formatStock(product.total_stock, product.conversion_factor, product.base_unit, product.presentation_unit)}
                        </span>
                        {product.total_stock === 0 && (
                          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getExpirationBadge(product.next_expiration)}
                    </td>
                    <td className="px-6 py-4">
                      {product.active ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Activo</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Inactivo</span>
                        </span>
                      )}
                    </td>
                    {role === 'admin' && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleAddBatch(product.id)}
                            className="p-1.5 bg-gold-50 border border-gold-100 text-gold-600 hover:bg-gold-100 rounded-xl transition-all"
                            title="Registrar lote"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                          {product.active && (
                            <button
                              onClick={() => handleDeactivate(product.id)}
                              className="p-1.5 bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-xl transition-all"
                              title="Dejar de usar este producto"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal - Crear Producto */}
      {showProductModal && (
        <ProductForm 
          onClose={() => setShowProductModal(false)} 
          onSuccess={() => {
            setShowProductModal(false)
            loadData()
          }}
        />
      )}

      {/* Modal - Registrar Lote */}
      {showBatchModal && (
        <BatchForm 
          onClose={handleCloseBatchModal} 
          onSuccess={() => {
            handleCloseBatchModal()
            loadData()
          }}
          preselectedProductId={selectedProductIdForBatch}
        />
      )}

    </div>
  )
}
