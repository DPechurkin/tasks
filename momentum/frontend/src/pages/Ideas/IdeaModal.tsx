import { useState, useEffect } from 'react'
import type { Idea } from '../../types/index.ts'

interface Props {
  show: boolean
  onHide: () => void
  onSave: (data: { title: string; description?: string }) => Promise<void>
  initialData?: Idea
}

export default function IdeaModal({ show, onHide, onSave, initialData }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (show) {
      setTitle(initialData?.title ?? '')
      setDescription(initialData?.description ?? '')
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
      await onSave({ title: title.trim(), description: description.trim() || undefined })
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
            <h5 className="modal-title">{initialData ? 'Редактировать идею' : 'Новая идея'}</h5>
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
                  placeholder="Название идеи..."
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
                  placeholder="Подробное описание идеи..."
                />
              </div>
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
