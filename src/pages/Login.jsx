import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Sparkles, Eye, EyeOff, Lock, Mail } from 'lucide-react'

export const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, user, role } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && role) {
      navigate('/')
    }
  }, [user, role, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    try {
      await signIn(email, password)
    } catch (err) {
      console.error(err)
      setError(
        err.message === 'Invalid login credentials'
          ? 'El correo o la contraseña no son correctos. Verifica e intenta nuevamente.'
          : 'Ocurrió un error al iniciar sesión. Intenta de nuevo.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    setError('')
    setSuccessMessage('')

    if (!email.trim()) {
      setError('Escribe tu correo electrónico primero para poder recuperar tu contraseña.')
      return
    }

    try {
      setLoading(true)
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`
      })

      if (resetError) throw resetError

      setSuccessMessage('¡Listo! Te enviamos un enlace de recuperación a tu correo electrónico.')
    } catch (err) {
      console.error(err)
      setError('No fue posible enviar el enlace de recuperación. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf8f5] relative overflow-hidden px-4">
      {/* Elementos decorativos de fondo (Estética Premium) */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-50 blur-3xl opacity-70"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gold-50 blur-3xl opacity-60"></div>
      
      <div className="w-full max-w-md bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 relative z-10">
        
        {/* Logo / Encabezado */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-brand-600 to-gold-400 text-white rounded-2xl shadow-lg shadow-brand-200 mb-4 transform hover:rotate-12 transition-transform duration-300">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 font-sans">
            NidoStock
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            Ingresa a tu cuenta para administrar tu negocio
          </p>
        </div>

        {/* Alerta de Error */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-2xl flex items-center animate-fade-in">
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Alerta de Éxito */}
        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm rounded-2xl flex items-center animate-fade-in">
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@cosmetologia.com"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Contraseña
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-[11px] font-bold text-brand-600 hover:text-brand-700 hover:underline transition-colors focus:outline-none"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-semibold rounded-2xl shadow-lg shadow-brand-600/20 active:scale-[0.98] transition-all duration-150 text-sm disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Iniciando sesión...
              </span>
            ) : (
              'Iniciar sesión'
            )}
          </button>
          
          <div className="text-center mt-4">
            <p className="text-xs text-slate-400 font-semibold">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-brand-600 hover:text-brand-700 hover:underline font-bold transition-colors">
                Crear cuenta
              </Link>
            </p>
          </div>
        </form>

        {/* Pie de página */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            ¿Necesitas ayuda? Contacta al administrador de tu centro.
          </p>
        </div>
      </div>
    </div>
  )
}
