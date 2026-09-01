import { useState, useEffect, useMemo } from 'react'
import {
  Users,
  Search,
  Mail,
  Shield,
  Search as SearchIcon,
  Microscope,
  Scale,
  RefreshCw,
  UserCheck,
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

export default function UsersDirectory() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')

  async function loadUsers() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get<UserItem[]>('/api/users')
      setUsers(data)
    } catch {
      setError('Could not load personnel directory.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.role.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [users, searchTerm, roleFilter])

  const getInitials = (name?: string) => {
    if (!name) return 'U'
    const parts = name.split(' ')
    return parts.map((p) => p[0]).join('').substring(0, 2).toUpperCase()
  }

  // Count stats
  const totalOfficers = users.length
  const ioCount = users.filter((u) => u.role === 'INVESTIGATION_OFFICER').length
  const leCount = users.filter((u) => u.role === 'LAW_ENFORCEMENT').length
  const forensicCount = users.filter((u) => u.role === 'FORENSIC_OFFICER').length
  const legalCount = users.filter((u) => u.role === 'LEGAL_COURT').length

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Authorized Personnel Directory
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
            Registered law enforcement officers, forensic analysts, and judicial officials.
          </p>
        </div>

        <button type="button" className="btn btn-secondary btn-sm" onClick={loadUsers}>
          <RefreshCw size={14} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <div>{error}</div>
        </div>
      )}

      {/* Stats Summary Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <Users size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{totalOfficers}</span>
            <span className="stat-label">Total Registered Staff</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <SearchIcon size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{ioCount}</span>
            <span className="stat-label">Investigation Officers</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <Microscope size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{forensicCount}</span>
            <span className="stat-label">Forensic Analysts</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon info">
            <Scale size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{legalCount}</span>
            <span className="stat-label">Court & Legal Counsel</span>
          </div>
        </div>
      </div>

      {/* Search and Role Filter */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.4rem' }}
              placeholder="Search by name, email, or badge..."
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

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Roles' },
              { id: 'INVESTIGATION_OFFICER', label: 'Investigating' },
              { id: 'LAW_ENFORCEMENT', label: 'Enforcement' },
              { id: 'FORENSIC_OFFICER', label: 'Forensics' },
              { id: 'LEGAL_COURT', label: 'Court / Legal' },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                className={`btn btn-sm ${roleFilter === r.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setRoleFilter(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Personnel Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <UserCheck size={18} className="text-primary" />
            <span>Active Department Personnel ({filteredUsers.length})</span>
          </h3>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0' }}>
            <div className="skeleton" style={{ height: '50px', width: '100%' }} />
            <div className="skeleton" style={{ height: '50px', width: '100%' }} />
            <div className="skeleton" style={{ height: '50px', width: '100%' }} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <Users size={44} className="empty-state-icon" />
            <h4 className="empty-state-title">No personnel found</h4>
            <p className="empty-state-text">
              Try adjusting your search criteria or role selection filter.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Official Name</th>
                  <th>Departmental Role</th>
                  <th>Official Email Address</th>
                  <th>Access Identifier</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
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
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          backgroundColor: 'var(--bg-surface-elevated)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {u.id.substring(0, 13)}...
                      </span>
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
