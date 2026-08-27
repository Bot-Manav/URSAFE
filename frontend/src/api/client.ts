import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

/**
 * SECURITY NOTE: the JWT is kept in sessionStorage (cleared when the tab
 * closes), not localStorage. This is a deliberate tradeoff for the MVP:
 * - sessionStorage/localStorage are both readable by any script that runs
 *   on the page, so an XSS bug can still steal the token either way. React
 *   escapes rendered output by default (see components - no
 *   dangerouslySetInnerHTML anywhere in this app), which is the actual XSS
 *   defense; token storage location is a secondary control.
 * - The more robust production pattern is an httpOnly, Secure, SameSite
 *   cookie set by the server - but that reintroduces CSRF and requires
 *   the backend to switch out of pure stateless-bearer mode. Documented
 *   as a follow-up in README "Hardening for production".
 */
const TOKEN_KEY = 'dms_token'

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY)
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
})

apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
