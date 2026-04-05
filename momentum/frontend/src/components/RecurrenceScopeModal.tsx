interface Props {
  show: boolean
  action: 'edit' | 'delete'
  onSingle: () => void
  onFuture: () => void
  onCancel: () => void
}

export default function RecurrenceScopeModal({ show, action, onSingle, onFuture, onCancel }: Props) {
  if (!show) return null
  const verb = action === 'delete' ? 'Удалить' : 'Изменить'
  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999 }}>
      <div className="modal-dialog modal-dialog-centered modal-sm">
        <div className="modal-content bg-dark border-secondary">
          <div className="modal-header border-secondary py-2">
            <h6 className="modal-title">{verb} повторяющееся событие</h6>
            <button type="button" className="btn-close btn-close-white btn-sm" onClick={onCancel}></button>
          </div>
          <div className="modal-body d-flex flex-column gap-2 py-3">
            <button className="btn btn-outline-light text-start" onClick={onSingle}>
              <i className="bi bi-calendar-event me-2"></i>
              Только это событие
            </button>
            <button className="btn btn-outline-warning text-start" onClick={onFuture}>
              <i className="bi bi-calendar-range me-2"></i>
              Это и все последующие
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
