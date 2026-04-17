interface Props {
  isActive: boolean
  alertCount: number
  onClick: () => void
}

export default function SponseesTab({ isActive, alertCount, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 font-semibold transition-colors"
      style={{
        padding: '14px 20px',
        fontSize: '14px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        background: 'none',
        border: 'none',
        borderBottom: isActive ? '3px solid #2a9d8f' : '3px solid transparent',
        marginBottom: '-2px',
        color: isActive ? '#1a2332' : '#6b7a8d',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      👥 My Sponsees
      {alertCount > 0 && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            background: 'var(--red-alert)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          {alertCount}
        </span>
      )}
    </button>
  )
}
