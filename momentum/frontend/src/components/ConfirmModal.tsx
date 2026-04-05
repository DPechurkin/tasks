interface ConfirmModalProps {
  show: boolean
  title?: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  show, title = 'Подтверждение', message, confirmLabel = 'Удалить', onConfirm, onCancel
}: ConfirmModalProps) {
  if (!show) return null
  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-sm modal-dialog-centered">
        <div className="modal-content bg-dark border-secondary">
          <div className="modal-header border-secondary">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onCancel}></button>
          </div>
          <div className="modal-body">
            <p>{message}</p>
          </div>
          <div className="modal-footer border-secondary">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Отмена</button>
            <button type="button" className="btn btn-danger btn-sm" onClick={onConfirm}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
