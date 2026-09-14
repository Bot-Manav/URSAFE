import { Link } from 'react-router-dom'
import { ShieldCheck, LogOut, Bell } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiClient } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from './ThemeToggle'
import { RoleBadge } from './RoleBadge'

export function Navbar() {
  const { user, logout } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  const unreadCount = notifications.filter(n => !n.isRead).length

  useEffect(() => {
    if (!user) return
    const fetchNotifications = async () => {
      try {
        const { data } = await apiClient.get('/api/notifications')
        setNotifications(data)
      } catch (e) {
        console.error("Failed to fetch notifications", e)
      }
    }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 15000)
    return () => clearInterval(interval)
  }, [user])

  const markAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/api/notifications/${id}/read`)
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch (e) {
      console.error(e)
    }
  }

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
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ position: 'relative', padding: '0.5rem' }}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: 2, right: 2, background: 'var(--danger-text)', color: 'white', borderRadius: '50%', width: 14, height: 14, fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div style={{ position: 'absolute', top: '100%', right: 0, width: '300px', maxHeight: '400px', overflowY: 'auto', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', zIndex: 1000, boxShadow: 'var(--shadow-lg)' }}>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Notifications
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', backgroundColor: n.isRead ? 'transparent' : 'var(--bg-app)', cursor: 'pointer' }} onClick={() => !n.isRead && markAsRead(n.id)}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{n.message}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

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
