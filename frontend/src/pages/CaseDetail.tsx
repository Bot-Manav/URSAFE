import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiClient } from '../api/client'
import { UploadForm } from '../components/UploadForm'

interface DocumentSummary {
  id: string
  originalFileName: string
  contentType: string
  fileSizeBytes: number
  sha256Hash: string
  uploadedAt: string
  version: number
}

export default function CaseDetail() {
  const { caseId } = useParams<{ caseId: string }>()
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadDocuments() {
    if (!caseId) return
    setLoading(true)
    try {
      const { data } = await apiClient.get<DocumentSummary[]>(`/api/cases/${caseId}/documents`)
      setDocuments(data)
    } catch {
      setError('Could not load documents - you may not have access to this case')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId])

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

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/dashboard">&larr; Back to cases</Link>
      </header>

      <main>
        <section className="card">
          <h2>Upload document</h2>
          {caseId && <UploadForm caseId={caseId} onUploaded={loadDocuments} />}
        </section>

        {error && <div className="error-banner">{error}</div>}

        <section className="card">
          <h2>Documents</h2>
          {loading ? (
            <p>Loading...</p>
          ) : documents.length === 0 ? (
            <p>No documents uploaded yet.</p>
          ) : (
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Size</th>
                  <th>SHA-256</th>
                  <th>Uploaded</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.originalFileName}</td>
                    <td>{(doc.fileSizeBytes / 1024).toFixed(1)} KB</td>
                    <td className="hash-cell" title={doc.sha256Hash}>{doc.sha256Hash.slice(0, 16)}...</td>
                    <td>{new Date(doc.uploadedAt).toLocaleString()}</td>
                    <td><button onClick={() => handleDownload(doc)}>Download & verify</button></td>
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
