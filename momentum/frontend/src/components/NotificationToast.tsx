import { useNavigate } from 'react-router-dom'
import type { UpcomingNotification } from '../types/index.ts'

interface Props {
  notification: UpcomingNotification
  onClose: () => void
}

export default function NotificationToast({ notification, onClose }: Props) {
  const navigate = useNavigate()

  const handleOpen = () => {
    navigate(`/schedule/${notification.date}`)
    onClose()
  }

  return (
    <div
      className="toast show border-warning"
      style={{ background: '#1a1e22', minWidth: '280px' }}
      role="alert"
    >
      <div className="toast-header bg-dark text-warning border-secondary">
        <i className="bi bi-alarm me-2"></i>
        <strong className="me-auto">Скоро задача</strong>
        <small className="text-muted">через {notification.minutesUntilStart} мин</small>
        <button
          type="button"
          className="btn-close btn-close-white ms-2"
          onClick={onClose}
        ></button>
      </div>
      <div className="toast-body text-white">
        <div className="fw-semibold">{notification.taskTitle}</div>
        <small className="text-muted">
          {notification.planTitle} · {notification.timeFrom}–{notification.timeTo}
        </small>
        <div className="mt-2">
          <button className="btn btn-sm btn-outline-primary" onClick={handleOpen}>
            <i className="bi bi-calendar3 me-1"></i>Открыть
          </button>
        </div>
      </div>
    </div>
  )
}
