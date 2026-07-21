import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({
  user: null,
  profile: null,
  role: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  signUp: async () => {},
})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authInitialized, setAuthInitialized] = useState(false)

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, full_name, active, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  useEffect(() => {
    let active = true

    // Este callback debe permanecer síncrono. Una consulta a Supabase dentro
    // de onAuthStateChange puede esperar el mismo bloqueo interno de Auth.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return
        const nextUser = session?.user ?? null
        setUser(nextUser)
        setLoading(Boolean(nextUser))
        if (!nextUser) {
          setProfile(null)
          setRole(null)
        }
        setAuthInitialized(true)
      }
    )

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [])

  const userId = user?.id

  useEffect(() => {
    if (!authInitialized || !userId) return

    let active = true

    const loadProfile = async () => {
      try {
        const data = await fetchProfile(userId)
        if (!active) return

        setProfile(data)
        setRole(data?.role ?? null)

        if (!data) {
          console.error('El usuario autenticado no tiene un perfil asociado.')
        }
      } catch (err) {
        console.error('Error al obtener perfil:', err.message)
        if (active) {
          setProfile(null)
          setRole(null)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [authInitialized, userId])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = {
    user,
    profile,
    role,
    loading,
    signIn,
    signOut,
    signUp,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      {loading && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-[2px]">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
            <div className="absolute text-brand-600 font-semibold text-xs uppercase tracking-wider animate-pulse">
              Stock
            </div>
          </div>
          <p className="mt-4 text-slate-500 font-medium text-sm">Preparando todo para ti...</p>
        </div>
      )}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
