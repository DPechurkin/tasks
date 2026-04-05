import { useState, useEffect } from 'react'
import type { Task, TaskStatus } from '../types/index.ts'
import { STATUS_CONFIG } from './StatusBadge.tsx'

interface Props {
  show: boolean
  onHide: () => void
  onSave: (data: { title: string; description?: string; status?: TaskStatus }) => Promise<void>
  initialData?: Task
}

export default function TaskModal({ show, onHide, onSave, initialData }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('new')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (show) {
      setTitle(initialData?.title ?? '')
      setDescription(initialData?.description ?? '')
      setStatus(initialData?.status ?? 'new')
      setError(null)
    }
  }, [show, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Введите название')
      return
    }
    if (title.length > 200) {
      setError('Название не должно превышать 200 символов')
      return
    }
    setSaving(true)
    try {
      const data: { title: string; description?: string; status?: TaskStatus } = {
        title: title.trim(),
        description: description.trim() || undefined,
      }
      if (initialData) {
        data.status = status
      }
      await onSave(data)
      onHide()
    } catch {
      setError('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (!show) return null

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content bg-dark border-secondary">
          <div className="modal-header border-secondary">
            <h5 className="modal-title">{initialData ? 'Редактировать задачу' : 'Новая задача'}</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onHide}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <div className="mb-3">
                <label className="form-label">Название <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className={`form-control bg-dark border-secondary text-white ${error && !title ? 'is-invalid' : ''}`}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={200}
                  autoFocus
                  placeholder="Название задачи..."
                />
                <small className="text-muted">{title.length}/200</small>
              </div>
              <div className="mb-3">
                <label className="form-label">Описание</label>
                <textarea
                  className="form-control bg-dark border-secondary text-white"
                  rows={5}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Подробное описание задачи..."
                />
              </div>
              {initialData && (
                <div className="mb-3">
                  <label className="form-label">Статус</label>
                  <select
                    className="form-select bg-dark border-secondary text-white"
                    value={status}
                    onChange={e => setStatus(e.target.value as TaskStatus)}
                  >
                    {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(s => (
                      <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer border-secondary">
              <button type="button" className="btn btn-secondary" onClick={onHide}>Отмена</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm me-1"></span>Сохранение...</> : 'Сохранить'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
