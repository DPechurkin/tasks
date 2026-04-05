import { Link } from 'react-router-dom'
import type { Idea } from '../../types/index.ts'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Props {
  idea: Idea
  onEdit: () => void
  onDelete: () => void
  dragHandleProps?: Record<string, unknown>
}

export default function IdeaCard({ idea, onEdit, onDelete, dragHandleProps }: Props) {
  const truncated = idea.description && idea.description.length > 150
    ? idea.description.slice(0, 150) + '...'
    : idea.description

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
                to={`/ideas/${idea.id}`}
                className="h6 mb-1 text-white text-decoration-none fw-semibold"
                style={{ wordBreak: 'break-word' }}
              >
                {idea.title}
              </Link>
              <div className="d-flex gap-1 ms-2 flex-shrink-0">
                <span className="badge bg-secondary">
                  {idea.plansCount ?? 0} {(idea.plansCount ?? 0) === 1 ? 'план' : 'планов'}
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
            <small className="text-muted">
              {format(new Date(idea.createdAt), 'd MMM yyyy', { locale: ru })}
            </small>
          </div>
        </div>
      </div>
    </div>
  )
}
