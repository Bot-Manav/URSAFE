import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, User, Mail, Lock, AlertCircle, ArrowRight, Briefcase } from 'lucide-react'
import { useAuth, Role } from '../context/AuthContext'
import { ThemeToggle } from '../components/ThemeToggle'

const ROLES: { id: Role; label: string; description: string }[] = [
  {
    id: 'INVESTIGATION_OFFICER',
    label: 'Investigation Officer',
    description: 'Lead cases, upload initial evidence & field reports',
  },
  {
    id: 'LAW_ENFORCEMENT',
    label: 'Law Enforcement',
    description: 'Open cases, log FIR statements & custody documents',
  },
  {
    id: 'FORENSIC_OFFICER',
    label: 'Forensic Analyst',
    description: 'Inspect document tampering, add forensic reports',
  },
  {
    id: 'LEGAL_COURT',
    label: 'Court / Legal Counsel',
    description: 'Review case timelines and submitted court records',
  },
]

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
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>

      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <div className="auth-header">
          <div className="auth-logo">
            <ShieldCheck size={28} />
          </div>
          <h1 className="auth-title">Create Official Account</h1>
          <p className="auth-subtitle">SIH26190 - Secure Document Management System</p>
        </div>

        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={18} />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="fullName">
              Full Official Name
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="fullName"
                type="text"
                required
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="e.g. Insp. Rajesh Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <User
                size={18}
                style={{
                  position: 'absolute',
                  left: '0.8rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Official Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="email"
                type="email"
                required
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="officer@police.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
              <Mail
                size={18}
                style={{
                  position: 'absolute',
                  left: '0.8rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type="password"
                required
                minLength={12}
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Minimum 12 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '0.8rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
            <span className="form-hint">Must include uppercase, lowercase, digit, and special character.</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="role">
              Departmental Role
            </label>
            <div style={{ position: 'relative' }}>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="form-select"
                style={{ paddingLeft: '2.5rem' }}
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
              <Briefcase
                size={18}
                style={{
                  position: 'absolute',
                  left: '0.8rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              {ROLES.find((r) => r.id === role)?.description}
            </p>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', marginTop: '1rem' }}
          >
            <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
            {!loading && <ArrowRight size={16} />}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Already registered?{' '}
            <Link to="/login" style={{ fontWeight: 600 }}>
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
