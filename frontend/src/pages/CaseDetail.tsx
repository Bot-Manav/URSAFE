import React, { useEffect, useState, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Briefcase,
  FileText,
  UploadCloud,
  Users,
  Clock,
  Download,
  Eye,
  Plus,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Search,
  MessageSquare,
  Send,
  Loader2,
  RefreshCw,
  X,
  AlertTriangle
} from 'lucide-react'
import { apiClient } from '../api/client'
import { UploadForm } from '../components/UploadForm'
import { StatusBadge } from '../components/StatusBadge'
import { TagBadge } from '../components/TagBadge'
import { RoleBadge } from '../components/RoleBadge'
import { DocumentPreviewModal, DocumentSummary } from '../components/DocumentPreviewModal'
import { useAuth } from '../context/AuthContext'

interface CaseRecord {
  id: string
  caseNumber: string
  title: string
  description: string
  status: 'OPEN' | 'UNDER_INVESTIGATION' | 'CLOSED' | 'ARCHIVED'
}

interface UserSummary {
  id: string
  fullName: string
  email: string
  role: string
}

interface CaseNote {
  id: string
  authorName: string
  body: string
  createdAt: string
}

export default function CaseDetail() {
  const { caseId } = useParams<{ caseId: string }>()
  const { user } = useAuth()
  const [caseData, setCaseData] = useState<CaseRecord | null>(null)
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [notes, setNotes] = useState<CaseNote[]>([])
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState(false)

  // Active Workspace Tab: 'docs' | 'timeline' | 'access'
  const [activeTab, setActiveTab] = useState<'docs' | 'timeline' | 'access'>('docs')

  // Document Filtering & Search
  const [docSearch, setDocSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<string>('ALL')

  // Document Modals
  const [previewDoc, setPreviewDoc] = useState<DocumentSummary | null>(null)
  const [uploadingVersionFor, setUploadingVersionFor] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null)

  // Access Management
  const [roleToGrant, setRoleToGrant] = useState<string>('')
  const [userSearch, setUserSearch] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<UserSummary[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [accessUpdating, setAccessUpdating] = useState(false)

  // Case Notes
  const [newNoteBody, setNewNoteBody] = useState('')
  const [noteSubmitting, setNoteSubmitting] = useState(false)

  async function loadData() {
    if (!caseId) return
    setLoading(true)
    try {
      const [caseRes, docsRes, notesRes] = await Promise.all([
        apiClient.get<CaseRecord>(`/api/cases/${caseId}`),
        apiClient.get<DocumentSummary[]>(`/api/cases/${caseId}/documents`),
        apiClient.get<CaseNote[]>(`/api/cases/${caseId}/notes`).catch(() => ({ data: [] })),
      ])
      setCaseData(caseRes.data)
      setDocuments(docsRes.data)
      setNotes(notesRes.data)
    } catch {
      setError('Could not load case records — you may not have authorization for this case.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [caseId])

  // Debounced User Search for Access Grants
  useEffect(() => {
    if (!userSearch || userSearch.length < 2) {
      setUserSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const { data } = await apiClient.get<UserSummary[]>(`/api/users/search?q=${encodeURIComponent(userSearch)}`)
        setUserSearchResults(data)
      } catch (e) {
        console.error(e)
      } finally {
        setIsSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [userSearch])

  // Get Latest Documents grouped by DocumentGroupID
  const latestDocuments = useMemo(() => {
    const groups = new Map<string, DocumentSummary>()
    documents.forEach((doc) => {
      const existing = groups.get(doc.documentGroupId)
      if (!existing || doc.version > existing.version) {
        groups.set(doc.documentGroupId, doc)
      }
    })
    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )
  }, [documents])

  // Filtered documents for UI
  const filteredDocuments = useMemo(() => {
    return latestDocuments.filter((doc) => {
      const matchesSearch = doc.originalFileName.toLowerCase().includes(docSearch.toLowerCase())
      const matchesTag = tagFilter === 'ALL' || doc.tag === tagFilter
      return matchesSearch && matchesTag
    })
  }, [latestDocuments, docSearch, tagFilter])

  async function handleDownload(doc: DocumentSummary) {
    try {
      const response = await apiClient.get(`/api/documents/${doc.id}/download`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = doc.originalFileName
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      if (err.response?.status === 409) {
        alert('SECURITY INTEGRITY ALERT: SHA-256 verification failed! Document has been tampered with and download is blocked.')
      } else {
        alert('Failed to download document.')
      }
    }
  }

  async function handleDeleteDocument(docId: string) {
    if (!confirm('Are you sure you want to soft-delete this evidentiary record? It will be marked in audit logs.'))
      return
    try {
      await apiClient.delete(`/api/documents/${docId}`)
      setSuccessMessage('Document marked as soft-deleted in chain of custody.')
      setTimeout(() => setSuccessMessage(null), 3500)
      await loadData()
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete document.')
    }
  }

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!caseId) return
    const newStatus = e.target.value
    setStatusUpdating(true)
    try {
      await apiClient.patch(`/api/cases/${caseId}/status`, { status: newStatus })
      setSuccessMessage(`Case status updated to ${newStatus}`)
      setTimeout(() => setSuccessMessage(null), 3000)
      await loadData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update case lifecycle status.')
    } finally {
      setStatusUpdating(false)
    }
  }

  async function handleGrantRole() {
    if (!roleToGrant || !caseId) return
    setAccessUpdating(true)
    try {
      await apiClient.post(`/api/cases/${caseId}/access`, { role: roleToGrant })
      setSuccessMessage(`Granted case access to role: ${roleToGrant.replace(/_/g, ' ')}`)
      setTimeout(() => setSuccessMessage(null), 3500)
      setRoleToGrant('')
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to grant role access.')
    } finally {
      setAccessUpdating(false)
    }
  }

  async function handleGrantUser(userId: string, userName: string) {
    if (!caseId) return
    setAccessUpdating(true)
    try {
      await apiClient.post(`/api/cases/${caseId}/access`, { userId })
      setSuccessMessage(`Granted case access to: ${userName}`)
      setTimeout(() => setSuccessMessage(null), 3500)
      setUserSearch('')
      setUserSearchResults([])
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to grant user access.')
    } finally {
      setAccessUpdating(false)
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!newNoteBody.trim() || !caseId) return
    setNoteSubmitting(true)
    try {
      await apiClient.post(`/api/cases/${caseId}/notes`, { body: newNoteBody })
      setNewNoteBody('')
      setSuccessMessage('Investigation note added to case timeline.')
      setTimeout(() => setSuccessMessage(null), 3000)
      await loadData()
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to log note.')
    } finally {
      setNoteSubmitting(false)
    }
  }

  const handleCopyHash = (id: string, hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedHashId(id)
    setTimeout(() => setCopiedHashId(null), 2000)
  }

  return (
    <div className="page">
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <Link to="/dashboard" className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Case Vault</span>
        </Link>

        <button className="btn btn-secondary btn-sm" onClick={loadData} title="Refresh case records">
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <ShieldAlert size={18} />
          <div>{error}</div>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <ShieldCheck size={18} />
          <div>{successMessage}</div>
        </div>
      )}

      {/* Case Header Card */}
      {caseData && (
        <div className="card" style={{ marginBottom: '1.5rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
            <div style={{ flex: '1 1 400px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  {caseData.caseNumber}
                </span>
                <StatusBadge status={caseData.status} />
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                {caseData.title}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.4 }}>
                {caseData.description || 'No detailed background description provided.'}
              </p>
            </div>

            {/* Lifecycle Status Transition Selector */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                backgroundColor: 'var(--bg-surface-elevated)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Case Lifecycle Transition:
              </label>
              <select
                value={caseData.status}
                onChange={handleStatusChange}
                disabled={statusUpdating}
                className="form-select"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.88rem', fontWeight: 600 }}
              >
                <option value="OPEN">OPEN (Active Intake)</option>
                <option value="UNDER_INVESTIGATION">UNDER_INVESTIGATION (In Field)</option>
                <option value="CLOSED">CLOSED (Proceedings Concluded)</option>
                <option value="ARCHIVED">ARCHIVED (Sealed Record)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'docs' ? 'active' : ''}`}
          onClick={() => setActiveTab('docs')}
        >
          <FileText size={16} />
          <span>Evidentiary Documents ({latestDocuments.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          <Clock size={16} />
          <span>Timeline & Case Notes ({notes.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'access' ? 'active' : ''}`}
          onClick={() => setActiveTab('access')}
        >
          <Users size={16} />
          <span>Access Delegation (BOLA Control)</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: Evidentiary Documents
         ========================================================================= */}
      {activeTab === 'docs' && (
        <div>
          {/* Action Bar & Quick Upload Trigger */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', flex: '1 1 300px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '2.3rem' }}
                    placeholder="Search documents by name..."
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                  />
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                </div>

                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="form-select"
                  style={{ width: 'auto' }}
                >
                  <option value="ALL">All Categories</option>
                  <option value="EVIDENCE">Evidence</option>
                  <option value="REPORT">Reports</option>
                  <option value="STATEMENT">Statements</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowUploadModal(true)}
              >
                <UploadCloud size={16} />
                <span>Upload New Document</span>
              </button>
            </div>
          </div>

          {/* Documents Table */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <FileText size={18} className="text-primary" />
                <span>Secured Documents & Forensics ({filteredDocuments.length})</span>
              </h3>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0' }}>
                <div className="skeleton" style={{ height: '50px', width: '100%' }} />
                <div className="skeleton" style={{ height: '50px', width: '100%' }} />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="empty-state">
                <FileText size={48} className="empty-state-icon" />
                <h4 className="empty-state-title">No documents found</h4>
                <p className="empty-state-text">
                  {docSearch || tagFilter !== 'ALL'
                    ? 'No files matching the active filter.'
                    : 'No documents have been uploaded to this case vault yet.'}
                </p>
                <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
                  <UploadCloud size={16} />
                  Upload First File
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Document Name</th>
                      <th>Category</th>
                      <th>Version</th>
                      <th>File Size</th>
                      <th>SHA-256 Hash</th>
                      <th>Timestamp</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                            <strong
                              style={{
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                              }}
                              onClick={() => setPreviewDoc(doc)}
                              title="Click to preview"
                            >
                              {doc.originalFileName}
                            </strong>
                          </div>
                        </td>
                        <td>
                          <TagBadge tag={doc.tag} />
                        </td>
                        <td>
                          <span className="badge-version">v{doc.version}</span>
                        </td>
                        <td>{(doc.fileSizeBytes / 1024).toFixed(1)} KB</td>
                        <td>
                          <div
                            className="hash-chip"
                            title={doc.sha256Hash}
                            onClick={() => handleCopyHash(doc.id, doc.sha256Hash)}
                            style={{ cursor: 'pointer' }}
                          >
                            <span>{doc.sha256Hash.substring(0, 10)}...</span>
                            {copiedHashId === doc.id ? (
                              <Check size={12} style={{ color: 'var(--success-text)' }} />
                            ) : (
                              <Copy size={12} />
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(doc.uploadedAt).toLocaleString()}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setPreviewDoc(doc)}
                              title="Preview Document"
                            >
                              <Eye size={14} />
                              <span>Preview</span>
                            </button>

                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => handleDownload(doc)}
                              title="Download & Verify Integrity"
                            >
                              <Download size={14} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => setUploadingVersionFor(doc.documentGroupId)}
                              title="Upload New Version"
                            >
                              <Plus size={14} />
                              <span>New Ver</span>
                            </button>

                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteDocument(doc.id)}
                              title="Soft-Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: Timeline & Case Notes
         ========================================================================= */}
      {activeTab === 'timeline' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Clock size={18} className="text-primary" />
              <span>Investigation Chronology & Field Notes</span>
            </h3>
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <form onSubmit={handleAddNote}>
              <div className="form-group">
                <label className="form-label" htmlFor="noteInput">
                  Add Case Log / Investigation Note:
                </label>
                <textarea
                  id="noteInput"
                  rows={3}
                  className="form-textarea"
                  placeholder="Record investigative actions, witness remarks, forensic observations, or legal updates..."
                  value={newNoteBody}
                  onChange={(e) => setNewNoteBody(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={noteSubmitting || !newNoteBody.trim()}
                >
                  {noteSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Logging...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Record Entry</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="timeline">
            {notes.map((note) => (
              <div key={note.id} className="timeline-item">
                <div className="timeline-marker" />
                <div className="timeline-card">
                  <div className="timeline-header">
                    <span className="timeline-author">{note.authorName}</span>
                    <span className="timeline-date">{new Date(note.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="timeline-body">{note.body}</div>
                </div>
              </div>
            ))}

            {notes.length === 0 && (
              <div className="empty-state">
                <MessageSquare size={40} className="empty-state-icon" />
                <h4 className="empty-state-title">No case notes recorded yet</h4>
                <p className="empty-state-text">
                  Write the first entry above to establish the investigation timeline.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: Access Delegation (BOLA Defense)
         ========================================================================= */}
      {activeTab === 'access' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Grant to Department/Role */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Users size={18} className="text-primary" />
                <span>Grant to Department / Role</span>
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Grant all active officers within a specific department access to collaborate on this case.
            </p>

            <div className="form-group">
              <label className="form-label">Select Department Role:</label>
              <select
                className="form-select"
                value={roleToGrant}
                onChange={(e) => setRoleToGrant(e.target.value)}
              >
                <option value="">-- Choose Role --</option>
                <option value="INVESTIGATION_OFFICER">Investigation Officers</option>
                <option value="LAW_ENFORCEMENT">Law Enforcement</option>
                <option value="FORENSIC_OFFICER">Forensic Analysts</option>
                <option value="LEGAL_COURT">Court / Legal Counsel</option>
              </select>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGrantRole}
              disabled={!roleToGrant || accessUpdating}
              style={{ width: '100%' }}
            >
              <span>Grant Team Access</span>
            </button>
          </div>

          {/* Grant to Individual User */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Search size={18} className="text-primary" />
                <span>Grant to Individual Personnel</span>
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Search registered personnel by name or official email address to grant explicit access.
            </p>

            <div className="form-group">
              <label className="form-label">Search Personnel:</label>
              <input
                type="text"
                className="form-input"
                placeholder="Search by name or email (e.g. officer@...)"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>

            {isSearching && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Searching personnel directory...</p>
            )}

            {userSearchResults.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  marginTop: '0.75rem',
                  maxHeight: '260px',
                  overflowY: 'auto',
                }}
              >
                {userSearchResults.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.85rem',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {u.fullName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                      <RoleBadge role={u.role} className="mt-1" />
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleGrantUser(u.id, u.fullName)}
                      disabled={accessUpdating}
                    >
                      <Plus size={14} />
                      <span>Grant</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Document Preview & Integrity Check */}
      <DocumentPreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onDownload={handleDownload}
      />

      {/* Modal: Upload New Document */}
      {showUploadModal && caseId && (
        <div className="modal-backdrop" onClick={() => setShowUploadModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <UploadCloud size={20} className="text-primary" />
                <span>Upload Evidentiary Documents</span>
              </h3>
              <button className="btn-icon" onClick={() => setShowUploadModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <UploadForm
                caseId={caseId}
                onUploaded={() => {
                  setShowUploadModal(false)
                  loadData()
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Upload New Version */}
      {uploadingVersionFor && caseId && (
        <div className="modal-backdrop" onClick={() => setUploadingVersionFor(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <UploadCloud size={20} className="text-primary" />
                <span>Upload Revision / New Version</span>
              </h3>
              <button className="btn-icon" onClick={() => setUploadingVersionFor(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Uploading this document will preserve all previous revisions and increment the version in the chain of custody.
              </p>
              <UploadForm
                caseId={caseId}
                documentGroupId={uploadingVersionFor}
                onUploaded={() => {
                  setUploadingVersionFor(null)
                  loadData()
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
