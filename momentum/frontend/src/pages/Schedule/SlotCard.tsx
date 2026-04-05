import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ScheduledSlot } from '../../types/index.ts'
import { isSlotPast } from '../../utils/calendar.ts'
import StatusBadge from '../../components/StatusBadge.tsx'
import ConfirmModal from '../../components/ConfirmModal.tsx'
import RecurrenceScopeModal from '../../components/RecurrenceScopeModal.tsx'
import { scheduleApi } from '../../api/schedule.ts'

interface Props {
  slot: ScheduledSlot
  dateStr: string
  onRefresh: () => void
}

export default function SlotCard({ slot, dateStr, onRefresh }: Props) {
  const past = isSlotPast(dateStr, slot.timeFrom)
  const isRecurring = !!slot.recurrenceRuleId

  const [editTime, setEditTime] = useState(false)
  const [editFrom, setEditFrom] = useState(slot.timeFrom)
  const [editTo, setEditTo] = useState(slot.timeTo)
  const [comment, setComment] = useState(slot.comment ?? '')
  const [commentSaving, setCommentSaving] = useState(false)
  const [timeError, setTimeError] = useState<string | null>(null)

  // Scope modals
  const [showDeleteScope, setShowDeleteScope] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteScope, setDeleteScope] = useState<'single' | 'future'>('single')

  const [showEditScope, setShowEditScope] = useState(false)
  const [pendingEditScope, setPendingEditScope] = useState<'single' | 'future' | null>(null)

  const handleSaveTimeWithScope = async (scope: 'single' | 'future') => {
    if (editFrom >= editTo) { setTimeError('Начало должно быть раньше конца'); return }
    try {
      await scheduleApi.update(slot.id, { timeFrom: editFrom, timeTo: editTo, scope })
      setEditTime(false)
      onRefresh()
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { conflict?: { taskTitle?: string; timeFrom?: string; timeTo?: string }; conflicts?: Array<{ date: string; taskTitle: string; timeFrom: string; timeTo: string }> } } }
      if (e.response?.status === 409) {
        const conflicts = e.response.data?.conflicts
        const single = e.response.data?.conflict
        if (conflicts && conflicts.length > 0) {
          setTimeError(`Пересечения на ${conflicts.length} датах: ` + conflicts.slice(0, 2).map(c => `${c.date} ${c.timeFrom}–${c.timeTo}`).join(', '))
        } else if (single) {
          setTimeError(`Пересечение с "${single.taskTitle}" (${single.timeFrom}–${single.timeTo})`)
        } else {
          setTimeError('Ошибка сохранения')
        }
      } else {
        setTimeError('Ошибка сохранения')
      }
    }
  }

  const handleSaveTimeClick = () => {
    if (editFrom >= editTo) { setTimeError('Начало должно быть раньше конца'); return }
    if (isRecurring) {
      setShowEditScope(true)
    } else {
      handleSaveTimeWithScope('single')
    }
  }

  const handleDeleteWithScope = async (scope: 'single' | 'future') => {
    await scheduleApi.delete(slot.id, scope)
    setShowDeleteConfirm(false)
    onRefresh()
  }

  const handleDeleteClick = () => {
    if (isRecurring) {
      setShowDeleteScope(true)
    } else {
      setShowDeleteConfirm(true)
    }
  }

  const handleSaveComment = async () => {
    setCommentSaving(true)
    try {
      await scheduleApi.update(slot.id, { comment })
      onRefresh()
    } finally {
      setCommentSaving(false)
    }
  }

  return (
    <div className="card bg-dark border-secondary mb-2">
      <div className="card-body py-2">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            {!editTime ? (
              <span className="badge bg-secondary me-2">
                {slot.timeFrom}–{slot.timeTo}
                {isRecurring && <i className="bi bi-arrow-repeat ms-1" title="Повторяющееся"></i>}
              </span>
            ) : (
              <div className="d-flex gap-1 align-items-center mb-1">
                <input type="time" className="form-control form-control-sm bg-dark border-secondary text-white"
                  style={{ width: '100px' }} value={editFrom} onChange={e => setEditFrom(e.target.value)} />
                <span className="text-muted">–</span>
                <input type="time" className="form-control form-control-sm bg-dark border-secondary text-white"
                  style={{ width: '100px' }} value={editTo} onChange={e => setEditTo(e.target.value)} />
                <button className="btn btn-sm btn-success py-0 px-2" onClick={handleSaveTimeClick}>✓</button>
                <button className="btn btn-sm btn-secondary py-0 px-2" onClick={() => { setEditTime(false); setTimeError(null) }}>✕</button>
              </div>
            )}
            {timeError && <div className="text-danger small">{timeError}</div>}
            <Link to={`/plans/${slot.planId}/tasks/${slot.taskId}`} className="text-white text-decoration-none fw-semibold">
              {slot.taskTitle}
            </Link>
            <span className="text-muted small ms-2">· {slot.planTitle}</span>
            {slot.taskStatus && <StatusBadge status={slot.taskStatus} className="ms-2" />}
          </div>

          <div className="d-flex gap-1">
            {past ? (
              <i className="bi bi-lock text-muted"></i>
            ) : (
              <>
                {!editTime && (
                  <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={() => setEditTime(true)}>
                    <i className="bi bi-clock"></i>
                  </button>
                )}
                <button className="btn btn-sm btn-outline-danger py-0 px-1" onClick={handleDeleteClick}>
                  <i className="bi bi-trash"></i>
                </button>
              </>
            )}
          </div>
        </div>

        {past ? (
          <div className="mt-2">
            <textarea className="form-control form-control-sm bg-dark border-secondary text-white"
              rows={2} placeholder="Добавить комментарий..."
              value={comment} onChange={e => setComment(e.target.value)} />
            <button className="btn btn-sm btn-outline-primary mt-1" onClick={handleSaveComment} disabled={commentSaving}>
              {commentSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        ) : (
          slot.comment && <p className="mb-0 mt-1 small text-secondary">{slot.comment}</p>
        )}
      </div>

      {/* Scope modal для редактирования времени */}
      <RecurrenceScopeModal
        show={showEditScope}
        action="edit"
        onSingle={() => { setShowEditScope(false); handleSaveTimeWithScope('single') }}
        onFuture={() => { setShowEditScope(false); handleSaveTimeWithScope('future') }}
        onCancel={() => { setShowEditScope(false); setPendingEditScope(null) }}
      />

      {/* Scope modal для удаления */}
      <RecurrenceScopeModal
        show={showDeleteScope}
        action="delete"
        onSingle={() => { setShowDeleteScope(false); setDeleteScope('single'); setShowDeleteConfirm(true) }}
        onFuture={() => { setShowDeleteScope(false); setDeleteScope('future'); setShowDeleteConfirm(true) }}
        onCancel={() => setShowDeleteScope(false)}
      />

      <ConfirmModal
        show={showDeleteConfirm}
        message={deleteScope === 'future'
          ? `Удалить "${slot.taskTitle}" и все последующие повторения из расписания?`
          : `Удалить задачу "${slot.taskTitle}" из расписания на ${slot.timeFrom}–${slot.timeTo}?`}
        confirmLabel="Удалить"
        onConfirm={() => handleDeleteWithScope(deleteScope)}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
