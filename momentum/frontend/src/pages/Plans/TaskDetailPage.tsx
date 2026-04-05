import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { tasksApi } from '../../api/tasks.ts'
import type { Task, ScheduledSlot, TaskStatus } from '../../types/index.ts'
import StatusBadge, { STATUS_CONFIG } from '../../components/StatusBadge.tsx'
import Breadcrumb from '../../components/Breadcrumb.tsx'
import LoadingSpinner from '../../components/LoadingSpinner.tsx'
import TaskModal from '../../components/TaskModal.tsx'
import ConfirmModal from '../../components/ConfirmModal.tsx'
import ScheduleSlotModal from '../../components/Schedule/ScheduleSlotModal.tsx'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { isSlotPast } from '../../utils/calendar.ts'

function SlotRow({ slot }: { slot: ScheduledSlot }) {
  const past = isSlotPast(slot.date, slot.timeFrom)
  return (
    <div className="card bg-dark border-secondary mb-2">
      <div className="card-body py-2">
        <div className="d-flex align-items-start justify-content-between">
          <div>
            <span className="text-white me-2">
              {format(new Date(slot.date), 'd MMM yyyy', { locale: ru })}
            </span>
            <span className="badge bg-secondary me-2">
              {slot.timeFrom}–{slot.timeTo}
            </span>
            {past && <i className="bi bi-lock text-muted"></i>}
          </div>
          <Link to={`/schedule/${slot.date}`} className="btn btn-sm btn-outline-secondary py-0">
            <i className="bi bi-calendar3 me-1"></i>Открыть в расписании
          </Link>
        </div>
        {slot.comment && (
          <p className="mb-0 mt-1 small text-secondary">{slot.comment}</p>
        )}
      </div>
    </div>
  )
}

export default function TaskDetailPage() {
  const { id, planId } = useParams<{ id: string; planId: string }>()
  const navigate = useNavigate()

  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showSlotModal, setShowSlotModal] = useState(false)

  const fetchTask = useCallback(() => {
    if (!id) return
    tasksApi.getById(Number(id))
      .then(data => setTask(data))
      .catch(() => setError('Ошибка загрузки задачи'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchTask()
  }, [fetchTask])

  const handleStatusChange = useCallback(async (status: TaskStatus) => {
    if (!task) return
    try {
      const updated = await tasksApi.update(task.id, { status })
      setTask(updated)
    } catch {
      setError('Ошибка изменения статуса')
    }
  }, [task])

  const handleSave = useCallback(async (data: { title: string; description?: string; status?: TaskStatus }) => {
    if (!task) return
    const updated = await tasksApi.update(task.id, data)
    setTask(updated)
  }, [task])

  const handleDelete = useCallback(async () => {
    if (!task) return
    try {
      await tasksApi.delete(task.id)
      navigate(`/plans/${task.planId}`)
    } catch {
      setError('Ошибка удаления задачи')
    } finally {
      setConfirmDelete(false)
    }
  }, [task, navigate])

  if (loading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="container-fluid py-4" style={{ maxWidth: '900px' }}>
        <div className="alert alert-danger">{error}</div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="container-fluid py-4" style={{ maxWidth: '900px' }}>
        <div className="alert alert-warning">Задача не найдена</div>
      </div>
    )
  }

  const effectivePlanId = planId ?? task.planId

  return (
    <div className="container-fluid py-4" style={{ maxWidth: '900px' }}>
      <div className="mb-2">
        <Link to={`/plans/${effectivePlanId}`} className="text-decoration-none text-muted small">
          <i className="bi bi-arrow-left me-1"></i>Назад к плану
        </Link>
      </div>
      <Breadcrumb items={[
        ...(task.ideaId ? [{ label: task.ideaTitle ?? 'Идея', href: `/ideas/${task.ideaId}` }] : []),
        { label: task.planTitle ?? 'План', href: `/plans/${effectivePlanId}` },
        { label: task.title },
      ]} />

      {/* Заголовок и статус */}
      <div className="d-flex justify-content-between align-items-start mb-3">
        <h2 className="h4">{task.title}</h2>
        <div className="d-flex gap-2 align-items-center">
          <div className="dropdown">
            <button className="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" type="button">
              <StatusBadge status={task.status} />
            </button>
            <ul className="dropdown-menu dropdown-menu-dark dropdown-menu-end">
              {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(s => (
                <li key={s}>
                  <button className="dropdown-item" type="button" onClick={() => handleStatusChange(s)}>
                    <StatusBadge status={s} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setEditModalOpen(true)}
          >
            <i className="bi bi-pencil me-1"></i>Редактировать
          </button>
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={() => setConfirmDelete(true)}
          >
            <i className="bi bi-trash me-1"></i>Удалить
          </button>
        </div>
      </div>

      {/* Описание */}
      {task.description && (
        <p className="text-secondary mb-4" style={{ whiteSpace: 'pre-wrap' }}>{task.description}</p>
      )}

      {/* Расписание задачи */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0"><i className="bi bi-calendar3 me-2"></i>Расписание</h5>
        <button className="btn btn-outline-primary btn-sm" onClick={() => setShowSlotModal(true)}>
          <i className="bi bi-plus me-1"></i>Поставить в расписание
        </button>
      </div>

      {(task.slots ?? []).length === 0 ? (
        <p className="text-muted">Нет записей в расписании</p>
      ) : (
        (task.slots ?? []).map(slot => <SlotRow key={slot.id} slot={slot} />)
      )}

      <TaskModal
        show={editModalOpen}
        onHide={() => setEditModalOpen(false)}
        onSave={handleSave}
        initialData={task}
      />

      <ConfirmModal
        show={confirmDelete}
        message={`Удалить задачу «${task.title}»? Записи в расписании тоже удалятся.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <ScheduleSlotModal
        show={showSlotModal}
        onHide={() => setShowSlotModal(false)}
        taskId={task.id}
        taskTitle={task.title}
        onSaved={fetchTask}
      />
    </div>
  )
}
