import { useState, useEffect } from 'react'
import { scheduleApi } from '../../api/schedule.ts'

interface Props {
  show: boolean
  onHide: () => void
  taskId: number
  taskTitle: string
  onSaved: () => void
}

export default function ScheduleSlotModal({ show, onHide, taskId, taskTitle, onSaved }: Props) {
  const [date, setDate] = useState('')
  const [timeFrom, setTimeFrom] = useState('09:00')
  const [timeTo, setTimeTo] = useState('11:00')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (show) {
      setDate('')
      setTimeFrom('09:00')
      setTimeTo('11:00')
      setError(null)
    }
  }, [show])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date) { setError('Выберите дату'); return }
    if (timeFrom >= timeTo) { setError('Время начала должно быть раньше конца'); return }
    setSaving(true)
    try {
      await scheduleApi.create({ taskId, date, timeFrom, timeTo })
      onSaved()
      onHide()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string; conflict?: { taskTitle?: string; timeFrom?: string; timeTo?: string } } } }
      if (axiosErr.response?.status === 409) {
        const c = axiosErr.response.data?.conflict
        setError(`Пересечение с "${c?.taskTitle}" (${c?.timeFrom}–${c?.timeTo})`)
      } else {
        setError('Ошибка сохранения')
      }
    } finally {
      setSaving(false)
    }
  }

  if (!show) return null

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content bg-dark border-secondary">
          <div className="modal-header border-secondary">
            <h5 className="modal-title">Поставить в расписание</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onHide}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <p className="text-muted mb-3">{taskTitle}</p>
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <div className="mb-3">
                <label className="form-label">Дата</label>
                <input
                  type="date"
                  className="form-control bg-dark border-secondary text-white"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="row">
                <div className="col">
                  <label className="form-label">Начало</label>
                  <input
                    type="time"
                    className="form-control bg-dark border-secondary text-white"
                    value={timeFrom}
                    onChange={e => setTimeFrom(e.target.value)}
                  />
                </div>
                <div className="col">
                  <label className="form-label">Конец</label>
                  <input
                    type="time"
                    className="form-control bg-dark border-secondary text-white"
                    value={timeTo}
                    onChange={e => setTimeTo(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer border-secondary">
              <button type="button" className="btn btn-secondary" onClick={onHide}>Отмена</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Сохранение...' : 'Добавить'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
