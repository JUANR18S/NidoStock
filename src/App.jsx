import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Users } from './pages/Users'
import { Navbar } from './components/Navbar'
import { Dashboard } from './pages/Dashboard'
import { Products } from './pages/Products'
import { Kardex } from './pages/Kardex'
import Sales from './pages/Sales'
import SalesHistory from './pages/SalesHistory'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'employee']}>
                <div className="min-h-screen flex flex-col bg-slate-50">
                  <Navbar />
                  <main className="flex-grow">
                    <Dashboard />
                  </main>
                </div>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/productos" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'employee']}>
                <div className="min-h-screen flex flex-col bg-slate-50">
                  <Navbar />
                  <main className="flex-grow">
                    <Products />
                  </main>
                </div>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ventas" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'employee']}>
                <div className="min-h-screen flex flex-col bg-slate-50">
                  <Navbar />
                  <main className="flex-grow">
                    <Sales />
                  </main>
                </div>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/historial-ventas" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'employee']}>
                <div className="min-h-screen flex flex-col bg-slate-50">
                  <Navbar />
                  <main className="flex-grow">
                    <SalesHistory />
                  </main>
                </div>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/kardex" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'employee']}>
                <div className="min-h-screen flex flex-col bg-slate-50">
                  <Navbar />
                  <main className="flex-grow">
                    <Kardex />
                  </main>
                </div>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/usuarios" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <div className="min-h-screen flex flex-col bg-slate-50">
                  <Navbar />
                  <main className="flex-grow">
                    <Users />
                  </main>
                </div>
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
