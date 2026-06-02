import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { 
  TrendingUp, 
  Layers, 
  Tag, 
  Users, 
  Calendar, 
  AlertTriangle, 
  ShieldCheck, 
  Terminal,
  Database
} from 'lucide-react'

export const Dashboard = () => {
  const { user, role } = useAuth()
  const [categories, setCategories] = useState([])
  const [loadingCats, setLoadingCats] = useState(true)
  const [dbError, setDbError] = useState(false)

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCats(true)
        const { data, error } = await supabase
          .from('product_categories')
          .select('*')
          .order('name', { ascending: true })

        if (error) {
          console.error(error)
          setDbError(true)
        } else {
          setCategories(data || [])
          setDbError(false)
        }
      } catch (err) {
        console.error(err)
        setDbError(true)
      } finally {
        setLoadingCats(false)
      }
    }

    loadCategories()
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      
      {/* Banner de Bienvenida */}
      <div className="bg-gradient-to-r from-brand-700 via-brand-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-slate-200 relative overflow-hidden mb-8">
        <div className="absolute right-0 top-0 translate-x-[20%] translate-y-[-20%] w-[300px] h-[300px] rounded-full bg-white/5 blur-3xl"></div>
        <div className="relative z-10">
          <span className="bg-white/10 text-brand-100 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-white/10 inline-block mb-3">
            Sesión Activa
          </span>
          <h2 className="text-3xl font-bold tracking-tight">
            ¡Hola, {user?.email?.split('@')[0]}!
          </h2>
          <p className="text-brand-100/80 text-sm mt-1 max-w-xl">
            Bienvenido al panel de control de Stock Cosmetológico. Tienes permisos de{' '}
            <strong className="text-white underline decoration-gold-300">
              {role === 'admin' ? 'Administrador completo' : 'Empleado de punto de venta'}
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
                <span className="text-2xl font-bold text-slate-800">42</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gold-50 text-gold-600 flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Lotes Activos</span>
                <span className="text-2xl font-bold text-slate-800">18</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Ventas (Mes)</span>
                <span className="text-2xl font-bold text-slate-800">$1,240.00</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Roles Activos</span>
                <span className="text-2xl font-bold text-slate-800">2 (Admin)</span>
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
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Mis Ventas de Hoy</span>
                <span className="text-2xl font-bold text-slate-800">$340.00 (4 Transacciones)</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Lotes por Vencer</span>
                <span className="text-2xl font-bold text-slate-800">3 Lotes</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Clientes</span>
                <span className="text-2xl font-bold text-slate-800">12</span>
              </div>
            </div>
          </>
        )}

      </div>

      {/* Sección de Categorías Integrada con Supabase */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-9 h-9 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 leading-tight">Categorías en la Base de Datos</h3>
            <p className="text-xs text-slate-400 font-medium">Categorías iniciales cargadas dinámicamente desde Supabase</p>
          </div>
        </div>

        {loadingCats ? (
          <div className="flex items-center space-x-2 py-4">
            <div className="w-4 h-4 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
            <span className="text-xs text-slate-400 font-medium">Obteniendo categorías...</span>
          </div>
        ) : dbError ? (
          <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800">
            <div className="flex items-start space-x-3">
              <Database className="w-6 h-6 mt-0.5 text-amber-600" />
              <div>
                <span className="font-semibold block text-sm">¿Aún no has conectado la Base de Datos?</span>
                <p className="text-xs text-amber-700/90 mt-1 max-w-xl leading-relaxed">
                  Para sincronizar las categorías dinámicas, crea un proyecto en Supabase, ejecuta el contenido de{' '}
                  <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">supabase_schema.sql</code>{' '}
                  en la consola SQL, y configura tus claves en el archivo <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">.env</code>.
                </p>
              </div>
            </div>
          </div>
        ) : categories.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 font-medium">No se encontraron categorías cargadas.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <div 
                key={cat.id} 
                className="bg-slate-50 hover:bg-brand-50 border border-slate-100 hover:border-brand-100 px-4 py-3 rounded-2xl text-center group transition-all duration-200"
              >
                <span className="text-xs font-bold text-slate-600 group-hover:text-brand-700 transition-colors">
                  {cat.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reglas de Trazabilidad y Seguridad (Informativo) */}
      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200/50">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-9 h-9 bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center">
            <Terminal className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Reglas de Negocio Aplicadas en Base de Datos</h3>
        </div>
        <ul className="text-xs text-slate-500 space-y-2 leading-relaxed">
          <li className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full"></span>
            <span><strong>Sin Eliminaciones Físicas</strong>: Las ventas y movimientos no se pueden eliminar.</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full"></span>
            <span><strong>Kardex Auditor</strong>: Toda entrada, salida o ajuste sensible requiere el registro del ID del usuario.</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full"></span>
            <span><strong>Restricción del Empleado</strong>: Los empleados tienen bloqueo RLS para actualizar precios y registrar stock directo.</span>
          </li>
        </ul>
      </div>

    </div>
  )
}
