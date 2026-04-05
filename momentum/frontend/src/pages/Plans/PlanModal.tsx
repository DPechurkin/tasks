import { useState, useEffect, useRef } from 'react'
import type { Plan, Idea } from '../../types/index.ts'
import { ideasApi } from '../../api/ideas.ts'

interface Props {
  show: boolean
  onHide: () => void
  onSave: (data: { title: string; description?: string; ideaId?: number | null }) => Promise<void>
  initialData?: Plan
  defaultIdeaId?: number
  defaultIdeaTitle?: string
}

export default function PlanModal({ show, onHide, onSave, initialData, defaultIdeaId, defaultIdeaTitle }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ideaId, setIdeaId] = useState<number | null>(null)
  const [ideaSearch, setIdeaSearch] = useState('')
  const [allIdeas, setAllIdeas] = useState<Idea[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (show) {
      ideasApi.getAll().then(ideas => {
        setAllIdeas(ideas)
        const presetId = initialData?.ideaId ?? defaultIdeaId ?? null
        const preset = presetId ? ideas.find(i => i.id === presetId) : null
        setIdeaSearch(preset?.title ?? defaultIdeaTitle ?? '')
        setIdeaId(preset?.id ?? (defaultIdeaId ?? null))
      }).catch(console.error)
      setTitle(initialData?.title ?? '')
      setDescription(initialData?.description ?? '')
      if (!defaultIdeaId) setIdeaId(initialData?.ideaId ?? null)
      setDropdownOpen(false)
      setError(null)
    }
  }, [show, initialData, defaultIdeaId, defaultIdeaTitle])

  // Закрытие дропдауна при клике вне
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredIdeas = allIdeas.filter(idea =>
    idea.title.toLowerCase().includes(ideaSearch.toLowerCase())
  )

  const selectIdea = (idea: Idea) => {
    setIdeaId(idea.id)
    setIdeaSearch(idea.title)
    setDropdownOpen(false)
  }

  const clearIdea = () => {
    setIdeaId(null)
    setIdeaSearch('')
    setDropdownOpen(false)
  }

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
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        ideaId: ideaId,
      })
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
            <h5 className="modal-title">{initialData ? 'Редактировать план' : 'Новый план'}</h5>
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
                  placeholder="Название плана..."
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
                  placeholder="Подробное описание плана..."
                />
              </div>
              <div className="mb-3" ref={searchRef}>
                <label className="form-label">Идея</label>
                <div className="position-relative">
                  <div className="input-group">
                    <span className="input-group-text bg-dark border-secondary text-muted">
                      <i className="bi bi-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control bg-dark border-secondary text-white"
                      value={ideaSearch}
                      onChange={e => { setIdeaSearch(e.target.value); setDropdownOpen(true); if (!e.target.value) setIdeaId(null) }}
                      onFocus={() => setDropdownOpen(true)}
                      placeholder="Поиск идеи..."
                    />
                    {ideaId && (
                      <button type="button" className="btn btn-outline-secondary" onClick={clearIdea} title="Очистить">
                        <i className="bi bi-x"></i>
                      </button>
                    )}
                  </div>
                  {ideaId && (
                    <small className="text-success">
                      <i className="bi bi-check-circle me-1"></i>Выбрана идея
                    </small>
                  )}
                  {dropdownOpen && (
                    <div
                      className="border border-secondary rounded mt-1 overflow-auto position-absolute w-100"
                      style={{ maxHeight: '200px', zIndex: 1050, backgroundColor: '#1a1d20' }}
                    >
                      <div
                        className="px-3 py-2 text-muted small"
                        style={{ cursor: 'pointer' }}
                        onMouseDown={() => clearIdea()}
                      >
                        Без идеи
                      </div>
                      {filteredIdeas.length === 0 ? (
                        <div className="px-3 py-2 text-muted small">Ничего не найдено</div>
                      ) : (
                        filteredIdeas.map(idea => (
                          <div
                            key={idea.id}
                            className={`px-3 py-2 small ${ideaId === idea.id ? 'text-primary fw-semibold' : 'text-white'}`}
                            style={{ cursor: 'pointer', borderTop: '1px solid #343a40' }}
                            onMouseDown={() => selectIdea(idea)}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2c2f33')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            {idea.title}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
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
