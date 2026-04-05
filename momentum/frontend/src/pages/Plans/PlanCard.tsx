import { Link } from 'react-router-dom'
import type { Plan } from '../../types/index.ts'

interface Props {
  plan: Plan
  onEdit: () => void
  onDelete: () => void
  dragHandleProps?: Record<string, unknown>
}

export default function PlanCard({ plan, onEdit, onDelete, dragHandleProps }: Props) {
  const truncated = plan.description && plan.description.length > 100
    ? plan.description.slice(0, 100) + '...'
    : plan.description

  return (
    <div className="card bg-dark border-secondary mb-2">
      <div className="card-body py-3">
        <div className="d-flex align-items-start gap-2">
          {/* Drag handle */}
          <span
            {...dragHandleProps}
            className="text-muted mt-1"
            style={{ cursor: 'grab', userSelect: 'none', fontSize: '1.2rem' }}
          >⠿</span>

          <div className="flex-grow-1 min-width-0">
            <div className="d-flex justify-content-between align-items-start">
              <Link
                to={`/plans/${plan.id}`}
                className="h6 mb-1 text-white text-decoration-none fw-semibold"
                style={{ wordBreak: 'break-word' }}
              >
                {plan.title}
              </Link>
              <div className="d-flex gap-1 ms-2 flex-shrink-0 align-items-center flex-wrap justify-content-end">
                {plan.ideaId && (
                  <Link
                    to={`/ideas/${plan.ideaId}`}
                    className="badge bg-info text-dark text-decoration-none"
                  >
                    {plan.ideaTitle ?? 'Идея'}
                  </Link>
                )}
                <span className="badge bg-secondary">
                  {plan.tasksCount ?? 0} задач
                </span>
                <button
                  className="btn btn-sm btn-outline-secondary py-0 px-1"
                  onClick={onEdit}
                  title="Редактировать"
                >
                  <i className="bi bi-pencil"></i>
                </button>
                <button
                  className="btn btn-sm btn-outline-danger py-0 px-1"
                  onClick={onDelete}
                  title="Удалить"
                >
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            </div>
            {truncated && (
              <p className="mb-1 text-secondary small">{truncated}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
