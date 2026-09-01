import { useState, useEffect, useMemo } from 'react'
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  Search,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Clock,
  User,
  Globe,
  FileText
} from 'lucide-react'
import { apiClient } from '../api/client'

interface AuditLogEntry {
  id: string
  userId: string
  action: string
  caseId?: string
  documentId?: string
  detail?: string
  ipAddress: string
  timestamp: string
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')

  async function loadLogs() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get<AuditLogEntry[]>('/api/audit-logs')
      setLogs(data)
    } catch {
      setError('Could not load audit log records. Verify administrative permissions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.ipAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.detail && log.detail.toLowerCase().includes(searchTerm.toLowerCase())) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userId.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesAction = actionFilter === 'ALL' || log.action === actionFilter
      return matchesSearch && matchesAction
    })
  }, [logs, searchTerm, actionFilter])

  const getActionBadge = (action: string) => {
    if (action.includes('FAIL') || action.includes('TAMPER')) {
      return (
        <span className="badge" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}>
          <ShieldAlert size={12} />
          {action}
        </span>
      )
    }
    if (action.includes('SUCCESS') || action.includes('ENABLED')) {
      return (
        <span className="badge" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' }}>
          <ShieldCheck size={12} />
          {action}
        </span>
      )
    }
    if (action.includes('UPLOAD') || action.includes('DOWNLOAD')) {
      return (
        <span className="badge" style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info-text)', border: '1px solid var(--info-border)' }}>
          <FileText size={12} />
          {action}
        </span>
      )
    }
    return (
      <span className="badge" style={{ backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
        <Activity size={12} />
        {action}
      </span>
    )
  }

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return
    const headers = ['Timestamp', 'Action', 'User ID', 'Case ID', 'Document ID', 'IP Address', 'Detail']
    const rows = filteredLogs.map((l) => [
      new Date(l.timestamp).toISOString(),
      l.action,
      l.userId,
      l.caseId || 'N/A',
      l.documentId || 'N/A',
      l.ipAddress,
      `"${(l.detail || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `audit_trail_report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="page">
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            System Audit Trail & Compliance Log
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
            Immutable evidentiary event logging for legal chain-of-custody & DPDP Act compliance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadLogs}>
            <RefreshCw size={14} />
            <span>Refresh Logs</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
          >
            <FileSpreadsheet size={14} />
            <span>Export Court Report (CSV)</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <ShieldAlert size={18} />
          <div>{error}</div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.4rem' }}
              placeholder="Search by action, IP address, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select
              className="form-select"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="ALL">All Event Types</option>
              <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
              <option value="LOGIN_FAIL">LOGIN_FAIL</option>
              <option value="UPLOAD">UPLOAD</option>
              <option value="DOWNLOAD">DOWNLOAD</option>
              <option value="VERIFY_FAIL">VERIFY_FAIL (Tamper Alert)</option>
              <option value="GRANT_ACCESS">GRANT_ACCESS</option>
              <option value="MFA_ENABLED">MFA_ENABLED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Activity size={18} className="text-primary" />
            <span>Audit Trail Entries ({filteredLogs.length})</span>
          </h3>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0' }}>
            <div className="skeleton" style={{ height: '50px', width: '100%' }} />
            <div className="skeleton" style={{ height: '50px', width: '100%' }} />
            <div className="skeleton" style={{ height: '50px', width: '100%' }} />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="empty-state">
            <Activity size={44} className="empty-state-icon" />
            <h4 className="empty-state-title">No audit records found</h4>
            <p className="empty-state-text">
              {searchTerm || actionFilter !== 'ALL'
                ? 'No events match your current filter parameters.'
                : 'Sensitive operations will automatically record to this immutable ledger.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor / User ID</th>
                  <th>Origin IP</th>
                  <th>Context Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={13} />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </td>
                    <td>{getActionBadge(log.action)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                        <User size={13} style={{ color: 'var(--text-muted)' }} />
                        <span>{log.userId ? log.userId.substring(0, 8) + '...' : 'System'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}>
                        <Globe size={13} style={{ color: 'var(--text-muted)' }} />
                        <span>{log.ipAddress}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {log.detail || '—'}
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
