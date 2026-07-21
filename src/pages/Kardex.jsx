import { useState, useEffect } from 'react'
import { getStockMovements } from '../services/productService'
import { 
  History, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  HelpCircle,
  AlertTriangle,
  Calendar,
  User,
  Filter,
  RefreshCw,
  Info
} from 'lucide-react'

// Mapeo amigable de tipos de movimiento
const MOVEMENT_TYPES = {
  input: {
    label: 'Entrada',
    color: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    icon: ArrowUpRight
  },
  output: {
    label: 'Salida',
    color: 'bg-rose-50 border-rose-100 text-rose-700',
    icon: ArrowDownLeft
  },
  adjustment_in: {
    label: 'Ajuste Entrada',
    color: 'bg-amber-50 border-amber-100 text-amber-700',
    icon: ArrowUpRight
  },
  adjustment_out: {
    label: 'Ajuste Salida',
    color: 'bg-amber-50 border-amber-100 text-amber-700',
    icon: ArrowDownLeft
  }
}

// Mapeo de motivos del movimiento en español
const MOVEMENT_REASONS = {
  sale: 'Venta realizada',
  purchase: 'Abastecimiento (Compra)',
  expiration: 'Producto vencido',
  damage: 'Producto dañado/roto',
  return: 'Devolución de cliente',
  internal_consumption: 'Consumo interno',
  physical_count: 'Ajuste por inventario físico',
  adjustment: 'Ajuste general',
  batch_creation: 'Creación inicial de lote'
}

