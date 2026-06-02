import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth()

  if (loading) {
    return null; // El AuthProvider ya maneja el spinner general
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirigir a la raíz si no tiene el rol necesario
    return <Navigate to="/" replace />
  }

  return children
}
