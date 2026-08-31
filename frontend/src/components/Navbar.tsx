import { Link } from 'react-router-dom'
import { ShieldCheck, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from './ThemeToggle'
import { RoleBadge } from './RoleBadge'

export function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="navbar">
      <div className="navbar-content">
        <Link to="/dashboard" className="brand-section">
          <div className="brand-icon-wrapper">
            <ShieldCheck size={20} />
          </div>
          <div className="brand-title">
            <span className="full-name">Secure DMS</span>
            <span className="brand-tag">SIH26190</span>
          </div>
        </Link>

        <div className="nav-actions">
          {user && (
            <div className="user-profile-badge">
              <span className="user-name">{user.fullName}</span>
              <RoleBadge role={user.role} />
            </div>
          )}

          <ThemeToggle />

          {user && (
            <button
              onClick={logout}
              className="btn btn-ghost btn-sm"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={16} />
              <span>Log out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
