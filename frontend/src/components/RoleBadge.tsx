import { Shield, Search, Microscope, Scale, ShieldAlert } from 'lucide-react'
import { Role } from '../context/AuthContext'

interface RoleBadgeProps {
  role: Role | string
  className?: string
}

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  const getRoleConfig = (r: string) => {
    switch (r) {
      case 'ADMIN':
        return { label: 'System Admin', icon: <ShieldAlert size={12} />, bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }
      case 'LAW_ENFORCEMENT':
        return { label: 'Law Enforcement', icon: <Shield size={12} />, bg: 'rgba(37, 99, 235, 0.15)', color: '#3b82f6' }
      case 'INVESTIGATION_OFFICER':
        return { label: 'Investigating Officer', icon: <Search size={12} />, bg: 'rgba(217, 119, 6, 0.15)', color: '#f59e0b' }
      case 'FORENSIC_OFFICER':
        return { label: 'Forensic Analyst', icon: <Microscope size={12} />, bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }
      case 'LEGAL_COURT':
        return { label: 'Court / Legal', icon: <Scale size={12} />, bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }
      default:
        return { label: r.replace(/_/g, ' '), icon: <Shield size={12} />, bg: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)' }
    }
  }

  const { label, icon, bg, color } = getRoleConfig(role)

  return (
    <span
      className={`badge ${className}`}
      style={{
        backgroundColor: bg,
        color: color,
        border: `1px solid ${color}33`,
      }}
    >
      {icon}
      {label}
    </span>
  )
}
