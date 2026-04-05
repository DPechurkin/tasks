import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ideasApi } from '../../api/ideas.ts'
import { plansApi } from '../../api/plans.ts'
import type { Idea, Plan } from '../../types/index.ts'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import LoadingSpinner from '../../components/LoadingSpinner.tsx'
import ConfirmModal from '../../components/ConfirmModal.tsx'
import IdeaModal from './IdeaModal.tsx'

export default function IdeaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [idea, setIdea] = useState<Idea | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [confirmDeleteIdea, setConfirmDeleteIdea] = useState(false)

  const [showLinkPlan, setShowLinkPlan] = useState(false)
  const [allPlans, setAllPlans] = useState<Plan[]>([])
  const [planSearch, setPlanSearch] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const [linkingPlan, setLinkingPlan] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    ideasApi.getById(Number(id))
      .then(data => setIdea(data))
      .catch(() => setError('Ошибка загрузки идеи'))
      .finally(() => setLoading(false))
  }, [id])

  const handleEditSave = useCallback(async (data: { title: string; description?: string }) => {
    if (!idea) return
    const updated = await ideasApi.update(idea.id, data)
    setIdea(updated)
  }, [idea])

  const handleDeleteIdea = useCallback(async () => {
    if (!idea) return
    try {
      await ideasApi.delete(idea.id)
      navigate('/ideas')
    } catch {
      setError('Ошибка удаления')
      setConfirmDeleteIdea(false)
    }
  }, [idea, navigate])

  const handleOpenLinkPlan = useCallback(async () => {
    setShowLinkPlan(true)
    setPlanSearch('')
    setSelectedPlanId(null)
    setLinkError(null)
    try {
      const plans = await plansApi.getAll()
      setAllPlans(plans)
    } catch {
      setLinkError('Ошибка загрузки планов')
    }
  }, [])

  const handleLinkPlan = useCallback(async () => {
    if (!idea || selectedPlanId === null) return
    setLinkingPlan(true)
    setLinkError(null)
    try {
      await ideasApi.linkPlan(idea.id, selectedPlanId)
      // Перезагружаем идею, чтобы получить актуальный список планов
      const updated = await ideasApi.getById(idea.id)
      setIdea(updated)
      setShowLinkPlan(false)
      setSelectedPlanId(null)
    } catch {
      setLinkError('Ошибка привязки плана')
    } finally {
      setLinkingPlan(false)
    }
  }, [idea, selectedPlanId])

  const handleUnlinkPlan = useCallback(async (planId: number) => {
    if (!idea) return
    try {
      await ideasApi.unlinkPlan(idea.id, planId)
      const updated = await ideasApi.getById(idea.id)
      setIdea(updated)
    } catch {
      setError('Ошибка отвязки плана')
    }
  }, [idea])

  const filteredPlans = allPlans.filter(p =>
    !idea?.plans?.some(lp => lp.id === p.id) &&
    p.title.toLowerCase().includes(planSearch.toLowerCase())
  )

  if (loading) return <LoadingSpinner />

  if (error && !idea) {
    return (
      <div className="container-fluid py-4" style={{ maxWidth: '900px' }}>
        <div className="alert alert-danger">{error}</div>
        <Link to="/ideas" className="btn btn-secondary btn-sm">← Все идеи</Link>
      </div>
    )
  }

  if (!idea) {
    return (
      <div className="container-fluid py-4" style={{ maxWidth: '900px' }}>
        <div className="alert alert-warning">Идея не найдена</div>
        <Link to="/ideas" className="btn btn-secondary btn-sm">← Все идеи</Link>
      </div>
    )
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: '900px' }}>
      {/* Навигация */}
      <div className="mb-3">
        <Link to="/ideas" className="btn btn-outline-secondary btn-sm">
          <i className="bi bi-arrow-left me-1"></i>Все идеи
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Заголовок и действия */}
      <div className="card bg-dark border-secondary mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start gap-3">
            <div className="flex-grow-1">
              <h2 className="h4 text-white mb-2" style={{ wordBreak: 'break-word' }}>
                <i className="bi bi-lightbulb me-2 text-warning"></i>
                {idea.title}
              </h2>
              {idea.description && (
                <p className="text-secondary mb-2" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {idea.description}
                </p>
              )}
              <small className="text-muted">
                Создана {format(new Date(idea.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
                {idea.updatedAt !== idea.createdAt && (
                  <> · Изменена {format(new Date(idea.updatedAt), 'd MMM yyyy, HH:mm', { locale: ru })}</>
                )}
              </small>
            </div>
            <div className="d-flex gap-2 flex-shrink-0">
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setEditModalOpen(true)}
                title="Редактировать"
              >
                <i className="bi bi-pencil me-1"></i>Изменить
              </button>
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={() => setConfirmDeleteIdea(true)}
                title="Удалить"
              >
                <i className="bi bi-trash me-1"></i>Удалить
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Секция привязанных планов */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0 text-white">
            <i className="bi bi-diagram-3 me-2 text-info"></i>
            Привязанные планы
            <span className="badge bg-secondary ms-2">{idea.plans?.length ?? 0}</span>
          </h5>
          <button
            className="btn btn-outline-info btn-sm"
            onClick={handleOpenLinkPlan}
          >
            <i className="bi bi-link-45deg me-1"></i>Привязать план
          </button>
        </div>

        {/* Форма привязки плана */}
        {showLinkPlan && (
          <div className="card bg-dark border-secondary mb-3">
            <div className="card-body">
              <h6 className="card-title text-white mb-3">Выбор плана для привязки</h6>
              {linkError && <div className="alert alert-danger py-2 mb-2">{linkError}</div>}
              <div className="mb-2">
                <input
                  type="text"
                  className="form-control bg-dark border-secondary text-white"
                  placeholder="Поиск планов..."
                  value={planSearch}
                  onChange={e => setPlanSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }} className="mb-3">
                {filteredPlans.length === 0 ? (
                  <p className="text-muted small mb-0 py-2 text-center">
                    {allPlans.length === 0 ? 'Нет доступных планов' : 'Нет совпадений'}
                  </p>
                ) : (
                  filteredPlans.map(plan => (
                    <div
                      key={plan.id}
                      className={`p-2 rounded mb-1 cursor-pointer ${selectedPlanId === plan.id ? 'bg-primary' : 'bg-secondary bg-opacity-25'}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedPlanId(plan.id)}
                    >
                      <div className="text-white fw-semibold">{plan.title}</div>
                      {plan.description && (
                        <small className="text-muted">{plan.description.slice(0, 80)}</small>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleLinkPlan}
                  disabled={selectedPlanId === null || linkingPlan}
                >
                  {linkingPlan
                    ? <><span className="spinner-border spinner-border-sm me-1"></span>Привязка...</>
                    : 'Привязать'
                  }
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setShowLinkPlan(false); setSelectedPlanId(null); setLinkError(null) }}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Список привязанных планов */}
        {!idea.plans || idea.plans.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <i className="bi bi-diagram-3 fs-3 mb-2 d-block"></i>
            <p className="mb-0">Нет привязанных планов</p>
          </div>
        ) : (
          idea.plans.map(plan => (
            <div key={plan.id} className="card bg-dark border-secondary mb-2">
              <div className="card-body py-2">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="flex-grow-1 min-width-0 me-2">
                    <Link to={`/plans/${plan.id}`} className="text-white text-decoration-none fw-semibold">
                      <i className="bi bi-arrow-right-circle me-1 text-info"></i>
                      {plan.title}
                    </Link>
                    {plan.description && (
                      <p className="mb-0 small text-muted mt-1">{plan.description.slice(0, 100)}</p>
                    )}
                  </div>
                  <button
                    className="btn btn-sm btn-outline-danger flex-shrink-0"
                    onClick={() => handleUnlinkPlan(plan.id)}
                    title="Отвязать план"
                  >✕</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Модальное окно редактирования */}
      <IdeaModal
        show={editModalOpen}
        onHide={() => setEditModalOpen(false)}
        onSave={handleEditSave}
        initialData={idea}
      />

      {/* Подтверждение удаления */}
      <ConfirmModal
        show={confirmDeleteIdea}
        message={`Удалить идею "${idea.title}"? Это действие нельзя отменить.`}
        onConfirm={handleDeleteIdea}
        onCancel={() => setConfirmDeleteIdea(false)}
      />
    </div>
  )
}
