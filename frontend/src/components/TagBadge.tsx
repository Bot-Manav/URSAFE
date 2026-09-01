import { FileText, ShieldAlert, FileCheck, HelpCircle } from 'lucide-react'

interface TagBadgeProps {
  tag: 'EVIDENCE' | 'REPORT' | 'STATEMENT' | 'OTHER' | string
}

export function TagBadge({ tag }: TagBadgeProps) {
  const getIcon = () => {
    switch (tag) {
      case 'EVIDENCE':
        return <ShieldAlert size={12} />
      case 'REPORT':
        return <FileCheck size={12} />
      case 'STATEMENT':
        return <FileText size={12} />
      default:
        return <HelpCircle size={12} />
    }
  }

  return (
    <span className={`badge badge-tag-${tag}`}>
      {getIcon()}
      {tag}
    </span>
  )
}
