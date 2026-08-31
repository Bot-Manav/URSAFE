interface StatusBadgeProps {
  status: 'OPEN' | 'UNDER_INVESTIGATION' | 'CLOSED' | 'ARCHIVED' | string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const formatText = (s: string) => {
    switch (s) {
      case 'UNDER_INVESTIGATION':
        return 'Under Investigation'
      case 'OPEN':
        return 'Open'
      case 'CLOSED':
        return 'Closed'
      case 'ARCHIVED':
        return 'Archived'
      default:
        return s.replace(/_/g, ' ')
    }
  }

  return (
    <span className={`badge badge-status-${status}`}>
      <span
        style={{
          display: 'inline-block',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'currentColor',
        }}
      />
      {formatText(status)}
    </span>
  )
}
