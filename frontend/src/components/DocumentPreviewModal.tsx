import { useState, useEffect } from 'react'
import { X, Download, Copy, Check, ShieldCheck, FileText, AlertTriangle, Eye, MessageSquare, Send, Brain } from 'lucide-react'
import { apiClient } from '../api/client'
import { TagBadge } from './TagBadge'
import { SignatureResponse, signDocument, getSignatures } from '../api/signature'

interface CommentResponse {
  id: string;
  documentId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

interface AiInsightResponse {
  documentId: string;
  summary: string;
  extractedEntities: Record<string, string[]>;
}

export interface DocumentSummary {
  id: string
  caseId: string
  originalFileName: string
  contentType: string
  fileSizeBytes: number
  sha256Hash: string
  uploadedBy: string
  uploadedAt: string
  version: number
  documentGroupId: string
  tag: string
  status: string
  signedByNames?: string[]
  retentionDate?: string
  isArchived: boolean
}

interface DocumentPreviewModalProps {
  document: DocumentSummary | null
  onClose: () => void
  onDownload: (doc: DocumentSummary) => void
}

export function DocumentPreviewModal({ document: doc, onClose, onDownload }: DocumentPreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedHash, setCopiedHash] = useState(false)
  const [signatures, setSignatures] = useState<SignatureResponse[]>([])
  const [signing, setSigning] = useState(false)
  const [comments, setComments] = useState<CommentResponse[]>([])
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [insights, setInsights] = useState<AiInsightResponse | null>(null)

  const isImage = doc?.contentType?.startsWith('image/') || /\.(png|jpe?g)$/i.test(doc?.originalFileName || '')
  const isPdf = doc?.contentType === 'application/pdf' || /\.pdf$/i.test(doc?.originalFileName || '')

