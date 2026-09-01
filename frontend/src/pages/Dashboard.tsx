import { FormEvent, useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  FolderPlus,
  Search,
  ShieldCheck,
  ShieldAlert,
  Briefcase,
  Clock,
  CheckCircle2,
  Lock,
  ArrowRight,
  Plus,
  X,
  Copy,
  Check,
  Loader2,
  FileText
} from 'lucide-react'
import { apiClient } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { StatusBadge } from '../components/StatusBadge'

interface CaseSummary {
  id: string
  caseNumber: string
  title: string
  description?: string
  status?: 'OPEN' | 'UNDER_INVESTIGATION' | 'CLOSED' | 'ARCHIVED'
}

export default function Dashboard() {
  const { user } = useAuth()
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Create Case Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [caseNumber, setCaseNumber] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  // 2FA Security Setup
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false)
  const [mfaSetup, setMfaSetup] = useState<{ qrCodeUri: string; manualCode: string } | null>(null)
  const [mfaConfirmCode, setMfaConfirmCode] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)

  const canCreateCase =
    user?.role === 'ADMIN' || user?.role === 'LAW_ENFORCEMENT' || user?.role === 'INVESTIGATION_OFFICER'

  async function loadCases() {
    setLoading(true)
    try {
      const { data } = await apiClient.get<CaseSummary[]>('/api/cases')
      setCases(data)
    } catch {
      setError('Could not load assigned cases. Please refresh or verify server status.')
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
    setCreateLoading(true)
    try {
      await apiClient.post('/api/cases', { caseNumber, title, description })
      setCaseNumber('')
      setTitle('')
      setDescription('')
      setIsCreateModalOpen(false)
      loadCases()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not create case.')
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleStartMfaSetup() {
    setError(null)
    setMfaLoading(true)
    try {
      const { data } = await apiClient.post('/api/auth/setup-mfa')
      setMfaSetup(data)
      setIsMfaModalOpen(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not initiate MFA setup.')
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
      setIsMfaModalOpen(false)
      setMfaSetup(null)
      setMfaConfirmCode('')
      alert('Two-Factor Authentication has been successfully enabled!')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid 6-digit MFA code. Please try again.')
    } finally {
      setMfaLoading(false)
    }
  }

  const handleCopyKey = () => {
    if (mfaSetup?.manualCode) {
      navigator.clipboard.writeText(mfaSetup.manualCode)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    }
  }

  // Filtered cases
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const matchesSearch =
        c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesStatus =
        statusFilter === 'ALL' || (c.status && c.status === statusFilter) || (!c.status && statusFilter === 'OPEN')

      return matchesSearch && matchesStatus
    })
  }, [cases, searchTerm, statusFilter])

  // Statistics calculation
  const totalCount = cases.length
  const activeCount = cases.filter((c) => !c.status || c.status === 'OPEN' || c.status === 'UNDER_INVESTIGATION').length
  const closedCount = cases.filter((c) => c.status === 'CLOSED' || c.status === 'ARCHIVED').length

  return (
    <div className="page">
      {/* Top Welcome Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Case Vault & Evidence Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
            Logged in as <strong style={{ color: 'var(--text-primary)' }}>{user?.fullName}</strong> — Tamper-evident secure repository
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleStartMfaSetup}
            disabled={mfaLoading}
          >
            <ShieldCheck size={16} style={{ color: 'var(--primary)' }} />
            <span>{mfaLoading ? 'Loading 2FA...' : 'Security & 2FA'}</span>
          </button>

          {canCreateCase && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={16} />
              <span>Create New Case</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <ShieldAlert size={18} />
          <div>{error}</div>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <Briefcase size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{totalCount}</span>
            <span className="stat-label">Accessible Cases</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <Clock size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{activeCount}</span>
            <span className="stat-label">Active Investigations</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{closedCount}</span>
            <span className="stat-label">Resolved / Archived</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon info">
            <Lock size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--success-text)' }}>
              AES-256 / SHA-256
            </span>
            <span className="stat-label">Vault Integrity Active</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search by Case Number, Title, or Description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Cases' },
              { id: 'OPEN', label: 'Open' },
              { id: 'UNDER_INVESTIGATION', label: 'In Progress' },
              { id: 'CLOSED', label: 'Closed' },
              { id: 'ARCHIVED', label: 'Archived' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`btn btn-sm ${statusFilter === f.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cases List */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <Briefcase size={20} className="text-primary" />
            <span>Assigned Legal & Investigative Records ({filteredCases.length})</span>
          </h2>
          {canCreateCase && (
            <button className="btn btn-outline btn-sm" onClick={() => setIsCreateModalOpen(true)}>
              <FolderPlus size={14} />
              <span>New Record</span>
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0' }}>
            <div className="skeleton" style={{ height: '60px', width: '100%' }} />
            <div className="skeleton" style={{ height: '60px', width: '100%' }} />
            <div className="skeleton" style={{ height: '60px', width: '100%' }} />
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} className="empty-state-icon" />
            <h3 className="empty-state-title">
              {searchTerm || statusFilter !== 'ALL' ? 'No matching cases found' : 'No cases assigned yet'}
            </h3>
            <p className="empty-state-text">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or filter options.'
                : canCreateCase
                ? 'Get started by creating your first case file.'
                : 'Ask an administrator or investigating officer to grant you access.'}
            </p>
            {canCreateCase && (
              <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                <Plus size={16} />
                Create New Case
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case Identifier</th>
                  <th>Title & Description</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          backgroundColor: 'var(--bg-surface-elevated)',
                          padding: '0.25rem 0.55rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {c.caseNumber}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{c.title}</strong>
                        {c.description && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            {c.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={c.status || 'OPEN'} />
                    </td>
                    <td>
                      <Link to={`/cases/${c.id}`} className="btn btn-primary btn-sm">
                        <span>Open Workspace</span>
                        <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create New Case */}
      {isCreateModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <FolderPlus size={20} className="text-primary" />
                <span>Open New Case Record</span>
              </h3>
              <button className="btn-icon" onClick={() => setIsCreateModalOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="caseNumber">
                    Official Case ID / FIR Number *
                  </label>
                  <input
                    id="caseNumber"
                    type="text"
                    required
                    placeholder="e.g. CR-2026-0891"
                    className="form-input"
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value)}
                  />
                  <span className="form-hint">Unique identifier for legal and evidentiary tracking.</span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="title">
                    Case Subject / Title *
                  </label>
                  <input
                    id="title"
                    type="text"
                    required
                    placeholder="e.g. Cyber Fraud & Identity Theft Investigation"
                    className="form-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="description">
                    Initial Case Summary (Optional)
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    placeholder="Brief background or incident overview..."
                    className="form-textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createLoading}>
                  {createLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Record</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: MFA Setup */}
      {isMfaModalOpen && mfaSetup && (
        <div className="modal-backdrop" onClick={() => setIsMfaModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <ShieldCheck size={20} className="text-primary" />
                <span>Configure Multi-Factor Authentication</span>
              </h3>
              <button className="btn-icon" onClick={() => setIsMfaModalOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmMfa}>
              <div className="modal-body" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Scan the QR code below using Google Authenticator, Authy, or your enterprise TOTP app.
                </p>

                <div
                  style={{
                    display: 'inline-block',
                    padding: '1rem',
                    backgroundColor: '#ffffff',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--border-subtle)',
                    marginBottom: '1.25rem',
                  }}
                >
                  <QRCodeSVG value={mfaSetup.qrCodeUri} size={180} />
                </div>

                {mfaSetup.manualCode && (
                  <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>
                      Can't scan? Enter this key manually:
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <code
                        style={{
                          flex: 1,
                          padding: '0.45rem 0.65rem',
                          backgroundColor: 'var(--bg-surface-elevated)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.85rem',
                        }}
                      >
                        {mfaSetup.manualCode}
                      </code>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopyKey}>
                        {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ textAlign: 'left' }}>
                  <label className="form-label" htmlFor="mfaConfirm">
                    Enter the 6-Digit Code from Authenticator:
                  </label>
                  <input
                    id="mfaConfirm"
                    type="text"
                    required
                    autoFocus
                    placeholder="000000"
                    maxLength={6}
                    pattern="\d{6}"
                    className="form-input"
                    style={{
                      textAlign: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '1.25rem',
                      letterSpacing: '0.25em',
                    }}
                    value={mfaConfirmCode}
                    onChange={(e) => setMfaConfirmCode(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsMfaModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={mfaLoading || mfaConfirmCode.length !== 6}>
                  {mfaLoading ? 'Verifying...' : 'Verify & Enable 2FA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
