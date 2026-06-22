import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { 
  Users as UsersIcon, 
  Search, 
  AlertTriangle, 
  ShieldAlert,
  UserCheck, 
  UserX,
  Mail,
  Calendar,
  Lock
} from 'lucide-react'

export const Users = () => {
  const { role } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const loadProfiles = async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setProfiles(data || [])
    } catch (err) {
      console.error(err)
      setError(err.message || 'Error al obtener la lista de usuarios de Supabase.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const init = async () => {
      await Promise.resolve()
      if (!active) return
      if (role === 'admin') {
        loadProfiles()
      }
    }
    init()
    return () => { active = false }
  }, [role])

  // Calcular perfiles filtrados en tiempo de renderizado
  const filteredProfiles = profiles.filter(p => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return true
    return (
      (p.full_name && p.full_name.toLowerCase().includes(term)) ||
      (p.email && p.email.toLowerCase().includes(term))
    )
  })

  // Si el usuario ingresa de alguna forma sin ser admin
  if (role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-100 shadow-xl text-center">
          <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4 animate-pulse" />
          <h3 className="text-xl font-bold text-slate-800">Acceso Restringido</h3>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Solo los administradores autorizados tienen permisos para visualizar y gestionar el panel de usuarios.
          </p>
        </div>
      </div>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha'
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
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
          <span className="bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-purple-200/50 inline-block mb-2">
            Administración del Sistema
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800">
            Control de Usuarios y Roles
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Visualiza y administra el personal con acceso al sistema cosmetológico.
          </p>
        </div>
      </div>

      {/* Alerta de Auditoría RLS (Informativa y de Seguridad) */}
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 text-amber-800 flex items-start space-x-4 mb-8">
        <Lock className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-bold block text-sm">Control de Modificación Protegido</span>
          <p className="text-xs text-amber-700/90 mt-1 leading-relaxed">
            Para mitigar riesgos de seguridad y escalación de privilegios, los controles de edición de roles en la interfaz se encuentran **inhabilitados temporalmente para auditoría**. La reasignación de roles debe hacerse de forma segura ejecutando consultas directas en el SQL Editor de Supabase o mediante la API administrativa en el backend.
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center gap-4 mb-8">
        <div className="relative flex-grow max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre o correo electrónico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-xs font-medium"
          />
        </div>
        <div className="text-xs text-slate-400 font-semibold md:ml-auto">
          Total: {filteredProfiles.length} usuario(s)
        </div>
      </div>

      {/* Estados de Carga, Error y Vacío */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 text-sm font-medium">Obteniendo lista de usuarios...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 text-rose-800 flex items-start space-x-4">
          <AlertTriangle className="w-6 h-6 text-rose-600 mt-0.5" />
          <div>
            <span className="font-bold block text-sm">Error al cargar usuarios</span>
            <p className="text-xs text-rose-700/90 mt-1">{error}</p>
          </div>
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
            <UsersIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No se encontraron usuarios</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm">
            Intenta ajustar los criterios de búsqueda.
          </p>
        </div>
      ) : (
        /* Listado de Usuarios en Tabla */
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Correo Electrónico</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha de Registro</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProfiles.map((profile) => (
                  <tr 
                    key={profile.id} 
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    {/* Nombre y avatar */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                          {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 text-xs block group-hover:text-purple-700 transition-colors">
                            {profile.full_name || 'Sin Nombre Registrado'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-xs text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{profile.email}</span>
                      </div>
                    </td>

                    {/* Rol */}
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                        profile.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {profile.role}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="px-6 py-4">
                      {profile.active ? (
                        <span className="inline-flex items-center space-x-1.5 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Activo</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                          <UserX className="w-3.5 h-3.5" />
                          <span>Inactivo</span>
                        </span>
                      )}
                    </td>

                    {/* Fecha de Registro */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-xs text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(profile.created_at)}</span>
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4 text-right">
                      <span className="text-[10px] text-slate-400 font-semibold italic bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                        Modificar vía SQL/API
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
