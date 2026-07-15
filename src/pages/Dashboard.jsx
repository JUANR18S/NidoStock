import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { getProducts } from '../services/productService'
import { 
  TrendingUp, 
  Layers, 
  Tag, 
  Users, 
  Calendar, 
  AlertTriangle, 
  ShieldCheck, 
  PackageCheck,
  UserCheck,
  LayoutGrid,
  ArrowRight
} from 'lucide-react'

export const Dashboard = () => {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [loadingCats, setLoadingCats] = useState(true)
  const [dbError, setDbError] = useState(false)

  // Métricas dinámicas del inventario
  const [productsCount, setProductsCount] = useState(0)
  const [activeBatchesCount, setActiveBatchesCount] = useState(0)
  const [expiringBatchesCount, setExpiringBatchesCount] = useState(0)
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [allProducts, setAllProducts] = useState([])

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoadingCats(true)
        setLoadingMetrics(true)
        setDbError(false)

        // 1. Obtener categorías
        const { data: catData, error: catError } = await supabase
          .from('product_categories')
          .select('*')
          .order('name', { ascending: true })

        if (catError) throw catError
        setCategories(catData || [])

        // 2. Obtener total de productos
        const { count: prodCount, error: prodError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })

        if (prodError) throw prodError
        setProductsCount(prodCount || 0)

        // 3. Obtener lotes activos (current_quantity > 0)
        const { count: batchCount, error: batchError } = await supabase
          .from('product_batches')
          .select('*', { count: 'exact', head: true })
          .gt('current_quantity', 0)

        if (batchError) throw batchError
        setActiveBatchesCount(batchCount || 0)

        // 4. Obtener lotes por vencer en los próximos 90 días
        const today = new Date()
        const targetDate = new Date()
        targetDate.setDate(today.getDate() + 90)

        const formattedToday = today.toISOString().split('T')[0]
        const formattedTarget = targetDate.toISOString().split('T')[0]

        const { count: expCount, error: expError } = await supabase
          .from('product_batches')
          .select('*', { count: 'exact', head: true })
          .gt('current_quantity', 0)
          .gte('expiration_date', formattedToday)
          .lte('expiration_date', formattedTarget)

        if (expError) throw expError
        setExpiringBatchesCount(expCount || 0)

        // 5. Obtener todos los productos para contadores de categorías
        try {
          const prodsData = await getProducts()
          setAllProducts(prodsData || [])
        } catch {
          // Si falla, no es crítico — los contadores simplemente no aparecerán
          setAllProducts([])
        }

      } catch (err) {
        console.error('Error al cargar datos del Dashboard:', err)
        setDbError(true)
      } finally {
        setLoadingCats(false)
        setLoadingMetrics(false)
      }
    }

    loadDashboardData()
  }, [])

  // Contar productos por categoría
  const getCategoryCount = (categoryName) => {
    if (!categoryName) return allProducts.length
    return allProducts.filter(p => p.category_name === categoryName).length
  }

  const handleCategoryClick = (categoryName) => {
    if (categoryName) {
      navigate(`/productos?categoria=${encodeURIComponent(categoryName)}`)
    } else {
      navigate('/productos')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      
      {/* Banner de Bienvenida */}
      <div className="bg-gradient-to-r from-brand-700 via-brand-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-slate-200 relative overflow-hidden mb-8">
        <div className="absolute right-0 top-0 translate-x-[20%] translate-y-[-20%] w-[300px] h-[300px] rounded-full bg-white/5 blur-3xl"></div>
        <div className="relative z-10">
          <span className="bg-white/10 text-brand-100 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-white/10 inline-block mb-3">
            Conectado
          </span>
          <h2 className="text-3xl font-bold tracking-tight">
            ¡Hola, {user?.email?.split('@')[0]}!
          </h2>
          <p className="text-brand-100/80 text-sm mt-1 max-w-xl">
            Este es tu resumen del día. Tu perfil es de{' '}
            <strong className="text-white underline decoration-gold-300">
              {role === 'admin' ? 'Administrador' : 'Empleado'}
            </strong>.
          </p>
        </div>
      </div>

      {/* Tarjetas de Métricas basadas en Rol */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {role === 'admin' ? (
          <>
            {/* VISTA ADMINISTRADOR */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Productos</span>
                {loadingMetrics ? (
                  <div className="h-7 w-12 bg-slate-100 animate-pulse rounded mt-1"></div>
                ) : (
                  <span className="text-2xl font-bold text-slate-800">{productsCount}</span>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gold-50 text-gold-600 flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Lotes con stock</span>
                {loadingMetrics ? (
                  <div className="h-7 w-12 bg-slate-100 animate-pulse rounded mt-1"></div>
                ) : (
                  <span className="text-2xl font-bold text-slate-800">{activeBatchesCount}</span>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Ventas (Mes)</span>
                <span className="text-2xl font-bold text-slate-800">$1,240.00</span>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Próximamente</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Tipos de usuario</span>
                <span className="text-2xl font-bold text-slate-800">Administrador</span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* VISTA EMPLEADO */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4 col-span-1 md:col-span-2">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Mis ventas de hoy</span>
                <span className="text-2xl font-bold text-slate-800">$340.00</span>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Próximamente</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Por vencer</span>
                {loadingMetrics ? (
                  <div className="h-7 w-12 bg-slate-100 animate-pulse rounded mt-1"></div>
                ) : (
                  <span className="text-2xl font-bold text-slate-800">{expiringBatchesCount} Lotes</span>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Clientes</span>
                <span className="text-2xl font-bold text-slate-800">12</span>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Próximamente</span>
              </div>
            </div>
          </>
        )}

      </div>

      {/* Filtro rápido por categorías */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 leading-tight">Categorías de productos</h3>
              <p className="text-xs text-slate-400 font-medium">Selecciona una categoría para ver sus productos</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/productos')}
            className="hidden md:inline-flex items-center space-x-1.5 text-xs text-brand-600 hover:text-brand-700 font-bold hover:underline transition-colors"
          >
            <span>Ver todos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingCats ? (
          <div className="flex items-center space-x-2 py-4">
            <div className="w-4 h-4 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
            <span className="text-xs text-slate-400 font-medium">Cargando categorías...</span>
          </div>
        ) : dbError ? (
          <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 mt-0.5 text-amber-600" />
              <div>
                <span className="font-semibold block text-sm">Configuración pendiente</span>
                <p className="text-xs text-amber-700/90 mt-1 max-w-xl leading-relaxed">
                  No fue posible conectar con el sistema. Por favor contacta al administrador para completar la configuración inicial.
                </p>
              </div>
            </div>
          </div>
        ) : categories.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 font-medium">Aún no hay categorías registradas.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {/* Botón Todas */}
            <button
              onClick={() => handleCategoryClick(null)}
              className="group bg-slate-50 hover:bg-brand-50 border border-slate-100 hover:border-brand-100 px-5 py-3 rounded-2xl text-center transition-all duration-200 cursor-pointer active:scale-95"
            >
              <div className="flex items-center space-x-2">
                <LayoutGrid className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-600 transition-colors" />
                <span className="text-xs font-bold text-slate-600 group-hover:text-brand-700 transition-colors">Todas</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200/70 text-slate-500 group-hover:bg-brand-100 group-hover:text-brand-700 transition-all">
                  {getCategoryCount(null)}
                </span>
              </div>
            </button>
            {/* Categorías dinámicas */}
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.name)}
                className="group bg-slate-50 hover:bg-brand-50 border border-slate-100 hover:border-brand-100 px-5 py-3 rounded-2xl text-center transition-all duration-200 cursor-pointer active:scale-95"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-600 group-hover:text-brand-700 transition-colors">
                    {cat.name}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200/70 text-slate-500 group-hover:bg-brand-100 group-hover:text-brand-700 transition-all">
                    {getCategoryCount(cat.name)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Así protege NidoStock tu información */}
      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200/50">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-9 h-9 bg-brand-100 text-brand-700 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">¿Cómo protege NidoStock tu información?</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tarjeta 1 */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">🛡️</span>
              <span className="text-xs font-bold text-slate-700">Tu información siempre está protegida</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Cada movimiento del inventario queda registrado automáticamente con la fecha, hora y el usuario que lo realizó.
            </p>
          </div>
          {/* Tarjeta 2 */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">📦</span>
              <span className="text-xs font-bold text-slate-700">Nunca pierdes el historial</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Aunque un producto deje de utilizarse, su historial de movimientos y ventas permanece disponible para tu consulta.
            </p>
          </div>
          {/* Tarjeta 3 */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">👤</span>
              <span className="text-xs font-bold text-slate-700">Cada usuario tiene permisos diferentes</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Los empleados solo pueden realizar las acciones que les corresponden. Solo los administradores pueden modificar precios y registrar inventario.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