export const Kardex = () => {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all') // all, input, output, adjustment_in, adjustment_out
  const [filterReason, setFilterReason] = useState('all') // all, sale, purchase, etc.

  const loadMovements = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getStockMovements()
      setMovements(data)
    } catch (err) {
      console.error('Error al cargar movimientos de stock:', err)
      setError('No fue posible cargar el historial del Kardex. Intenta recargar la página.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMovements()
  }, [])

  // Filtrar los movimientos en tiempo de renderizado
  const filteredMovements = movements.filter(mov => {
    // 1. Filtro de búsqueda (nombre producto, SKU o lote)
    const product = mov.product_batches?.products
    const batch = mov.product_batches
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase()
      const matches = 
        product?.name?.toLowerCase().includes(term) ||
        product?.sku?.toLowerCase().includes(term) ||
        batch?.batch_code?.toLowerCase().includes(term) ||
        mov.description?.toLowerCase().includes(term)
      
      if (!matches) return false
    }

    // 2. Filtro de tipo de movimiento
    if (filterType !== 'all') {
      if (filterType === 'adjustment') {
        if (!mov.type.startsWith('adjustment')) return false
      } else if (mov.type !== filterType) {
        return false
      }
    }

    // 3. Filtro de motivo
    if (filterReason !== 'all' && mov.reason !== filterReason) {
      return false
    }

    return true
  })

  // Helper para formatear fecha en español de manera local
  const formatDateTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 mb-8">
        <div>
          <span className="bg-brand-100 text-brand-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-brand-200/50 inline-block mb-2">
            Auditoría
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center space-x-2">
            <History className="w-8 h-8 text-brand-600" />
            <span>Kardex de Inventario</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Historial de movimientos de stock. Trazabilidad completa de entradas, salidas y ajustes de inventario.
          </p>
        </div>

        <div>
          <button
            onClick={loadMovements}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold rounded-2xl text-xs active:scale-95 transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-brand-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Recargar</span>
          </button>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        
        {/* Buscador */}
        <div className="relative flex-grow max-w-lg">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar por producto, SKU, lote u observación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-xs font-medium"
          />
        </div>

        {/* Controles de Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Tipo de movimiento */}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Tipo:</span>
            </span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl text-xs font-semibold outline-none focus:bg-white transition-all cursor-pointer"
            >
              <option value="all">Todos</option>
              <option value="input">Entradas</option>
              <option value="output">Salidas</option>
              <option value="adjustment">Ajustes</option>
            </select>
          </div>

          {/* Motivo */}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center space-x-1">
              <Info className="w-3.5 h-3.5" />
              <span>Motivo:</span>
            </span>
            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl text-xs font-semibold outline-none focus:bg-white transition-all cursor-pointer"
            >
              <option value="all">Todos los motivos</option>
              {Object.entries(MOVEMENT_REASONS).map(([key, val]) => (
                <option key={key} value={key}>{val}</option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* Tabla / Contenido principal */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 text-sm font-medium">Cargando historial de movimientos...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 text-rose-800 flex items-start space-x-4">
          <AlertTriangle className="w-6 h-6 text-rose-600 mt-0.5" />
          <div>
            <span className="font-bold block text-sm">Error de conexión</span>
            <p className="text-xs text-rose-700/90 mt-1">{error}</p>
          </div>
        </div>
      ) : filteredMovements.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
            <History className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Sin movimientos</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm">
            No se encontraron registros en el Kardex para los filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha / Hora</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Producto / Lote</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Operación / Motivo</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Stock Previo</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Cantidad</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Stock Final</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Responsable</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Observación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.map((mov) => {
                  const typeInfo = MOVEMENT_TYPES[mov.type] || {
                    label: mov.type,
                    color: 'bg-slate-100 text-slate-700',
                    icon: Info
                  }
                  const IconComponent = typeInfo.icon
                  const product = mov.product_batches?.products
                  const batch = mov.product_batches
                  const userEmail = mov.profiles?.email || 'Sistema'
                  const userFullName = mov.profiles?.full_name || ''

                  return (
                    <tr key={mov.id} className="hover:bg-slate-50/30 transition-colors">
                      
                      {/* Fecha / Hora */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-medium">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-300" />
                          <span>{formatDateTime(mov.created_at)}</span>
                        </div>
                      </td>

                      {/* Producto / Lote */}
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-bold text-slate-800 text-xs block">
                            {product?.name || 'Producto Desconocido'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            SKU: {product?.sku || 'N/A'} | Lote: <strong className="text-slate-600">{batch?.batch_code || 'N/A'}</strong>
                          </span>
                        </div>
                      </td>

                      {/* Operación / Motivo */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase tracking-wider ${typeInfo.color}`}>
                            <IconComponent className="w-2.5 h-2.5" />
                            <span>{typeInfo.label}</span>
                          </span>
                          <span className="text-slate-500 text-[10px] font-semibold block">
                            {MOVEMENT_REASONS[mov.reason] || mov.reason}
                          </span>
                        </div>
                      </td>

                      {/* Stock Previo */}
                      <td className="px-6 py-4 text-center text-xs font-semibold text-slate-400">
                        {mov.previous_stock !== null ? mov.previous_stock : '-'}
                      </td>

                      {/* Cantidad */}
                      <td className="px-6 py-4 text-center">
                        <span className={`text-xs font-extrabold ${
                          mov.type.includes('input') || mov.type.includes('adjustment_in')
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}>
                          {mov.type.includes('input') || mov.type.includes('adjustment_in') ? '+' : '-'}
                          {mov.quantity}
                        </span>
                      </td>

                      {/* Stock Final */}
                      <td className="px-6 py-4 text-center text-xs font-bold text-slate-700 bg-slate-50/30">
                        {mov.new_stock !== null ? mov.new_stock : '-'}
                      </td>

                      {/* Responsable */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 bg-brand-50 text-brand-700 rounded-full flex items-center justify-center border border-brand-100">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-slate-700 block max-w-[120px] truncate leading-tight">
                              {userFullName || userEmail.split('@')[0]}
                            </span>
                            <span className="text-[9px] text-slate-400 block max-w-[120px] truncate">
                              {userEmail}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Observación */}
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate" title={mov.description}>
                        {mov.description || '-'}
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
