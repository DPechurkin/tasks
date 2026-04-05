import type { TaskStatus } from '../types/index.ts'

const STATUS_CONFIG: Record<TaskStatus, { label: string; className: string }> = {
  new: { label: 'Новая', className: 'bg-secondary' },
  in_progress: { label: 'Что-то делалось', className: 'bg-warning text-dark' },
  done: { label: 'Успешно сделана', className: 'bg-success' },
  done_partially: { label: 'Сделана, но не совсем так', className: 'bg-info text-dark' },
  abandoned: { label: 'Не будет делаться', className: 'bg-danger' },
}

interface StatusBadgeProps {
  status: TaskStatus
  className?: string
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span className={`badge ${config.className} ${className}`}>
      {config.label}
    </span>
  )
}

export { STATUS_CONFIG }
