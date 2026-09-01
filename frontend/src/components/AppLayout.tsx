import { useState } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { Menu, ShieldCheck } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { ThemeToggle } from './ThemeToggle'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-layout">
      {/* Responsive Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* Mobile Top Bar */}
        <header className="mobile-topbar">
          <button
            type="button"
            className="btn-icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>

          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
            <div className="brand-icon-wrapper" style={{ width: '30px', height: '30px' }}>
              <ShieldCheck size={18} />
            </div>
            <strong style={{ fontSize: '0.95rem' }}>Secure DMS</strong>
          </Link>

          <ThemeToggle />
        </header>

        {/* Dynamic Route View */}
        <main style={{ flex: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
