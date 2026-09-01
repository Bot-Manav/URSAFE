import React, { FormEvent, useState, useRef } from 'react'
import { UploadCloud, File, X, ShieldAlert, FileCheck, FileText, HelpCircle, Loader2 } from 'lucide-react'
import { apiClient } from '../api/client'

interface UploadFormProps {
  caseId: string
  onUploaded: () => void
  documentGroupId?: string
}

export function UploadForm({ caseId, onUploaded, documentGroupId }: UploadFormProps) {
  const [files, setFiles] = useState<File[]>([])
  const [tag, setTag] = useState<string>('EVIDENCE')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files)
      if (documentGroupId) {
        setFiles([droppedFiles[0]])
      } else {
        setFiles((prev) => [...prev, ...droppedFiles])
      }
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files)
      if (documentGroupId) {
        setFiles([selectedFiles[0]])
      } else {
        setFiles((prev) => [...prev, ...selectedFiles])
      }
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (files.length === 0) return
    setError(null)
    setUploading(true)

    try {
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
      setTag('EVIDENCE')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onUploaded()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <ShieldAlert size={18} />
          <div>{error}</div>
        </div>
      )}

      {/* Drag & Drop Dropzone */}
      <div
        className={`upload-dropzone ${isDragging ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.docx,.txt"
          multiple={!documentGroupId}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
        <div className="dropzone-icon">
          <UploadCloud size={38} />
        </div>
        <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          {documentGroupId ? 'Choose new version file to upload' : 'Click to browse or drag & drop files here'}
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Supports PDF, PNG, JPG, DOCX, TXT (Encrypted via AES-256-GCM & SHA-256 Hashed)
        </p>
      </div>

      {/* Selected Files Staging List */}
      {files.length > 0 && (
        <div className="file-queue">
          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Selected Files ({files.length}):
          </p>
          {files.map((file, idx) => (
            <div key={idx} className="file-queue-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                <File size={16} className="text-primary" />
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(idx)
                }}
                style={{ padding: '0.25rem' }}
                title="Remove file"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Document Tag Category Selection */}
      <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label className="form-label">Evidentiary Classification / Tag:</label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'EVIDENCE', label: 'Evidence', icon: <ShieldAlert size={14} /> },
            { id: 'REPORT', label: 'Report', icon: <FileCheck size={14} /> },
            { id: 'STATEMENT', label: 'Statement', icon: <FileText size={14} /> },
            { id: 'OTHER', label: 'Other', icon: <HelpCircle size={14} /> },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTag(t.id)}
              className={`btn btn-sm ${tag === t.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={files.length === 0 || uploading}
        >
          {uploading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Encrypting & Uploading...</span>
            </>
          ) : (
            <>
              <UploadCloud size={16} />
              <span>{documentGroupId ? 'Upload New Version' : `Upload ${files.length} Document${files.length > 1 ? 's' : ''}`}</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
