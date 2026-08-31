import { NavLink } from 'react-router-dom'
import {
  ShieldCheck,
  Briefcase,
  Activity,
  Users,
  KeyRound,
  LogOut,
  X
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from './ThemeToggle'
import { RoleBadge } from './RoleBadge'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth()

  const getInitials = (name?: string) => {
    if (!name) return 'U'
    const parts = name.split(' ')
    return parts.map((p) => p[0]).join('').substring(0, 2).toUpperCase()
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 29 }}
          onClick={onClose}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="brand-icon-wrapper">
            <ShieldCheck size={22} />
          </div>
          <div className="brand-title-wrap">
            <div className="brand-title">Secure DMS</div>
            <span className="brand-tag">SIH26190</span>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            style={{ marginLeft: 'auto', display: 'none' }}
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            onClick={onClose}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Briefcase size={18} />
            <span>Case Vault</span>
          </NavLink>

          <NavLink
            to="/audit"
            onClick={onClose}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Activity size={18} />
            <span>Audit Trail & Compliance</span>
          </NavLink>

          <NavLink
            to="/users"
            onClick={onClose}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>Personnel Directory</span>
          </NavLink>

          <NavLink
            to="/security"
            onClick={onClose}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <KeyRound size={18} />
            <span>Security & 2FA</span>
          </NavLink>
        </nav>

        {/* Sidebar Footer with User Profile */}
        {user && (
          <div className="sidebar-footer">
            <div className="user-profile-card">
              <div className="user-avatar">{getInitials(user.fullName)}</div>
              <div className="user-meta">
                <span className="user-name-label">{user.fullName}</span>
                <span className="user-role-label">{user.role.replace(/_/g, ' ')}</span>
              </div>
            </div>

            <div className="sidebar-actions-row">
              <RoleBadge role={user.role} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ThemeToggle />
                <button
                  type="button"
                  onClick={logout}
                  className="btn-icon"
                  title="Log out"
                  aria-label="Log out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
