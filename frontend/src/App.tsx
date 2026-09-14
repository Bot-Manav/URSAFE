import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import CaseDetail from './pages/CaseDetail'
import AuditLogs from './pages/AuditLogs'
import UsersDirectory from './pages/UsersDirectory'
import PendingUsers from './pages/PendingUsers'
import SecuritySettings from './pages/SecuritySettings'

import AdminSearch from './pages/AdminSearch'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/cases/:caseId" element={<CaseDetail />} />
              <Route path="/audit" element={<AuditLogs />} />
              <Route path="/users" element={<UsersDirectory />} />
              <Route path="/admin/pending" element={<PendingUsers />} />
              <Route path="/admin/search" element={<AdminSearch />} />
              <Route path="/security" element={<SecuritySettings />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
