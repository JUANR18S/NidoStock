import React, { useState, useEffect } from 'react'
import { 
  Search, Plus, Minus, Trash2, UserPlus, CreditCard, 
  DollarSign, ShoppingCart, Check, RefreshCw, X, Receipt 
} from 'lucide-react'
import { getProducts } from '../services/productService'
import { getCustomers, createCustomer, registerSale } from '../services/salesService'

export default function Sales() {
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [cart, setCart] = useState([])
  
  // Filtros y búsquedas
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  
  // Carga y Modales
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  // Modal de nuevo cliente
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    full_name: '',
    document_number: '',
    phone: '',
    email: ''
  })
  
  // Modal de ticket de venta
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [receiptData, setReceiptData] = useState(null)

  // Cargar productos y clientes al inicio
  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const [prodData, custData] = await Promise.all([
        getProducts(),
        getCustomers()
      ])
      // Filtrar solo productos activos
      setProducts(prodData.filter(p => p.active))
      setCustomers(custData.filter(c => c.active))
    } catch (err) {
      setErrorMessage('Error al cargar datos del servidor: ' + (err.message || err))
    } finally {
      setLoading(false)
    }
  };

  // Filtrado de productos en base a búsqueda por Nombre o SKU
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Agregar al carrito
  const addToCart = (product) => {
    if (product.total_stock <= 0) return

    setCart(prevCart => {
      const existing = prevCart.find(item => item.product_id === product.id)
      if (existing) {
        if (existing.quantity >= product.total_stock) return prevCart
        return prevCart.map(item => 
          item.product_id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        )
      } else {
        return [...prevCart, {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          sale_price: product.sale_price,
          total_stock: product.total_stock,
          quantity: 1
        }]
      }
    })
  }

  // Modificar cantidad directamente
  const updateQuantity = (productId, newQty, maxStock) => {
    if (newQty <= 0) {
      removeFromCart(productId)
      return
    }
    if (newQty > maxStock) {
      newQty = maxStock
    }
    setCart(prevCart => 
      prevCart.map(item => 
        item.product_id === productId 
          ? { ...item, quantity: Math.floor(newQty) } 
          : item
      )
    )
  }

  // Quitar del carrito
  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.product_id !== productId))
  }

  // Limpiar carrito
  const clearCart = () => {
    setCart([])
    setSelectedCustomerId('')
    setPaymentMethod('efectivo')
  }

  // Calcular totales del carrito
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.quantity * item.sale_price), 0)
  const cartTotal = cartSubtotal

  // Registrar nuevo cliente desde modal
  const handleCreateCustomer = async (e) => {
    e.preventDefault()
    if (!newCustomer.full_name.trim()) return

    setSubmitting(true)
    setErrorMessage('')
    try {
      const created = await createCustomer({
        full_name: newCustomer.full_name.trim(),
        document_number: newCustomer.document_number.trim() || null,
        phone: newCustomer.phone.trim() || null,
        email: newCustomer.email.trim() || null,
        active: true
      })
      setCustomers(prev => [...prev, created].sort((a, b) => a.full_name.localeCompare(b.full_name)))
      setSelectedCustomerId(created.id)
      setShowCustomerModal(false)
      setNewCustomer({ full_name: '', document_number: '', phone: '', email: '' })
      setSuccessMessage('Cliente registrado con éxito.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setErrorMessage('Error al registrar cliente: ' + (err.message || err))
    } finally {
      setSubmitting(false)
    }
  }

  // Procesar venta en base de datos
  const handleRegisterSale = async () => {
    if (cart.length === 0) return

    setSubmitting(true)
    setErrorMessage('')
    try {
      // Mapear items al formato del RPC [ { product_id, quantity } ]
      const itemsPayload = cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }))

      const response = await registerSale(
        selectedCustomerId || null,
        paymentMethod,
        itemsPayload
      )

      // Guardar información del comprobante para el modal
      setReceiptData({
        sale_id: response.sale_id,
        sale_number: response.sale_number,
        total: response.total,
        payment_method: paymentMethod,
        items: cart,
        customer_name: selectedCustomerId 
          ? customers.find(c => c.id === selectedCustomerId)?.full_name 
          : 'Consumidor Final',
        created_at: new Date(response.created_at || Date.now()).toLocaleString()
      })

      // Limpiar y recargar
      clearCart()
      setShowReceiptModal(true)
      await fetchInitialData()
    } catch (err) {
      setErrorMessage('Error al procesar la venta: ' + (err.message || err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      {/* Encabezado */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="text-brand-600 h-8 w-8" />
            Punto de Venta (POS)
          </h1>
          <p className="text-slate-500 text-sm mt-1">Registra ventas, administra clientes y controla la salida de inventario bajo FEFO.</p>
        </div>
        <button
          onClick={fetchInitialData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-2xl text-xs active:scale-95 transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Sincronizar Catálogo
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

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Catálogo de Productos */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 md:p-6 flex flex-col min-h-[500px]">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar producto por nombre o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white focus:outline-none rounded-2xl text-sm transition-all"
            />
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 text-brand-600 animate-spin mb-3" />
              <span className="text-slate-500 text-sm">Cargando catálogo...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400">
              <ShoppingCart className="h-12 w-12 stroke-[1.5] mb-3 text-slate-300" />
              <span className="text-sm font-medium">No se encontraron productos disponibles</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProducts.map(product => {
                const isOutOfStock = product.total_stock <= 0
                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`group relative p-4 rounded-2xl border transition-all flex flex-col justify-between h-36 select-none ${
                      isOutOfStock 
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed' 
                        : 'bg-white hover:bg-slate-50/50 border-slate-200 hover:border-brand-500/30 hover:shadow-md cursor-pointer active:scale-[0.98]'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                          {product.category_name || 'Sin Categoría'}
                        </span>
                        {product.next_expiration && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            new Date(product.next_expiration) <= new Date() 
                              ? 'bg-red-50 text-red-600' 
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            Vence: {new Date(product.next_expiration).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm mt-2 line-clamp-1 group-hover:text-brand-600 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">SKU: {product.sku}</p>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                      <span className="font-extrabold text-slate-900 text-base">
                        ${Number(product.sale_price).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                      </span>
                      <span className={`text-xs font-bold ${isOutOfStock ? 'text-red-500' : 'text-slate-500'}`}>
                        {isOutOfStock ? 'Agotado' : `${product.total_stock} unds`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Carrito de Compras */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 md:p-6 flex flex-col justify-between min-h-[500px]">
          
          {/* Cabecera y Cliente */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-brand-600" />
                Carrito ({cart.reduce((sum, item) => sum + item.quantity, 0)})
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 active:scale-95 transition-all"
                >
                  Vaciar
                </button>
              )}
            </div>

            {/* Asignación de Cliente */}
            <div className="bg-slate-50 p-3 rounded-2xl mb-4 border border-slate-200/50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente (Opcional)</label>
                <button
                  onClick={() => setShowCustomerModal(true)}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 active:scale-95 transition-all"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Nuevo Cliente
                </button>
              </div>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-700 text-xs py-2 px-3 focus:outline-none focus:border-brand-500 rounded-xl"
              >
                <option value="">-- Consumidor Final / Sin Cliente --</option>
                {customers.map(cust => (
                  <option key={cust.id} value={cust.id}>
                    {cust.full_name} {cust.document_number ? `(${cust.document_number})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Lista de Items */}
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <ShoppingCart className="h-10 w-10 stroke-[1.2] mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-medium">Agrega productos al carrito haciendo clic en las tarjetas del catálogo</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product_id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50/40 transition-colors gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 text-xs truncate">{item.name}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">${Number(item.sale_price).toLocaleString('es-CO', { minimumFractionDigits: 2 })} c/u</p>
                    </div>

                    {/* Controles de Cantidad */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.total_stock)}
                        className="p-1 border border-slate-200 hover:border-slate-300 rounded-lg active:scale-90 transition-all bg-white"
                      >
                        <Minus className="h-3 w-3 text-slate-500" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={item.total_stock}
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value) || 0, item.total_stock)}
                        className="w-10 text-center font-bold text-slate-800 text-xs border-b border-slate-200 focus:outline-none focus:border-brand-500 py-0.5"
                      />
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.total_stock)}
                        className="p-1 border border-slate-200 hover:border-slate-300 rounded-lg active:scale-90 transition-all bg-white"
                      >
                        <Plus className="h-3 w-3 text-slate-500" />
                      </button>
                    </div>

                    <div className="text-right min-w-[70px]">
                      <span className="font-extrabold text-slate-800 text-xs">
                        ${(item.quantity * item.sale_price).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Método de Pago y Confirmación */}
          <div className="border-t border-slate-100 pt-4 mt-4">
            
            {/* Método de Pago */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {['efectivo', 'tarjeta', 'transferencia', 'otro'].map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-1 text-center rounded-xl border font-bold text-[10px] capitalize transition-all active:scale-95 ${
                    paymentMethod === method
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>

            {/* Totales */}
            <div className="space-y-1.5 mb-4 px-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Subtotal</span>
                <span>${cartSubtotal.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-800 text-sm">Total</span>
                <span className="font-extrabold text-brand-600 text-xl">
                  ${cartTotal.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Botón Principal */}
            <button
              onClick={handleRegisterSale}
              disabled={cart.length === 0 || submitting}
              className="w-full py-4 px-4 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-extrabold text-xs tracking-wider uppercase rounded-2xl shadow-lg shadow-brand-600/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Procesando Venta...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Confirmar Venta
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* MODAL: REGISTRAR NUEVO CLIENTE */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowCustomerModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-brand-600" />
              Nuevo Cliente
            </h3>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={newCustomer.full_name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white focus:outline-none rounded-xl text-xs transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Cédula / NIT / Documento</label>
                <input
                  type="text"
                  placeholder="Ej. 1029384756"
                  value={newCustomer.document_number}
                  onChange={(e) => setNewCustomer({ ...newCustomer, document_number: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white focus:outline-none rounded-xl text-xs transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Teléfono de Contacto</label>
                <input
                  type="text"
                  placeholder="Ej. +57 300 123 4567"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white focus:outline-none rounded-xl text-xs transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="Ej. juan.perez@example.com"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white focus:outline-none rounded-xl text-xs transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-50 active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newCustomer.full_name.trim()}
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl active:scale-95 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TICKET DE VENTA (SUCCESS) */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Cabecera Ticket */}
            <div className="bg-brand-600 p-6 text-white text-center relative">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="absolute top-4 right-4 text-brand-100 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2.5">
                <Receipt className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-extrabold text-sm uppercase tracking-widest">Venta Exitosa</h3>
              <p className="text-xl font-black mt-1">{receiptData.sale_number}</p>
            </div>

            {/* Detalle Ticket */}
            <div className="p-6 space-y-4 text-xs text-slate-700 bg-slate-50/50">
              <div className="space-y-1.5 pb-3 border-b border-dashed border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Fecha:</span>
                  <span className="font-bold">{receiptData.created_at}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Cliente:</span>
                  <span className="font-bold">{receiptData.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Método de Pago:</span>
                  <span className="font-bold capitalize">{receiptData.payment_method}</span>
                </div>
              </div>

              {/* Items Desglosados */}
              <div className="space-y-2.5 py-1">
                <p className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Productos Despachados</p>
                <div className="max-h-[140px] overflow-y-auto space-y-2">
                  {receiptData.items.map(item => (
                    <div key={item.product_id} className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{item.quantity} unds x ${Number(item.sale_price).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <span className="font-bold text-slate-800 shrink-0">
                        ${(item.quantity * item.sale_price).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total final */}
              <div className="pt-3 border-t border-dashed border-slate-200 flex justify-between items-baseline">
                <span className="font-extrabold text-sm text-slate-800">Total Pagado:</span>
                <span className="font-black text-lg text-brand-600">
                  ${Number(receiptData.total).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs tracking-wider uppercase rounded-2xl active:scale-95 transition-all shadow-md shadow-slate-900/5 text-center"
              >
                Cerrar Recibo
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
