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
import { plansApi } from '../../api/plans.ts'
import { tasksApi } from '../../api/tasks.ts'
import type { Plan, Task, TaskStatus } from '../../types/index.ts'
import { getOrderBetween } from '../../utils/fractionalIndex.ts'
import TaskCard from './TaskCard.tsx'
import TaskModal from '../../components/TaskModal.tsx'
import PlanModal from './PlanModal.tsx'
import ConfirmModal from '../../components/ConfirmModal.tsx'
import LoadingSpinner from '../../components/LoadingSpinner.tsx'
import AddItemButton from '../../components/AddItemButton.tsx'

interface SortableTaskCardProps {
  task: Task
  index: number
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: TaskStatus) => void
}

function SortableTaskCard({ task, index, onEdit, onDelete, onStatusChange }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        index={index}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        dragHandleProps={{ ...attributes, ...listeners } as Record<string, unknown>}
      />
    </div>
  )
}

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [plan, setPlan] = useState<Plan | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [insertTaskAfter, setInsertTaskAfter] = useState<number | null | undefined>(undefined)
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<{ id: number; title: string } | null>(null)

  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [confirmDeletePlan, setConfirmDeletePlan] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (!id) return
    plansApi.getById(Number(id))
      .then(data => {
        setPlan(data)
        setTasks(data.tasks ?? [])
      })
      .catch(() => setError('Ошибка загрузки плана'))
      .finally(() => setLoading(false))
  }, [id])

  const openTaskModal = useCallback((afterId: number | undefined) => {
    setEditingTask(null)
    setInsertTaskAfter(afterId === undefined ? undefined : afterId)
    setTaskModalOpen(true)
  }, [])

  const openEditTaskModal = useCallback((task: Task) => {
    setEditingTask(task)
    setInsertTaskAfter(undefined)
    setTaskModalOpen(true)
  }, [])

  const handleTaskSave = useCallback(async (data: { title: string; description?: string; status?: TaskStatus }) => {
    if (!plan) return
    if (editingTask) {
      const updated = await tasksApi.update(editingTask.id, data)
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    } else {
      const insertAfterValue = insertTaskAfter === undefined ? null : insertTaskAfter
      const created = await tasksApi.create(plan.id, { ...data, insertAfter: insertAfterValue })
      if (insertTaskAfter === undefined) {
        setTasks(prev => [created, ...prev])
      } else {
        setTasks(prev => {
          const idx = prev.findIndex(t => t.id === insertTaskAfter)
          if (idx === -1) return [...prev, created]
          const next = [...prev]
          next.splice(idx + 1, 0, created)
          return next
        })
      }
    }
  }, [plan, editingTask, insertTaskAfter])

  const handleTaskDelete = useCallback(async () => {
    if (!confirmDeleteTask) return
    try {
      await tasksApi.delete(confirmDeleteTask.id)
      setTasks(prev => prev.filter(t => t.id !== confirmDeleteTask.id))
    } catch {
      setError('Ошибка удаления задачи')
    } finally {
      setConfirmDeleteTask(null)
    }
  }, [confirmDeleteTask])

  const handleStatusChange = useCallback(async (task: Task, status: TaskStatus) => {
    try {
      const updated = await tasksApi.update(task.id, { status })
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    } catch {
      setError('Ошибка изменения статуса')
    }
  }, [])

  const handlePlanSave = useCallback(async (data: { title: string; description?: string; ideaId?: number | null }) => {
    if (!plan) return
    const updated = await plansApi.update(plan.id, data)
    setPlan(updated)
  }, [plan])

  const handlePlanDelete = useCallback(async () => {
    if (!plan) return
    try {
      await plansApi.delete(plan.id)
      navigate('/plans')
    } catch {
      setError('Ошибка удаления плана')
    } finally {
      setConfirmDeletePlan(false)
    }
  }, [plan, navigate])

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!plan) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tasks.findIndex(t => t.id === active.id)
    const newIndex = tasks.findIndex(t => t.id === over.id)

    const newTasks = arrayMove(tasks, oldIndex, newIndex)
    setTasks(newTasks)

    const prevTask = newTasks[newIndex - 1]
    const nextTask = newTasks[newIndex + 1]
    const newOrder = getOrderBetween(prevTask?.order ?? null, nextTask?.order ?? null)

    try {
      await tasksApi.reorder(plan.id, Number(active.id), newOrder)
    } catch {
      setTasks(tasks)
    }
  }

  if (loading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="container-fluid py-4" style={{ maxWidth: '900px' }}>
        <div className="alert alert-danger">{error}</div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="container-fluid py-4" style={{ maxWidth: '900px' }}>
        <div className="alert alert-warning">План не найден</div>
      </div>
    )
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: '900px' }}>
      {/* Шапка с навигацией */}
      <div className="d-flex gap-3 mb-3">
        <Link to="/plans" className="text-decoration-none text-muted small">
          <i className="bi bi-arrow-left me-1"></i>Все планы
        </Link>
        {plan.ideaId && (
          <Link to={`/ideas/${plan.ideaId}`} className="text-decoration-none text-muted small">
            <i className="bi bi-arrow-left me-1"></i>Идея: {plan.ideaTitle ?? 'Идея'}
          </Link>
        )}
      </div>

      {/* Заголовок плана */}
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div className="flex-grow-1">
          <h2 className="h3 mb-1">{plan.title}</h2>
          {plan.description && (
            <p className="text-secondary mb-0" style={{ whiteSpace: 'pre-wrap' }}>{plan.description}</p>
          )}
        </div>
        <div className="d-flex gap-2 ms-3 flex-shrink-0">
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setPlanModalOpen(true)}
          >
            <i className="bi bi-pencil me-1"></i>Редактировать
          </button>
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={() => setConfirmDeletePlan(true)}
          >
            <i className="bi bi-trash me-1"></i>Удалить
          </button>
        </div>
      </div>

      <hr className="border-secondary" />

      {/* Задачи */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Задачи ({tasks.length})</h5>
        <button
          className="btn btn-outline-primary btn-sm"
          onClick={() => openTaskModal(undefined)}
        >
          <i className="bi bi-plus me-1"></i>Новая задача
        </button>
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-4 text-muted">
          <i className="bi bi-list-task fs-1 mb-3 d-block"></i>
          <p className="mb-3">Нет задач. Создайте первую!</p>
          <button className="btn btn-primary btn-sm" onClick={() => openTaskModal(undefined)}>
            Создать задачу
          </button>
        </div>
      )}

      {tasks.length > 0 && (
        <AddItemButton onClick={() => openTaskModal(undefined)} label="Новая задача" />
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task, index) => (
            <div key={task.id}>
              <SortableTaskCard
                task={task}
                index={index}
                onEdit={() => openEditTaskModal(task)}
                onDelete={() => setConfirmDeleteTask({ id: task.id, title: task.title })}
                onStatusChange={(status) => handleStatusChange(task, status)}
              />
              <AddItemButton onClick={() => openTaskModal(task.id)} label="Новая задача" />
            </div>
          ))}
        </SortableContext>
      </DndContext>

      <TaskModal
        show={taskModalOpen}
        onHide={() => setTaskModalOpen(false)}
        onSave={handleTaskSave}
        initialData={editingTask || undefined}
      />

      <ConfirmModal
        show={!!confirmDeleteTask}
        message={`Удалить задачу «${confirmDeleteTask?.title}»? Записи в расписании тоже удалятся.`}
        onConfirm={handleTaskDelete}
        onCancel={() => setConfirmDeleteTask(null)}
      />

      <PlanModal
        show={planModalOpen}
        onHide={() => setPlanModalOpen(false)}
        onSave={handlePlanSave}
        initialData={plan}
      />

      <ConfirmModal
        show={confirmDeletePlan}
        message={`Удалить план «${plan.title}»? Все задачи плана будут удалены.`}
        onConfirm={handlePlanDelete}
        onCancel={() => setConfirmDeletePlan(false)}
      />
    </div>
  )
}
