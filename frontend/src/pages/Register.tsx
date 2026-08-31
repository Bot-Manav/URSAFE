import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, Role } from '../context/AuthContext'

const ROLES: Role[] = ['LAW_ENFORCEMENT', 'INVESTIGATION_OFFICER', 'FORENSIC_OFFICER', 'LEGAL_COURT']
// Note: ADMIN is intentionally excluded here. The backend independently
// refuses ADMIN self-registration too - this is UX convenience, not the
// security control.

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('INVESTIGATION_OFFICER')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await register(email, fullName, password, role)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Secure DMS</h1>
        <p className="subtitle">Create account</p>
        {error && <div className="error-banner">{error}</div>}
        <label>
          Full name
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </label>
        <label>
          Password
          <input type="password" required minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <span className="hint">12+ characters, upper, lower, digit, symbol</span>
        </label>
        <label>
          Role
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
          </select>
        </label>
        <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Register'}</button>
        <p className="switch-link">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  )
}
