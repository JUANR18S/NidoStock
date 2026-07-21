import React, { useState, useEffect } from 'react'
import { 
  Search, Eye, Ban, Calendar, X, FileText, CheckCircle2, 
  XCircle, Receipt, RefreshCw, AlertTriangle 
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getSales, getSaleDetails, cancelSale } from '../services/salesService'

export default function SalesHistory() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'completed', 'cancelled'

  // Modal Detalles
  const [selectedSale, setSelectedSale] = useState(null)
  const [saleDetails, setSaleDetails] = useState([])
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  // Modal Anulación
  const [saleToCancel, setSaleToCancel] = useState(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [submittingCancellation, setSubmittingCancellation] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const data = await getSales()
      setSales(data)
    } catch (err) {
      setErrorMessage('Error al obtener el historial de ventas: ' + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  // Cargar detalles de una venta
  const handleOpenDetails = async (sale) => {
    setSelectedSale(sale)
    setShowDetailsModal(true)
    setDetailsLoading(true)
    try {
      const details = await getSaleDetails(sale.id)
      setSaleDetails(details)
    } catch (err) {
      setErrorMessage('Error al cargar el detalle de la venta: ' + (err.message || err))
    } finally {
      setDetailsLoading(false)
    }
  }

  // Abrir diálogo de cancelación
  const handleOpenCancel = (sale) => {
    setSaleToCancel(sale)
    setCancellationReason('')
    setShowCancelModal(true)
  }

  // Enviar anulación de venta a Supabase
  const handleCancelSale = async (e) => {
    e.preventDefault()
    if (!saleToCancel || !cancellationReason.trim()) return

    if (cancellationReason.length > 500) {
      setErrorMessage('El motivo de anulación no puede superar los 500 caracteres.')
      return
    }

    setSubmittingCancellation(true)
    setErrorMessage('')
    try {
      await cancelSale(saleToCancel.id, cancellationReason.trim())
      setSuccessMessage(`Venta ${saleToCancel.sale_number} anulada correctamente. Stock retornado.`)
      setShowCancelModal(false)
      setSaleToCancel(null)
      setCancellationReason('')
      // Recargar listado
      await fetchSales()
      setTimeout(() => setSuccessMessage(''), 4000)
    } catch (err) {
      setErrorMessage('Error al anular la venta: ' + (err.message || err))
    } finally {
      setSubmittingCancellation(false)
    }
  }

  // Filtrado de ventas
  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      sale.sale_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.customers?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.customers?.document_number || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = 
      statusFilter === 'all' || 
      sale.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      {/* Encabezado */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="text-brand-600 h-8 w-8" />
            Historial de Ventas
          </h1>
          <p className="text-slate-500 text-sm mt-1">Monitorea los registros de facturación del POS, consulta desgloses y realiza devoluciones autorizadas.</p>
        </div>
        <button
          onClick={fetchSales}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-2xl text-xs active:scale-95 transition-all shadow-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Recargar Historial
        </button>
      </div>

      {/* Alertas */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-2xl text-red-700 text-sm flex items-start justify-between shadow-sm">
          <div>{errorMessage}</div>
          <button onClick={() => setErrorMessage('')} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-2xl text-emerald-700 text-sm flex items-start justify-between shadow-sm animate-pulse">
          <div>{successMessage}</div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Caja de Filtros */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 md:p-6 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nro. venta o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white focus:outline-none rounded-2xl text-xs transition-all"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {['all', 'completed', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex-1 md:flex-none py-2 px-4 rounded-xl border font-bold text-xs capitalize transition-all active:scale-95 ${
                statusFilter === status
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {status === 'all' ? 'Todos' : status === 'completed' ? 'Completadas' : 'Anuladas'}
            </button>
          ))}
        </div>
      </div>

      {/* Listado de Ventas */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 text-center">
            <RefreshCw className="h-10 w-10 text-brand-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Obteniendo registros del historial...</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="py-24 text-center text-slate-400">
            <FileText className="h-14 w-14 mx-auto mb-3 stroke-[1.2]" />
            <p className="text-sm font-semibold">No se encontraron registros de ventas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/75 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4">Nro. Venta</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Cajero</th>
                  <th className="p-4">Método Pago</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredSales.map(sale => {
                  const isCancelled = sale.status === 'cancelled'
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-extrabold text-slate-900">{sale.sale_number}</td>
                      <td className="p-4 text-slate-500">{new Date(sale.created_at).toLocaleString()}</td>
                      <td className="p-4">
                        {sale.customers ? (
                          <div>
                            <p className="font-bold text-slate-800">{sale.customers.full_name}</p>
                            {sale.customers.document_number && (
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{sale.customers.document_number}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Consumidor Final</span>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-700">{sale.profiles?.full_name || 'Cajero'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{sale.profiles?.email}</p>
                      </td>
                      <td className="p-4 uppercase font-bold text-slate-500">{sale.payment_method}</td>
                      <td className="p-4 font-black text-slate-900 text-sm">
                        ${Number(sale.total).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isCancelled 
                            ? 'bg-red-50 text-red-700' 
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {isCancelled ? (
                            <>
                              <XCircle className="h-3.5 w-3.5 shrink-0" />
                              Anulada
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              Completada
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleOpenDetails(sale)}
                            title="Ver Detalles"
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl active:scale-95 transition-all"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {isAdmin && !isCancelled && (
                            <button
                              onClick={() => handleOpenCancel(sale)}
                              title="Anular Venta"
                              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl active:scale-95 transition-all"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: DETALLES DE VENTA */}
      {showDetailsModal && selectedSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-brand-400" />
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wide">Comprobante de Venta</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Consecutivo: {selectedSale.sale_number}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Metadatos Generales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Fecha de Creación</p>
                  <p className="font-bold text-slate-800 mt-0.5">{new Date(selectedSale.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Cliente Asignado</p>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedSale.customers?.full_name || 'Consumidor Final'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Método de Pago</p>
                  <p className="font-bold text-slate-800 mt-0.5 capitalize">{selectedSale.payment_method}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Total de Venta</p>
                  <p className="font-extrabold text-brand-600 mt-0.5 text-sm">
                    ${Number(selectedSale.total).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Si está anulada, mostrar datos de anulación */}
              {selectedSale.status === 'cancelled' && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs flex items-start gap-2.5 text-red-700">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-red-800">Detalles de Anulación</h4>
                    <p className="mt-1 font-medium"><span className="font-bold">Motivo:</span> {selectedSale.cancellation_reason || 'No especificado'}</p>
                    <p className="text-[10px] text-red-600/80 mt-0.5">Anulado el {selectedSale.cancelled_at ? new Date(selectedSale.cancelled_at).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>
              )}

              {/* Detalles de Productos y Lotes */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-3 uppercase tracking-wider">Detalle del Pedido</h4>
                {detailsLoading ? (
                  <div className="py-8 text-center">
                    <RefreshCw className="h-6 w-6 text-brand-600 animate-spin mx-auto mb-2" />
                    <p className="text-slate-400 text-xs">Cargando desglose de productos...</p>
                  </div>
                ) : (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                          <th className="p-3">Producto / SKU</th>
                          <th className="p-3">Lote Despachado</th>
                          <th className="p-3 text-center">Cantidad</th>
                          <th className="p-3 text-right">Precio Unit.</th>
                          <th className="p-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                        {saleDetails.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/20">
                            <td className="p-3">
                              <p className="font-bold text-slate-800">{item.products?.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">SKU: {item.products?.sku}</p>
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-600">{item.product_batches?.batch_code}</td>
                            <td className="p-3 text-center">{item.quantity}</td>
                            <td className="p-3 text-right">${Number(item.unit_price).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
                            <td className="p-3 text-right font-bold text-slate-900">${Number(item.subtotal).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl active:scale-95 transition-all shadow-md"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ANULACIÓN DE VENTA */}
      {showCancelModal && saleToCancel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowCancelModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Ban className="text-red-500 h-5 w-5" />
              Anular Venta {saleToCancel.sale_number}
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Esta operación es irreversible. Confirmar la anulación reintegrará de forma inmediata las unidades vendidas a sus respectivos lotes de origen.
            </p>

            <form onSubmit={handleCancelSale} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Motivo de Anulación *</label>
                <textarea
                  required
                  placeholder="Especifica detalladamente por qué anulas esta transacción (mínimo 5 caracteres, máximo 500)..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-none rounded-xl text-xs transition-all resize-none font-semibold text-slate-700"
                />
                <span className="text-[10px] text-slate-400 font-bold block text-right mt-1">
                  {cancellationReason.length}/500 caracteres
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-50 active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCancellation || cancellationReason.trim().length < 5}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl active:scale-95 transition-all disabled:opacity-50"
                >
                  {submittingCancellation ? 'Procesando...' : 'Confirmar Anulación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
