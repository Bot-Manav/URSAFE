import React, { useState, useEffect } from 'react'
import { Search, FileText, AlertTriangle } from 'lucide-react'
import { apiClient } from '../api/client'
import { DocumentSummary } from '../components/DocumentPreviewModal'
import { TagBadge } from '../components/TagBadge'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminSearch() {
  const { user } = useAuth()
  const [docSearch, setDocSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('ALL')
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [loading, setLoading] = useState(false)

  // Only allow ADMIN
  if (user?.role !== 'ADMIN') {
    return (
      <div className="empty-state">
        <AlertTriangle size={48} className="empty-state-icon" style={{ color: 'var(--danger-color)' }} />
        <h4 className="empty-state-title">Access Denied</h4>
        <p className="empty-state-text">You must be an administrator to perform cross-case global searches.</p>
      </div>
    )
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (docSearch) params.append('q', docSearch)
        if (tagFilter !== 'ALL') params.append('tag', tagFilter)
        
        const { data } = await apiClient.get<DocumentSummary[]>(`/api/admin/search?${params.toString()}`)
        
        // Group by documentGroupId to only show latest version of each document
        const groups = new Map<string, DocumentSummary>()
        data.forEach((doc) => {
          const existing = groups.get(doc.documentGroupId)
          if (!existing || doc.version > existing.version) {
            groups.set(doc.documentGroupId, doc)
          }
        })
        setDocuments(Array.from(groups.values()).sort(
          (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        ))
      } catch (e) {
        console.error("Failed to perform admin search", e)
      } finally {
        setLoading(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [docSearch, tagFilter])

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="card-title">Global Document Search</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Administrative oversight tool. Searches encrypted OCR text indexes and filenames across all cases.
          </p>
        </div>
      </div>
      
      <div className="card-body">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Type to search exact keywords in OCR text or filenames..."
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
        
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0' }}>
            <div className="skeleton" style={{ height: '50px', width: '100%' }} />
            <div className="skeleton" style={{ height: '50px', width: '100%' }} />
          </div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} className="empty-state-icon" />
            <h4 className="empty-state-title">No documents found</h4>
            <p className="empty-state-text">
              Try a different keyword or category. Blind indexing requires exact word matches.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Document Name</th>
                  <th>Category</th>
                  <th>Version</th>
                  <th>File Size</th>
                  <th>Timestamp</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link to={`/cases/${d.caseId}`} style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 500 }}>
                        {d.caseId.substring(0, 8)}...
                      </Link>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{d.originalFileName}</div>
                    </td>
                    <td><TagBadge tag={d.tag} /></td>
                    <td>v{d.version}</td>
                    <td className="text-muted">{(d.fileSizeBytes / 1024).toFixed(1)} KB</td>
                    <td className="text-muted">{new Date(d.uploadedAt).toLocaleString()}</td>
                    <td>
                      <Link to={`/cases/${d.caseId}`} className="btn btn-outline btn-sm">
                        Go to Case
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
