interface EmptyStateProps {
  icon?: string
  text: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({ icon = 'bi-inbox', text, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="text-center py-5 text-muted">
      <i className={`bi ${icon} fs-1 mb-3 d-block`}></i>
      <p className="mb-3">{text}</p>
      {actionLabel && onAction && (
        <button className="btn btn-primary btn-sm" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
