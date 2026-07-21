import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  LogOut, 
  Sparkles, 
  User, 
  Home, 
  Package, 
  ShoppingCart, 
  FileText, 
  History, 
  Users 
} from 'lucide-react'

export const Navbar = () => {
  const { user, role, signOut } = useAuth()

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (err) {
      console.error('Error al cerrar sesión:', err.message)
    }
  }

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo & Navigation */}
        <div className="flex items-center space-x-4 lg:space-x-8">
          <Link to="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity" aria-label="Ir al inicio de NidoStock">
            <div className="w-10 h-10 bg-gradient-to-tr from-brand-600 to-gold-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-brand-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-left hidden lg:block">
              <span className="font-bold text-lg text-slate-800 tracking-tight block leading-none">
                NidoStock
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Gestión de tu negocio
              </span>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <NavLink
              to="/"
              aria-label="Página de inicio"
              className={({ isActive }) => 
                `text-xs font-bold uppercase tracking-wider px-3 py-2.5 rounded-2xl transition-all duration-200 flex items-center space-x-1.5 border focus-visible:ring-2 focus-visible:ring-brand-500 outline-none ${
                  isActive 
                    ? 'bg-brand-50 text-brand-700 border-brand-100/50' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'
                }`
              }
            >
              <Home className="w-4 h-4 text-brand-600" aria-hidden="true" />
              <span className="hidden md:inline">Inicio</span>
            </NavLink>
            <NavLink
              to="/productos"
              aria-label="Inventario y Lotes"
              className={({ isActive }) => 
                `text-xs font-bold uppercase tracking-wider px-3 py-2.5 rounded-2xl transition-all duration-200 flex items-center space-x-1.5 border focus-visible:ring-2 focus-visible:ring-brand-500 outline-none ${
                  isActive 
                    ? 'bg-brand-50 text-brand-700 border-brand-100/50' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'
                }`
              }
            >
              <Package className="w-4 h-4 text-brand-600" aria-hidden="true" />
              <span className="hidden md:inline">Inventario</span>
            </NavLink>
            <NavLink
              to="/ventas"
              aria-label="Nueva venta"
              className={({ isActive }) => 
                `text-xs font-bold uppercase tracking-wider px-3 py-2.5 rounded-2xl transition-all duration-200 flex items-center space-x-1.5 border focus-visible:ring-2 focus-visible:ring-brand-500 outline-none ${
                  isActive 
                    ? 'bg-brand-50 text-brand-700 border-brand-100/50' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'
                }`
              }
            >
              <ShoppingCart className="w-4 h-4 text-brand-600" aria-hidden="true" />
              <span className="hidden md:inline">Nueva venta</span>
            </NavLink>
            <NavLink
              to="/historial-ventas"
              aria-label="Historial de ventas"
              className={({ isActive }) => 
                `text-xs font-bold uppercase tracking-wider px-3 py-2.5 rounded-2xl transition-all duration-200 flex items-center space-x-1.5 border focus-visible:ring-2 focus-visible:ring-brand-500 outline-none ${
                  isActive 
                    ? 'bg-brand-50 text-brand-700 border-brand-100/50' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'
                }`
              }
            >
              <FileText className="w-4 h-4 text-brand-600" aria-hidden="true" />
              <span className="hidden md:inline">Historial de ventas</span>
            </NavLink>
            <NavLink
              to="/kardex"
              aria-label="Movimientos de inventario"
              className={({ isActive }) => 
                `text-xs font-bold uppercase tracking-wider px-3 py-2.5 rounded-2xl transition-all duration-200 flex items-center space-x-1.5 border focus-visible:ring-2 focus-visible:ring-brand-500 outline-none ${
                  isActive 
                    ? 'bg-brand-50 text-brand-700 border-brand-100/50' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'
                }`
              }
            >
              <History className="w-4 h-4 text-brand-600" aria-hidden="true" />
              <span className="hidden md:inline">Movimientos</span>
            </NavLink>
            {role === 'admin' && (
              <NavLink
                to="/usuarios"
                aria-label="Gestión de equipo"
                className={({ isActive }) => 
                  `text-xs font-bold uppercase tracking-wider px-3 py-2.5 rounded-2xl transition-all duration-200 flex items-center space-x-1.5 border focus-visible:ring-2 focus-visible:ring-brand-500 outline-none ${
                    isActive 
                      ? 'bg-brand-50 text-brand-700 border-brand-100/50' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'
                  }`
                }
              >
                <Users className="w-4 h-4 text-brand-600" aria-hidden="true" />
                <span className="hidden md:inline">Equipo</span>
              </NavLink>
            )}
          </div>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div className="text-left hidden sm:block">
              <span className="block text-xs font-semibold text-slate-700 max-w-[150px] truncate leading-tight">
                {user?.email}
              </span>
              <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 ${
                role === 'admin' 
                  ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                  : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              }`}>
                {role === 'admin' ? 'Administrador' : 'Empleado'}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 active:scale-95 transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            title="Cerrar Sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>

        </div>
      </div>
    </nav>
  )
}
