import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, verifyMfa } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [isMfaStep, setIsMfaStep] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (!isMfaStep) {
        const result = await login(email, password)
        if (result.mfaRequired) {
          setIsMfaStep(true)
        } else {
          navigate('/dashboard')
        }
      } else {
        await verifyMfa(mfaCode)
        navigate('/dashboard')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Secure DMS</h1>
        <p className="subtitle">Sign in</p>
        {error && <div className="error-banner">{error}</div>}
        
        {!isMfaStep ? (
          <>
            <label>
              Email
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </label>
            <label>
              Password
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </label>
          </>
        ) : (
          <label>
            MFA Code
            <input type="text" required value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} autoComplete="one-time-code" maxLength={6} pattern="\d{6}" placeholder="6-digit code" />
          </label>
        )}

        <button type="submit" disabled={loading}>{loading ? 'Signing in...' : (isMfaStep ? 'Verify Code' : 'Sign in')}</button>
        {!isMfaStep && <p className="switch-link">No account? <Link to="/register">Register</Link></p>}
      </form>
    </div>
  )
}
