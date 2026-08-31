import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { apiClient } from '../api/client'
import { useAuth } from '../context/AuthContext'

interface CaseSummary {
  id: string
  caseNumber: string
  title: string
  description?: string
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [caseNumber, setCaseNumber] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [mfaSetup, setMfaSetup] = useState<{ qrCodeUri: string; manualCode: string } | null>(null)
  const [mfaConfirmCode, setMfaConfirmCode] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)

  async function handleSetupMfa() {
    setError(null)
    setMfaLoading(true)
    try {
      const { data } = await apiClient.post('/api/auth/setup-mfa')
      setMfaSetup(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not initiate MFA setup')
    } finally {
      setMfaLoading(false)
    }
  }

  async function handleConfirmMfa(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMfaLoading(true)
    try {
      await apiClient.post('/api/auth/confirm-mfa', { code: mfaConfirmCode })
      alert('MFA Enabled Successfully!')
      setMfaSetup(null)
      setMfaConfirmCode('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid MFA code')
    } finally {
      setMfaLoading(false)
    }
  }

  const canCreateCase = user?.role === 'ADMIN' || user?.role === 'LAW_ENFORCEMENT' || user?.role === 'INVESTIGATION_OFFICER'

  async function loadCases() {
    setLoading(true)
    try {
      const { data } = await apiClient.get<CaseSummary[]>('/api/cases')
      setCases(data)
    } catch {
      setError('Could not load cases')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCases()
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await apiClient.post('/api/cases', { caseNumber, title, description: '' })
      setCaseNumber('')
      setTitle('')
      loadCases()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not create case')
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <strong>Secure DMS</strong>
          <span className="role-badge">{user?.role.replace(/_/g, ' ')}</span>
        </div>
        <div>
          <span>{user?.fullName}</span>
          <button className="link-btn" onClick={logout}>Log out</button>
        </div>
      </header>

      <main>
        {canCreateCase && (
          <section className="card">
            <h2>New case</h2>
            <form className="inline-form" onSubmit={handleCreate}>
              <input placeholder="Case number" required value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} />
              <input placeholder="Title" required value={title} onChange={(e) => setTitle(e.target.value)} />
              <button type="submit">Create</button>
            </form>
          </section>
        )}

        {error && <div className="error-banner">{error}</div>}

        <section className="card">
          <h2>Your cases</h2>
          {loading ? (
            <p>Loading...</p>
          ) : cases.length === 0 ? (
            <p>No cases yet. {canCreateCase ? 'Create one above.' : 'Ask an admin to grant you access.'}</p>
          ) : (
            <ul className="case-list">
              {cases.map((c) => (
                <li key={c.id}>
                  <Link to={`/cases/${c.id}`}>
                    <strong>{c.caseNumber}</strong> - {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        
        <section className="card">
          <h2>Security</h2>
          {!mfaSetup ? (
             <button onClick={handleSetupMfa} disabled={mfaLoading}>
               {mfaLoading ? 'Loading...' : 'Set up Multi-Factor Authentication'}
             </button>
          ) : (
             <div>
                <p>Scan this QR code with your authenticator app:</p>
                <div style={{ margin: '16px 0', padding: '16px', background: 'white', display: 'inline-block' }}>
                   <QRCodeSVG value={mfaSetup.qrCodeUri} size={200} />
                </div>
                <form className="inline-form" onSubmit={handleConfirmMfa}>
                   <input 
                      placeholder="6-digit code" 
                      required 
                      value={mfaConfirmCode} 
                      onChange={e => setMfaConfirmCode(e.target.value)}
                      maxLength={6} 
                      pattern="\d{6}" 
                   />
                   <button type="submit" disabled={mfaLoading}>
                      {mfaLoading ? 'Verifying...' : 'Verify & Enable'}
                   </button>
                </form>
             </div>
          )}
        </section>
      </main>
    </div>
  )
}
