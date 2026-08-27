import { createContext, useContext, useState, ReactNode } from 'react'
import { apiClient, setToken, clearToken, getToken } from '../api/client'

export type Role =
  | 'LAW_ENFORCEMENT'
  | 'INVESTIGATION_OFFICER'
  | 'FORENSIC_OFFICER'
  | 'LEGAL_COURT'
  | 'ADMIN'

interface AuthUser {
  userId: string
  email: string
  fullName: string
  role: Role
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, fullName: string, password: string, role: Role) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)

  async function login(email: string, password: string) {
    const { data } = await apiClient.post('/api/auth/login', { email, password })
    setToken(data.token)
    setUser({ userId: data.userId, email: data.email, fullName: data.fullName, role: data.role })
  }

  async function register(email: string, fullName: string, password: string, role: Role) {
    const { data } = await apiClient.post('/api/auth/register', { email, fullName, password, role })
    setToken(data.token)
    setUser({ userId: data.userId, email: data.email, fullName: data.fullName, role: data.role })
  }

  function logout() {
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!getToken(), login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
