import { useState, useEffect } from 'react'
import { X, Download, Copy, Check, ShieldCheck, FileText, AlertTriangle, Eye } from 'lucide-react'
import { apiClient } from '../api/client'
import { TagBadge } from './TagBadge'

export interface DocumentSummary {
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

  useEffect(() => {
    if (!doc) {
      setBlobUrl(null)
      setTextContent(null)
      setError(null)
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    apiClient
      .get(`/api/documents/${doc.id}/download`, { responseType: 'blob' })
      .then((res) => {
        if (!active) return
        const contentTypeHeader = typeof res.headers['content-type'] === 'string' ? res.headers['content-type'] : undefined
        const blob = new Blob([res.data], { type: doc.contentType || contentTypeHeader || 'application/octet-stream' })
        const url = URL.createObjectURL(blob)
        setBlobUrl(url)

        if (doc.contentType?.startsWith('text/') || doc.originalFileName.endsWith('.txt') || doc.originalFileName.endsWith('.json')) {
          const reader = new FileReader()
          reader.onload = () => {
            if (active) setTextContent(reader.result as string)
          }
          reader.readAsText(blob)
        }
      })
      .catch((err) => {
        if (!active) return
        if (err.response?.status === 409) {
          setError('Integrity Check Failed! Document has been tampered with.')
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

  const isImage = doc.contentType?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(doc.originalFileName)
  const isPdf = doc.contentType === 'application/pdf' || /\.pdf$/i.test(doc.originalFileName)

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
