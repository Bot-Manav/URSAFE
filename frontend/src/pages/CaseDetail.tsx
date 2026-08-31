import { useEffect, useState, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiClient } from '../api/client'
import { UploadForm } from '../components/UploadForm'

import { useAuth } from '../context/AuthContext'

interface DocumentSummary {
  id: string
  originalFileName: string
  contentType: string
  fileSizeBytes: number
  sha256Hash: string
  uploadedAt: string
  version: number
  documentGroupId: string
  tag: string
}

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
  const [loading, setLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState(false)

  const [roleToGrant, setRoleToGrant] = useState<string>('')
  const [userSearch, setUserSearch] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<UserSummary[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [accessUpdating, setAccessUpdating] = useState(false)

  const [newNoteBody, setNewNoteBody] = useState('')
  const [noteSubmitting, setNoteSubmitting] = useState(false)
  const [uploadingVersionFor, setUploadingVersionFor] = useState<string | null>(null)

  async function loadData() {
    if (!caseId) return
    setLoading(true)
    try {
      const [caseRes, docsRes, notesRes] = await Promise.all([
        apiClient.get<CaseRecord>(`/api/cases/${caseId}`),
        apiClient.get<DocumentSummary[]>(`/api/cases/${caseId}/documents`),
        apiClient.get<CaseNote[]>(`/api/cases/${caseId}/notes`).catch(() => ({ data: [] }))
      ])
      setCaseData(caseRes.data)
      setDocuments(docsRes.data)
      setNotes(notesRes.data)
    } catch {
      setError('Could not load case data - you may not have access to this case')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId])

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

  const latestDocuments = useMemo(() => {
    const groups = new Map<string, DocumentSummary>()
    documents.forEach(doc => {
      const existing = groups.get(doc.documentGroupId)
      if (!existing || doc.version > existing.version) {
        groups.set(doc.documentGroupId, doc)
      }
    })
    return Array.from(groups.values()).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
  }, [documents])

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
        alert('Integrity check failed - this document may have been tampered with. Download blocked.')
      } else {
        alert('Download failed')
      }
    }
  }

  async function handleDeleteDocument(docId: string) {
    if (!confirm('Are you sure you want to soft-delete this document?')) return
    try {
      await apiClient.delete(`/api/documents/${docId}`)
      await loadData()
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete document')
    }
  }

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!caseId) return
    const newStatus = e.target.value
    setStatusUpdating(true)
    try {
      await apiClient.patch(`/api/cases/${caseId}/status`, { status: newStatus })
      await loadData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status')
    } finally {
      setStatusUpdating(false)
    }
  }

  async function handleGrantRole() {
    if (!roleToGrant || !caseId) return
    setAccessUpdating(true)
    try {
      await apiClient.post(`/api/cases/${caseId}/access`, { role: roleToGrant })
      alert('Granted access to role successfully')
      setRoleToGrant('')
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to grant access')
    } finally {
      setAccessUpdating(false)
    }
  }

  async function handleGrantUser(userId: string) {
    if (!caseId) return
    setAccessUpdating(true)
    try {
      await apiClient.post(`/api/cases/${caseId}/access`, { userId })
      alert('Granted access to user successfully')
      setUserSearch('')
      setUserSearchResults([])
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to grant access')
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
      await loadData()
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to add note')
    } finally {
      setNoteSubmitting(false)
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/dashboard">&larr; Back to cases</Link>
      </header>

      <main>
        {caseData && (
          <section className="card" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: '0 0 0.5rem 0' }}>Case: {caseData.caseNumber}</h1>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>{caseData.title}</h3>
              <p style={{ margin: 0, color: '#666' }}>{caseData.description}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ 
                  padding: '4px 8px', 
                  borderRadius: '4px', 
                  backgroundColor: '#e2e8f0', 
                  fontWeight: 'bold',
                  fontSize: '0.9em'
                }}>
                  {caseData.status}
                </span>
              </div>
              <select 
                value={caseData.status} 
                onChange={handleStatusChange} 
                disabled={statusUpdating}
                style={{ padding: '4px' }}
              >
                <option value="OPEN">OPEN</option>
                <option value="UNDER_INVESTIGATION">UNDER_INVESTIGATION</option>
                <option value="CLOSED">CLOSED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </section>
        )}

        <section className="card">
          <h2>Manage Access</h2>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px' }}>
              <h3>Grant by Role</h3>
              <div className="inline-form" style={{ marginTop: '0.5rem' }}>
                <select value={roleToGrant} onChange={e => setRoleToGrant(e.target.value)}>
                  <option value="">-- Select Role --</option>
                  {['LAW_ENFORCEMENT', 'INVESTIGATION_OFFICER', 'FORENSIC_OFFICER', 'LEGAL_COURT'].map(r => (
                    <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                  ))}
                </select>
                <button onClick={handleGrantRole} disabled={!roleToGrant || accessUpdating}>Grant Team</button>
              </div>
            </div>
            
            <div style={{ flex: '1 1 300px' }}>
              <h3>Grant to Individual</h3>
              <div className="inline-form" style={{ marginTop: '0.5rem' }}>
                <input 
                  placeholder="Search name or email..." 
                  value={userSearch} 
                  onChange={e => setUserSearch(e.target.value)} 
                />
              </div>
              {isSearching && <p style={{ fontSize: '0.8em', color: '#666', marginTop: '0.5rem' }}>Searching...</p>}
              {userSearchResults.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, marginTop: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}>
                  {userSearchResults.map(u => (
                    <li key={u.id} style={{ padding: '0.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{u.fullName}</strong> <span style={{ fontSize: '0.9em', color: '#666' }}>({u.email})</span>
                        <div style={{ fontSize: '0.8em', color: '#888' }}>{u.role.replace(/_/g, ' ')}</div>
                      </div>
                      <button onClick={() => handleGrantUser(u.id)} disabled={accessUpdating} style={{ padding: '4px 8px', fontSize: '0.9em' }}>Grant</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="card">
          <h2>Case Timeline & Notes</h2>
          <div className="notes-list" style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {notes.map(note => (
              <div key={note.id} style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9em', color: '#64748b' }}>
                  <strong>{note.authorName}</strong>
                  <span>{new Date(note.createdAt).toLocaleString()}</span>
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{note.body}</div>
              </div>
            ))}
            {notes.length === 0 && <p style={{ color: '#666' }}>No notes yet.</p>}
          </div>
          <form onSubmit={handleAddNote}>
            <textarea 
              value={newNoteBody} 
              onChange={e => setNewNoteBody(e.target.value)} 
              placeholder="Add a new note..."
              style={{ width: '100%', minHeight: '80px', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <button type="submit" disabled={noteSubmitting || !newNoteBody.trim()}>
              {noteSubmitting ? 'Saving...' : 'Add Note'}
            </button>
          </form>
        </section>

        <section className="card">
          <h2>Upload document</h2>
          {caseId && <UploadForm caseId={caseId} onUploaded={loadData} />}
        </section>

        {error && <div className="error-banner">{error}</div>}

        <section className="card">
          <h2>Documents</h2>
          {loading ? (
            <p>Loading...</p>
          ) : latestDocuments.length === 0 ? (
            <p>No documents uploaded yet.</p>
          ) : (
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Tag</th>
                  <th>Version</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {latestDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.originalFileName}</td>
                    <td>{doc.tag}</td>
                    <td>v{doc.version}</td>
                    <td>{(doc.fileSizeBytes / 1024).toFixed(1)} KB</td>
                    <td>{new Date(doc.uploadedAt).toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleDownload(doc)}>Download</button>
                          <button onClick={() => setUploadingVersionFor(doc.documentGroupId)}>New Version</button>
                          <button onClick={() => handleDeleteDocument(doc.id)} style={{ backgroundColor: '#ef4444', color: 'white' }}>Delete</button>
                        </div>
                        {uploadingVersionFor === doc.documentGroupId && caseId && (
                          <div style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', marginTop: '0.5rem' }}>
                            <UploadForm 
                              caseId={caseId} 
                              documentGroupId={doc.documentGroupId} 
                              onUploaded={() => { setUploadingVersionFor(null); loadData(); }} 
                            />
                            <button onClick={() => setUploadingVersionFor(null)} style={{ marginTop: '0.5rem', backgroundColor: '#64748b' }}>Cancel</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  )
}
