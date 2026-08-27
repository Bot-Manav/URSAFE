import { FormEvent, useState } from 'react'
import { apiClient } from '../api/client'

export function UploadForm({ caseId, onUploaded }: { caseId: string; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await apiClient.post(`/api/cases/${caseId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setFile(null)
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
      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.docx,.txt"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button type="submit" disabled={!file || uploading}>
        {uploading ? 'Encrypting & uploading...' : 'Upload document'}
      </button>
    </form>
  )
}
