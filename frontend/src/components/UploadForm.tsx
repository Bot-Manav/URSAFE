import { FormEvent, useState } from 'react'
import { apiClient } from '../api/client'

export function UploadForm({ 
  caseId, 
  onUploaded, 
  documentGroupId 
}: { 
  caseId: string; 
  onUploaded: () => void;
  documentGroupId?: string;
}) {
  const [files, setFiles] = useState<File[]>([])
  const [tag, setTag] = useState<string>('OTHER')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (files.length === 0) return
    setError(null)
    setUploading(true)
    
    try {
      // Upload each file sequentially
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('tag', tag)
        if (documentGroupId) {
          formData.append('documentGroupId', documentGroupId)
        }

        await apiClient.post(`/api/cases/${caseId}/documents`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
      
      setFiles([])
      setTag('OTHER')
      onUploaded()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}
      
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.docx,.txt"
          multiple={!documentGroupId} // only allow multiple if not uploading a new version
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
        />
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <label htmlFor="tag-select">Document Tag:</label>
        <select 
          id="tag-select" 
          value={tag} 
          onChange={(e) => setTag(e.target.value)}
          style={{ padding: '0.25rem' }}
        >
          <option value="EVIDENCE">Evidence</option>
          <option value="REPORT">Report</option>
          <option value="STATEMENT">Statement</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <button type="submit" disabled={files.length === 0 || uploading}>
        {uploading ? 'Encrypting & uploading...' : (documentGroupId ? 'Upload New Version' : 'Upload document(s)')}
      </button>
    </form>
  )
}