  useEffect(() => {
    if (!doc) {
      setBlobUrl(null)
      setTextContent(null)
      setError(null)
      setSignatures([])
      setComments([])
      setInsights(null)
      return
    }

    if (!isImage && !isPdf) {
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError(null)
    setSignatures([])

    getSignatures(doc.id).then((sigs) => {
      if (active) setSignatures(sigs)
    }).catch(console.error)

    apiClient.get<CommentResponse[]>(`/api/documents/${doc.id}/comments`)
      .then(res => {
        if (active) setComments(res.data)
      }).catch(console.error)

    apiClient.get<AiInsightResponse>(`/api/documents/${doc.id}/insights`)
      .then(res => {
        if (active && res.data && res.data.summary) {
          setInsights(res.data)
        }
      }).catch(console.error)

    apiClient
      .get(`/api/documents/${doc.id}/preview`, { responseType: 'blob' })
      .then((res) => {
        if (!active) return
        const contentTypeHeader = typeof res.headers['content-type'] === 'string' ? res.headers['content-type'] : undefined
        const blob = new Blob([res.data], { type: doc.contentType || contentTypeHeader || 'application/octet-stream' })
        const url = URL.createObjectURL(blob)
        setBlobUrl(url)
      })
      .catch((err) => {
        if (!active) return
        if (err.response?.status === 409) {
          setError('Integrity Check Failed! Document has been tampered with.')
        } else if (err.response?.status === 400) {
          setError('Preview restricted for security or unsupported format.')
        } else {
          setError('Could not load document preview.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [doc])

  if (!doc) return null

  const handleCopyHash = () => {
    navigator.clipboard.writeText(doc.sha256Hash)
    setCopiedHash(true)
    setTimeout(() => setCopiedHash(false), 2000)
  }

  const handleSign = async () => {
    if (!doc) return
    setSigning(true)
    try {
      const sig = await signDocument(doc.id)
      setSignatures([sig, ...signatures])
    } catch (e: any) {
      console.error('Failed to sign document', e)
      setError(e.response?.data?.message || 'Failed to cryptographically sign document.')
    } finally {
      setSigning(false)
    }
  }

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !doc) return
    setPostingComment(true)
    try {
      const res = await apiClient.post<CommentResponse>(`/api/documents/${doc.id}/comments`, { body: newComment.trim() })
      setComments([...comments, res.data])
      setNewComment('')
    } catch (e: any) {
      console.error('Failed to post comment', e)
      alert(e.response?.data?.message || 'Failed to post comment')
    } finally {
      setPostingComment(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog modal-dialog-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
            <Eye size={20} className="text-primary" />
            <h3 className="modal-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {doc.originalFileName}
            </h3>
            <span className="badge-version">v{doc.version}</span>
            <TagBadge tag={doc.tag} />
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '3rem 0' }}>
              <div className="skeleton" style={{ width: '100%', height: '300px' }} />
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Decrypting and verifying document integrity...</p>
            </div>
          ) : error ? (
            <div className="alert alert-danger" style={{ margin: 'auto' }}>
              <AlertTriangle size={20} />
              <div>
                <strong>Security Alert:</strong> {error}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', padding: '1rem', overflow: 'hidden' }}>
              {isImage && blobUrl ? (
                <img
                  src={blobUrl}
                  alt={doc.originalFileName}
                  style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }}
                />
              ) : isPdf && blobUrl ? (
                <iframe
                  src={blobUrl}
                  title={doc.originalFileName}
                  style={{ width: '100%', height: '58vh', border: 'none', borderRadius: 'var(--radius-sm)' }}
                />
              ) : textContent !== null ? (
                <pre
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                    padding: '1rem',
                    backgroundColor: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    width: '100%',
                    maxHeight: '55vh',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {textContent}
                </pre>
              ) : (
                <div className="empty-state">
                  <FileText size={48} className="empty-state-icon" />
                  <h4 className="empty-state-title">{doc.originalFileName}</h4>
                  <p className="empty-state-text">
                    In-browser preview is not supported for this format. Download the document to view its contents.
                  </p>
                  <button className="btn btn-primary btn-sm" onClick={() => onDownload(doc)}>
                    <Download size={14} />
                    Download File
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Cryptographic Hash & Metadata Card */}
          <div
            style={{
              marginTop: '1rem',
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={16} style={{ color: 'var(--success-text)' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  SHA-256 Cryptographic Hash (Integrity Verified)
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCopyHash}
                title="Copy SHA-256 Hash"
              >
                {copiedHash ? <Check size={14} style={{ color: 'var(--success-text)' }} /> : <Copy size={14} />}
                <span>{copiedHash ? 'Copied' : 'Copy Hash'}</span>
              </button>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                backgroundColor: 'var(--bg-app)',
                padding: '0.4rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                wordBreak: 'break-all',
              }}
            >
              {doc.sha256Hash}
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              <span>Size: {(doc.fileSizeBytes / 1024).toFixed(1)} KB</span>
              <span>Uploaded: {new Date(doc.uploadedAt).toLocaleString()}</span>
              <span>Type: {doc.contentType || 'Binary'}</span>
            </div>
          </div>

          {/* Digital Signatures Section */}
          <div
            style={{
              marginTop: '1rem',
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Cryptographic Signatures</h4>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleSign}
                disabled={signing}
              >
                {signing ? 'Signing...' : 'Sign Document'}
              </button>
            </div>
            
            {signatures.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>No digital signatures yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {signatures.map(sig => (
                  <div key={sig.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.5rem', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div>
                      <strong>{sig.signedByUserFullName}</strong> ({sig.signedByUserRole})
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                        {new Date(sig.signedAt).toLocaleString()} • {sig.algorithm}
                      </div>
                    </div>
                    {sig.isValid ? (
                      <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <ShieldCheck size={12} /> Valid
                      </span>
                    ) : (
                      <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <AlertTriangle size={12} /> Tampered
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div
            style={{
              marginTop: '1rem',
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <MessageSquare size={16} style={{ color: 'var(--primary)' }} />
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Comments</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem' }}>
              {comments.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>No comments yet.</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', padding: '0.5rem', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{c.authorName}</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{c.body}</div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handlePostComment} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Write a comment..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                disabled={postingComment}
                style={{ flex: 1, fontSize: '0.85rem' }}
              />
              <button type="submit" className="btn btn-primary" disabled={postingComment || !newComment.trim()}>
                {postingComment ? <span className="spin">...</span> : <Send size={16} />}
              </button>
            </form>
          </div>
          
          {/* AI Insights Section */}
          {insights && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Brain size={16} style={{ color: 'var(--primary)' }} />
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>AI Insights</h4>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Auto-Generated Summary</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {insights.summary}
                </div>
              </div>

              {insights.extractedEntities && Object.keys(insights.extractedEntities).length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Extracted Entities</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {Object.entries(insights.extractedEntities).map(([key, values]) => (
                      values.length > 0 && values.map((val, idx) => (
                        <span key={`${key}-${idx}`} style={{
                          fontSize: '0.7rem',
                          backgroundColor: 'var(--bg-app)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-secondary)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '12px'
                        }}>
                          <strong>{key}:</strong> {val}
                        </span>
                      ))
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={() => onDownload(doc)}>
            <Download size={16} />
            Download Original
          </button>
        </div>
      </div>
    </div>
  )
}
