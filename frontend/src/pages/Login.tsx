import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, Lock, Mail, KeyRound, AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from '../components/ThemeToggle'

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
      setError(err.response?.data?.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <ShieldCheck size={28} />
          </div>
          <h1 className="auth-title">Secure DMS</h1>
          <p className="auth-subtitle">
            {isMfaStep ? 'Two-Factor Authentication' : 'Tamper-Evident Document Management System'}
          </p>
        </div>

        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={18} />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isMfaStep ? (
            <>
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
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
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
              </div>
            </>
          ) : (
            <div className="form-group">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  padding: '0.75rem',
                  backgroundColor: 'var(--primary-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--primary-text)',
                  fontSize: '0.85rem',
                }}
              >
                <ShieldAlert size={18} />
                <span>Enter the 6-digit TOTP code from your authenticator app to verify your identity.</span>
              </div>
              <label className="form-label" htmlFor="mfaCode">
                Authenticator Security Code
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="mfaCode"
                  type="text"
                  required
                  autoFocus
                  className="form-input"
                  style={{
                    paddingLeft: '2.5rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.2rem',
                    letterSpacing: '0.2em',
                    textAlign: 'center',
                  }}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="\d{6}"
                  placeholder="000000"
                />
                <KeyRound
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
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', marginTop: '1rem' }}
          >
            <span>{loading ? 'Authenticating...' : isMfaStep ? 'Verify MFA Code' : 'Sign in to Portal'}</span>
            {!loading && <ArrowRight size={16} />}
          </button>

          {!isMfaStep && (
            <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Need an authorized account?{' '}
              <Link to="/register" style={{ fontWeight: 600 }}>
                Register here
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
