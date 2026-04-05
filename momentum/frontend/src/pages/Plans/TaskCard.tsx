import { Link } from 'react-router-dom'
import type { Task, TaskStatus } from '../../types/index.ts'
import StatusBadge, { STATUS_CONFIG } from '../../components/StatusBadge.tsx'

function StatusDropdown({ status, onChange }: { status: TaskStatus; onChange: (s: TaskStatus) => void }) {
  return (
    <div className="dropdown">
      <button
        className="btn btn-sm btn-outline-secondary py-0 px-1 dropdown-toggle"
        data-bs-toggle="dropdown"
        type="button"
      >
        <StatusBadge status={status} />
      </button>
      <ul className="dropdown-menu dropdown-menu-dark dropdown-menu-end">
        {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(s => (
          <li key={s}>
            <button className="dropdown-item" type="button" onClick={() => onChange(s)}>
              <StatusBadge status={s} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface Props {
  task: Task
  index: number
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: TaskStatus) => void
  dragHandleProps?: Record<string, unknown>
}

export default function TaskCard({ task, index, onEdit, onDelete, onStatusChange, dragHandleProps }: Props) {
  return (
    <div className="card bg-dark border-secondary mb-2">
      <div className="card-body py-3">
        <div className="d-flex align-items-start gap-2">
          <span {...dragHandleProps} className="text-muted" style={{ cursor: 'grab' }}>⠿</span>

          <div className="flex-grow-1">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-muted me-2 small">#{index + 1}</span>
                <Link
                  to={`/plans/${task.planId}/tasks/${task.id}`}
                  className="text-white text-decoration-none fw-semibold"
                >
                  {task.title}
                </Link>
              </div>
              <div className="d-flex gap-1 ms-2 align-items-center flex-wrap justify-content-end">
                <StatusDropdown status={task.status} onChange={onStatusChange} />
                {(task.subtasksCount ?? 0) > 0 && (
                  <Link
                    to={`/plans/${task.planId}/tasks/${task.id}`}
                    className="badge bg-info text-dark text-decoration-none"
                    title="Подзадачи"
                    onClick={e => e.stopPropagation()}
                  >
                    <i className="bi bi-diagram-3 me-1"></i>{task.subtasksCount}
                  </Link>
                )}
                {(task.slotsCount ?? 0) > 0 && (
                  <span className="badge bg-secondary">
                    <i className="bi bi-calendar3 me-1"></i>{task.slotsCount}
                  </span>
                )}
                {(task.commentsCount ?? 0) > 0 && (
                  <span className="badge bg-secondary">
                    <i className="bi bi-chat me-1"></i>{task.commentsCount}
                  </span>
                )}
                <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={onEdit} type="button">
                  <i className="bi bi-pencil"></i>
                </button>
                <button className="btn btn-sm btn-outline-danger py-0 px-1" onClick={onDelete} type="button">
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            </div>
            {task.description && (
              <p className="mb-1 text-secondary small mt-1">
                {task.description.slice(0, 100)}{task.description.length > 100 ? '...' : ''}
              </p>
            )}
            <StatusBadge status={task.status} />
          </div>
        </div>
      </div>
    </div>
  )
}
