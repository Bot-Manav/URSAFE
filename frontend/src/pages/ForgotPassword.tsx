import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Mail, ArrowRight, CheckCircle2 } from 'lucide-react'
import { apiClient } from '../api/client'
import { ThemeToggle } from '../components/ThemeToggle'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await apiClient.post('/api/auth/forgot-password', { email })
      // We deliberately ignore the response body to prevent user enumeration
    } catch (err: any) {
      // Ignore errors for security reasons (except maybe network errors, but we keep it simple)
    } finally {
      setLoading(false)
      setSuccess(true)
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>

      <div className="auth-card" style={{ maxWidth: '420px' }}>
        <div className="auth-header">
          <div className="auth-logo">
            <ShieldCheck size={28} />
          </div>
          <h1 className="auth-title">Password Recovery</h1>
          <p className="auth-subtitle">Secure Document Management System</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ color: 'var(--success)', marginBottom: '1rem' }}>
              <CheckCircle2 size={48} style={{ margin: '0 auto' }} />
            </div>
            <h2 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Request Received</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
              If that email is registered, a reset link was sent. Please check your inbox.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ display: 'inline-block', padding: '0.75rem 2rem' }}>
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              Enter your official email address and we'll send you a link to securely reset your password.
            </p>

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
                  autoComplete="email"
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

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !email}
              style={{ width: '100%', padding: '0.75rem', marginTop: '1rem' }}
            >
              <span>{loading ? 'Processing...' : 'Send Reset Link'}</span>
              {!loading && <ArrowRight size={16} />}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.88rem' }}>
              <Link to="/login" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                &larr; Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
