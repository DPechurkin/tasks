import { useState, useEffect, useCallback } from 'react'
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
import type { Plan } from '../../types/index.ts'
import { getOrderBetween } from '../../utils/fractionalIndex.ts'
import PlanCard from './PlanCard.tsx'
import PlanModal from './PlanModal.tsx'
import ConfirmModal from '../../components/ConfirmModal.tsx'
import LoadingSpinner from '../../components/LoadingSpinner.tsx'
import EmptyState from '../../components/EmptyState.tsx'
import AddItemButton from '../../components/AddItemButton.tsx'

interface SortablePlanCardProps {
  plan: Plan
  onEdit: () => void
  onDelete: () => void
}

function SortablePlanCard({ plan, onEdit, onDelete }: SortablePlanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: plan.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div ref={setNodeRef} style={style}>
      <PlanCard
        plan={plan}
        onEdit={onEdit}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners } as Record<string, unknown>}
      />
    </div>
  )
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [insertAfter, setInsertAfter] = useState<number | null | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; title: string } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    plansApi.getAll()
      .then(data => setPlans(data))
      .catch(() => setError('Ошибка загрузки планов'))
      .finally(() => setLoading(false))
  }, [])

  const openModal = useCallback((afterId: number | undefined) => {
    setEditingPlan(null)
    setInsertAfter(afterId === undefined ? undefined : afterId)
    setModalOpen(true)
  }, [])

  const openEditModal = useCallback((plan: Plan) => {
    setEditingPlan(plan)
    setInsertAfter(undefined)
    setModalOpen(true)
  }, [])

  const handleSave = useCallback(async (data: { title: string; description?: string; ideaId?: number | null }) => {
    if (editingPlan) {
      const updated = await plansApi.update(editingPlan.id, data)
      setPlans(prev => prev.map(p => p.id === updated.id ? updated : p))
    } else {
      const insertAfterValue = insertAfter === undefined ? null : insertAfter
      const created = await plansApi.create({ ...data, insertAfter: insertAfterValue })
      if (insertAfter === undefined) {
        setPlans(prev => [created, ...prev])
      } else {
        setPlans(prev => {
          const idx = prev.findIndex(p => p.id === insertAfter)
          if (idx === -1) return [...prev, created]
          const next = [...prev]
          next.splice(idx + 1, 0, created)
          return next
        })
      }
    }
  }, [editingPlan, insertAfter])

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return
    try {
      await plansApi.delete(confirmDelete.id)
      setPlans(prev => prev.filter(p => p.id !== confirmDelete.id))
    } catch {
      setError('Ошибка удаления')
    } finally {
      setConfirmDelete(null)
    }
  }, [confirmDelete])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = plans.findIndex(p => p.id === active.id)
    const newIndex = plans.findIndex(p => p.id === over.id)

    const newPlans = arrayMove(plans, oldIndex, newIndex)
    setPlans(newPlans)

    const prevPlan = newPlans[newIndex - 1]
    const nextPlan = newPlans[newIndex + 1]
    const newOrder = getOrderBetween(prevPlan?.order ?? null, nextPlan?.order ?? null)

    try {
      await plansApi.reorder(Number(active.id), newOrder)
    } catch {
      setPlans(plans)
    }
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: '900px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">
          <i className="bi bi-kanban me-2 text-primary"></i>Планы
        </h1>
        <button className="btn btn-primary btn-sm" onClick={() => openModal(undefined)}>
          <i className="bi bi-plus me-1"></i>Новый план
        </button>
      </div>

      {loading && <LoadingSpinner />}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && plans.length === 0 && (
        <EmptyState
          icon="bi-kanban"
          text="Пока нет планов. Создайте первый!"
          actionLabel="Создать план"
          onAction={() => openModal(undefined)}
        />
      )}

      {!loading && plans.length > 0 && (
        <AddItemButton onClick={() => openModal(undefined)} label="Новый план" />
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={plans.map(p => p.id)} strategy={verticalListSortingStrategy}>
          {plans.map((plan) => (
            <div key={plan.id}>
              <SortablePlanCard
                plan={plan}
                onEdit={() => openEditModal(plan)}
                onDelete={() => setConfirmDelete({ id: plan.id, title: plan.title })}
              />
              <AddItemButton onClick={() => openModal(plan.id)} label="Новый план" />
            </div>
          ))}
        </SortableContext>
      </DndContext>

      <PlanModal
        show={modalOpen}
        onHide={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={editingPlan || undefined}
      />

      <ConfirmModal
        show={!!confirmDelete}
        message={`Удалить план «${confirmDelete?.title}»? Все задачи плана будут удалены.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
