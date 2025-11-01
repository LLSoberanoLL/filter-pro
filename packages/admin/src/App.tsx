import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { Projects } from './pages/Projects'
import { Filters } from './pages/Filters'
import { Datasources } from './pages/Datasources'
import { Login } from './pages/Login'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:projectKey/filters" element={<Filters />} />
          <Route path="projects/:projectKey/datasources" element={<Datasources />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App