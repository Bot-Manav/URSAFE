import { useState, useEffect } from 'react'
import {
  Users,
  Mail,
  RefreshCw,
  UserCheck,
  UserX,
  AlertCircle
} from 'lucide-react'
import { apiClient } from '../api/client'
import { RoleBadge } from '../components/RoleBadge'

interface UserItem {
  id: string
  fullName: string
  email: string
  role: string
}

export default function PendingUsers() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadPendingUsers() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get<UserItem[]>('/api/admin/users?status=pending')
      setUsers(data)
    } catch {
      setError('Could not load pending users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPendingUsers()
  }, [])

  async function handleStatusUpdate(id: string, action: 'APPROVE' | 'REJECT') {
    try {
      await apiClient.patch(`/api/admin/users/${id}/status`, { action })
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user status.')
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return 'U'
    const parts = name.split(' ')
    return parts.map((p) => p[0]).join('').substring(0, 2).toUpperCase()
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Pending Registration Approvals
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
            Review and approve new personnel accounts before they can access the system.
          </p>
        </div>

        <button type="button" className="btn btn-secondary btn-sm" onClick={loadPendingUsers}>
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <div>{error}</div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Users size={18} className="text-warning" />
            <span>Pending Accounts ({users.length})</span>
          </h3>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0' }}>
            <div className="skeleton" style={{ height: '50px', width: '100%' }} />
            <div className="skeleton" style={{ height: '50px', width: '100%' }} />
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <UserCheck size={44} className="empty-state-icon" style={{ color: 'var(--success)' }} />
            <h4 className="empty-state-title">No pending approvals</h4>
            <p className="empty-state-text">
              All personnel accounts have been reviewed.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Official Name</th>
                  <th>Requested Role</th>
                  <th>Official Email Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="user-avatar">{getInitials(u.fullName)}</div>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                          {u.fullName}
                        </strong>
                      </div>
                    </td>
                    <td>
                      <RoleBadge role={u.role} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>{u.email}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleStatusUpdate(u.id, 'APPROVE')}
                          title="Approve Account"
                        >
                          <UserCheck size={14} />
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                          onClick={() => {
                            if (confirm('Are you sure you want to reject and delete this request?')) {
                              handleStatusUpdate(u.id, 'REJECT')
                            }
                          }}
                          title="Reject Account"
                        >
                          <UserX size={14} />
                          Reject
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
  )
}
