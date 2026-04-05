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
import { ideasApi } from '../../api/ideas.ts'
import type { Idea } from '../../types/index.ts'
import { getOrderBetween } from '../../utils/fractionalIndex.ts'
import IdeaCard from './IdeaCard.tsx'
import IdeaModal from './IdeaModal.tsx'
import ConfirmModal from '../../components/ConfirmModal.tsx'
import LoadingSpinner from '../../components/LoadingSpinner.tsx'
import EmptyState from '../../components/EmptyState.tsx'

interface SortableIdeaCardProps {
  idea: Idea
  onEdit: () => void
  onDelete: () => void
}

function SortableIdeaCard({ idea, onEdit, onDelete }: SortableIdeaCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: idea.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div ref={setNodeRef} style={style}>
      <IdeaCard
        idea={idea}
        onEdit={onEdit}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners } as Record<string, unknown>}
      />
    </div>
  )
}

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null)
  const [insertAfter, setInsertAfter] = useState<number | null | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; title: string } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    ideasApi.getAll()
      .then(data => setIdeas(data))
      .catch(() => setError('Ошибка загрузки идей'))
      .finally(() => setLoading(false))
  }, [])

  const openModal = useCallback((afterId: number | undefined) => {
    setEditingIdea(null)
    // undefined = перед первой, number = после конкретного ID
    setInsertAfter(afterId === undefined ? undefined : afterId)
    setModalOpen(true)
  }, [])

  const openEditModal = useCallback((idea: Idea) => {
    setEditingIdea(idea)
    setInsertAfter(undefined)
    setModalOpen(true)
  }, [])

  const handleSave = useCallback(async (data: { title: string; description?: string }) => {
    if (editingIdea) {
      const updated = await ideasApi.update(editingIdea.id, data)
      setIdeas(prev => prev.map(i => i.id === updated.id ? updated : i))
    } else {
      // insertAfter: undefined = перед первой (null), number = после ID
      const insertAfterValue = insertAfter === undefined ? null : insertAfter
      const created = await ideasApi.create({ ...data, insertAfter: insertAfterValue })
      if (insertAfter === undefined) {
        // перед первой — добавить в начало
        setIdeas(prev => [created, ...prev])
      } else {
        // после конкретного ID
        setIdeas(prev => {
          const idx = prev.findIndex(i => i.id === insertAfter)
          if (idx === -1) return [...prev, created]
          const next = [...prev]
          next.splice(idx + 1, 0, created)
          return next
        })
      }
    }
  }, [editingIdea, insertAfter])

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return
    try {
      await ideasApi.delete(confirmDelete.id)
      setIdeas(prev => prev.filter(i => i.id !== confirmDelete.id))
    } catch {
      setError('Ошибка удаления')
    } finally {
      setConfirmDelete(null)
    }
  }, [confirmDelete])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = ideas.findIndex(i => i.id === active.id)
    const newIndex = ideas.findIndex(i => i.id === over.id)

    const newIdeas = arrayMove(ideas, oldIndex, newIndex)
    setIdeas(newIdeas) // оптимистичное обновление

    // Вычислить новый order
    const prevIdea = newIdeas[newIndex - 1]
    const nextIdea = newIdeas[newIndex + 1]
    const newOrder = getOrderBetween(prevIdea?.order ?? null, nextIdea?.order ?? null)

    try {
      await ideasApi.reorder(Number(active.id), newOrder)
    } catch {
      setIdeas(ideas) // откат
    }
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: '900px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">
          <i className="bi bi-lightbulb me-2 text-warning"></i>Идеи
        </h1>
        <button className="btn btn-primary btn-sm" onClick={() => openModal(undefined)}>
          <i className="bi bi-plus me-1"></i>Новая идея
        </button>
      </div>

      {loading && <LoadingSpinner />}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && ideas.length === 0 && (
        <EmptyState
          icon="bi-lightbulb"
          text="Пока нет идей. Создайте первую!"
          actionLabel="Создать идею"
          onAction={() => openModal(undefined)}
        />
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ideas.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {ideas.map((idea) => (
            <SortableIdeaCard
              key={idea.id}
              idea={idea}
              onEdit={() => openEditModal(idea)}
              onDelete={() => setConfirmDelete({ id: idea.id, title: idea.title })}
            />
          ))}
        </SortableContext>
      </DndContext>

      <IdeaModal
        show={modalOpen}
        onHide={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={editingIdea || undefined}
      />

      <ConfirmModal
        show={!!confirmDelete}
        message={`Удалить идею "${confirmDelete?.title}"?`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
