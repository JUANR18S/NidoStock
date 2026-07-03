import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth()

  if (loading) {
    return null; // El AuthProvider ya maneja el spinner general
  }

  // 1. Validar que exista usuario
  if (!user || !role) {
    return <Navigate to="/login" replace />
  }

  // 2. Evitar acceso parcial de usuarios autenticados sin perfil (rol nulo/indefinido)
  if (!role) {
    return <Navigate to="/login" replace />
  }

  // 3. Validar rol cuando la ruta lo requiera
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />
  }

  return children
}
