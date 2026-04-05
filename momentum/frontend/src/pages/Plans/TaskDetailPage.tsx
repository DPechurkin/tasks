import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { tasksApi } from '../../api/tasks.ts'
import type { Task, ScheduledSlot, TaskStatus } from '../../types/index.ts'
import { getOrderBetween } from '../../utils/fractionalIndex.ts'
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
            <span className="badge bg-secondary me-2">{slot.timeFrom}–{slot.timeTo}</span>
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

interface SortableSubtaskRowProps {
  task: Task
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (s: TaskStatus) => void
}

function SortableSubtaskRow({ task, onEdit, onDelete, onStatusChange }: SortableSubtaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return (
    <div ref={setNodeRef} style={style} className="card bg-dark border-secondary mb-2">
      <div className="card-body py-2">
        <div className="d-flex align-items-center gap-2">
          <span {...attributes} {...listeners} className="text-muted" style={{ cursor: 'grab' }}>⠿</span>
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between align-items-center">
              <Link
                to={`/plans/${task.planId}/tasks/${task.id}`}
                className="text-white text-decoration-none fw-semibold"
              >
                {task.title}
              </Link>
              <div className="d-flex gap-1 align-items-center">
                {(task.subtasksCount ?? 0) > 0 && (
                  <span className="badge bg-info text-dark">
                    <i className="bi bi-diagram-3 me-1"></i>{task.subtasksCount}
                  </span>
                )}
                <div className="dropdown">
                  <button className="btn btn-sm btn-outline-secondary py-0 px-1 dropdown-toggle" data-bs-toggle="dropdown" type="button">
                    <StatusBadge status={task.status} />
                  </button>
                  <ul className="dropdown-menu dropdown-menu-dark dropdown-menu-end">
                    {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(s => (
                      <li key={s}>
                        <button className="dropdown-item" type="button" onClick={() => onStatusChange(s)}>
                          <StatusBadge status={s} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={onEdit} type="button">
                  <i className="bi bi-pencil"></i>
                </button>
                <button className="btn btn-sm btn-outline-danger py-0 px-1" onClick={onDelete} type="button">
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            </div>
            {task.description && (
              <p className="mb-0 mt-1 small text-secondary">
                {task.description.slice(0, 100)}{task.description.length > 100 ? '...' : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TaskDetailPage() {
  const { id, planId } = useParams<{ id: string; planId: string }>()
  const navigate = useNavigate()

  const [task, setTask] = useState<Task | null>(null)
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showSlotModal, setShowSlotModal] = useState(false)

  // Подзадачи — создание/редактирование
  const [subtaskModalOpen, setSubtaskModalOpen] = useState(false)
  const [editingSubtask, setEditingSubtask] = useState<Task | null>(null)
  const [insertSubtaskAfter, setInsertSubtaskAfter] = useState<number | null | undefined>(undefined)
  const [confirmDeleteSubtask, setConfirmDeleteSubtask] = useState<{ id: number; title: string } | null>(null)
  const [newSubtaskId, setNewSubtaskId] = useState<number | null>(null)

  useEffect(() => {
    if (newSubtaskId === null) return
    setTimeout(() => {
      document.getElementById(`subtask-${newSubtaskId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      setNewSubtaskId(null)
    }, 50)
  }, [newSubtaskId])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const fetchTask = useCallback(() => {
    if (!id) return
    tasksApi.getById(Number(id))
      .then(data => {
        setTask(data)
        setSubtasks(data.subtasks ?? [])
      })
      .catch(() => setError('Ошибка загрузки задачи'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { fetchTask() }, [fetchTask])

  const handleStatusChange = useCallback(async (status: TaskStatus) => {
    if (!task) return
    try {
      const updated = await tasksApi.update(task.id, { status })
      setTask(prev => prev ? { ...prev, ...updated } : null)
    } catch {
      setError('Ошибка изменения статуса')
    }
  }, [task])

  const handleSave = useCallback(async (data: { title: string; description?: string; status?: TaskStatus }) => {
    if (!task) return
    const updated = await tasksApi.update(task.id, data)
    setTask(prev => prev ? { ...prev, ...updated } : null)
  }, [task])

  const handleDelete = useCallback(async () => {
    if (!task) return
    try {
      await tasksApi.delete(task.id)
      // Переходим к родительской задаче или к плану
      if (task.parentTaskId) {
        navigate(`/plans/${task.planId}/tasks/${task.parentTaskId}`)
      } else {
        navigate(`/plans/${task.planId}`)
      }
    } catch {
      setError('Ошибка удаления задачи')
    } finally {
      setConfirmDelete(false)
    }
  }, [task, navigate])

  // Подзадачи
  const openSubtaskModal = useCallback((afterId: number | undefined) => {
    setEditingSubtask(null)
    setInsertSubtaskAfter(afterId === undefined ? undefined : afterId)
    setSubtaskModalOpen(true)
  }, [])

  const openEditSubtaskModal = useCallback((subtask: Task) => {
    setEditingSubtask(subtask)
    setInsertSubtaskAfter(undefined)
    setSubtaskModalOpen(true)
  }, [])

  const handleSubtaskSave = useCallback(async (data: { title: string; description?: string; status?: TaskStatus }) => {
    if (!task) return
    if (editingSubtask) {
      const updated = await tasksApi.update(editingSubtask.id, data)
      setSubtasks(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))
    } else {
      const insertAfterValue = insertSubtaskAfter === undefined ? null : insertSubtaskAfter
      const created = await tasksApi.createSubtask(task.id, { ...data, insertAfter: insertAfterValue })
      if (insertSubtaskAfter === undefined) {
        setSubtasks(prev => [...prev, created])
      } else {
        setSubtasks(prev => {
          const idx = prev.findIndex(s => s.id === insertSubtaskAfter)
          if (idx === -1) return [...prev, created]
          const next = [...prev]
          next.splice(idx + 1, 0, created)
          return next
        })
      }
      setNewSubtaskId(created.id)
    }
  }, [task, editingSubtask, insertSubtaskAfter])

  const handleSubtaskDelete = useCallback(async () => {
    if (!confirmDeleteSubtask) return
    try {
      await tasksApi.delete(confirmDeleteSubtask.id)
      setSubtasks(prev => prev.filter(s => s.id !== confirmDeleteSubtask.id))
    } catch {
      setError('Ошибка удаления подзадачи')
    } finally {
      setConfirmDeleteSubtask(null)
    }
  }, [confirmDeleteSubtask])

  const handleSubtaskStatusChange = useCallback(async (subtask: Task, status: TaskStatus) => {
    try {
      const updated = await tasksApi.update(subtask.id, { status })
      setSubtasks(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))
    } catch {
      setError('Ошибка изменения статуса')
    }
  }, [])

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!task) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = subtasks.findIndex(s => s.id === active.id)
    const newIndex = subtasks.findIndex(s => s.id === over.id)

    const newSubtasks = arrayMove(subtasks, oldIndex, newIndex)
    setSubtasks(newSubtasks)

    const prev = newSubtasks[newIndex - 1]
    const next = newSubtasks[newIndex + 1]
    const newOrder = getOrderBetween(prev?.order ?? null, next?.order ?? null)

    try {
      await tasksApi.reorder(task.planId, Number(active.id), newOrder)
    } catch {
      setSubtasks(subtasks)
    }
  }

  if (loading) return <LoadingSpinner />
  if (error) return <div className="container-fluid py-4" style={{ maxWidth: '900px' }}><div className="alert alert-danger">{error}</div></div>
  if (!task) return <div className="container-fluid py-4" style={{ maxWidth: '900px' }}><div className="alert alert-warning">Задача не найдена</div></div>

  const effectivePlanId = planId ?? task.planId

  return (
    <div className="container-fluid py-4" style={{ maxWidth: '900px' }}>
      {/* Навигация */}
      <div className="mb-2">
        {task.parentTaskId ? (
          <Link to={`/plans/${effectivePlanId}/tasks/${task.parentTaskId}`} className="text-decoration-none text-muted small">
            <i className="bi bi-arrow-left me-1"></i>Назад к задаче
          </Link>
        ) : (
          <Link to={`/plans/${effectivePlanId}`} className="text-decoration-none text-muted small">
            <i className="bi bi-arrow-left me-1"></i>Назад к плану
          </Link>
        )}
      </div>
      <Breadcrumb items={[
        ...(task.ideaId ? [{ label: task.ideaTitle ?? 'Идея', href: `/ideas/${task.ideaId}` }] : []),
        { label: task.planTitle ?? 'План', href: `/plans/${effectivePlanId}` },
        ...(task.parentTaskId ? [{ label: task.parentTaskTitle ?? 'Задача', href: `/plans/${effectivePlanId}/tasks/${task.parentTaskId}` }] : []),
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
          <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditModalOpen(true)}>
            <i className="bi bi-pencil me-1"></i>Редактировать
          </button>
          <button className="btn btn-outline-danger btn-sm" onClick={() => setConfirmDelete(true)}>
            <i className="bi bi-trash me-1"></i>Удалить
          </button>
        </div>
      </div>

      {task.description && (
        <p className="text-secondary mb-4" style={{ whiteSpace: 'pre-wrap' }}>{task.description}</p>
      )}

      {/* Подзадачи */}
      <div className="d-flex justify-content-between align-items-center bg-dark"
        style={{ position: 'sticky', top: '56px', zIndex: 100, padding: '12px 0', marginBottom: '1rem' }}>
        <h5 className="mb-0"><i className="bi bi-diagram-3 me-2"></i>Подзадачи ({subtasks.length})</h5>
        <button className="btn btn-outline-primary btn-sm" onClick={() => openSubtaskModal(undefined)}>
          <i className="bi bi-plus me-1"></i>Добавить подзадачу
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={subtasks.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {subtasks.map(subtask => (
            <div key={subtask.id} id={`subtask-${subtask.id}`}>
              <SortableSubtaskRow
                task={subtask}
                onEdit={() => openEditSubtaskModal(subtask)}
                onDelete={() => setConfirmDeleteSubtask({ id: subtask.id, title: subtask.title })}
                onStatusChange={status => handleSubtaskStatusChange(subtask, status)}
              />
            </div>
          ))}
        </SortableContext>
      </DndContext>

      {subtasks.length === 0 && (
        <p className="text-muted small mb-4">Нет подзадач</p>
      )}

      <hr className="border-secondary" />

      {/* Расписание */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0"><i className="bi bi-calendar3 me-2"></i>Расписание</h5>
        <button className="btn btn-outline-primary btn-sm" onClick={() => setShowSlotModal(true)}>
          <i className="bi bi-plus me-1"></i>Поставить в расписание
        </button>
      </div>

      {(task.slots ?? []).length === 0 ? (
        <p className="text-muted small">Нет записей в расписании</p>
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
        message={`Удалить задачу «${task.title}»? Записи в расписании и все подзадачи тоже удалятся.`}
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

      <TaskModal
        show={subtaskModalOpen}
        onHide={() => setSubtaskModalOpen(false)}
        onSave={handleSubtaskSave}
        initialData={editingSubtask || undefined}
      />

      <ConfirmModal
        show={!!confirmDeleteSubtask}
        message={`Удалить подзадачу «${confirmDeleteSubtask?.title}»?`}
        onConfirm={handleSubtaskDelete}
        onCancel={() => setConfirmDeleteSubtask(null)}
      />
    </div>
  )
}
