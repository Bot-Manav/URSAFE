import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
          <span className="role-badge">{user?.role.replaceAll('_', ' ')}</span>
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
      </main>
    </div>
  )
}
