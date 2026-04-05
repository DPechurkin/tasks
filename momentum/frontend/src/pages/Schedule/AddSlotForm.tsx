import { useState, useEffect } from 'react'
import { scheduleApi } from '../../api/schedule.ts'
import { plansApi } from '../../api/plans.ts'
import { tasksApi } from '../../api/tasks.ts'
import type { Plan, Task } from '../../types/index.ts'

interface Props {
  date: string       // YYYY-MM-DD
  onSaved: () => void
  onCancel: () => void
}

export default function AddSlotForm({ date, onSaved, onCancel }: Props) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [timeFrom, setTimeFrom] = useState('09:00')
  const [timeTo, setTimeTo] = useState('11:00')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    plansApi.getAll().then(setPlans).catch(console.error)
  }, [])

  useEffect(() => {
    if (selectedPlanId) {
      tasksApi.getByPlan(selectedPlanId).then(setTasks).catch(console.error)
      setSelectedTaskId(null)
    } else {
      setTasks([])
    }
  }, [selectedPlanId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTaskId) { setError('Выберите задачу'); return }
    if (timeFrom >= timeTo) { setError('Начало должно быть раньше конца'); return }
    setSaving(true)
    setError(null)
    try {
      await scheduleApi.create({ taskId: selectedTaskId, date, timeFrom, timeTo })
      onSaved()
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { conflict?: { taskTitle?: string; timeFrom?: string; timeTo?: string } } } }
      if (e.response?.status === 409) {
        const c = e.response.data?.conflict
        setError(`Пересечение с "${c?.taskTitle}" (${c?.timeFrom}–${c?.timeTo})`)
      } else {
        setError('Ошибка сохранения')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card bg-dark border-primary mb-2">
      <div className="card-body py-3">
        <h6 className="mb-3">Добавить задачу</h6>
        {error && <div className="alert alert-danger py-2 mb-2">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-2">
            <select
              className="form-select form-select-sm bg-dark border-secondary text-white"
              value={selectedPlanId ?? ''}
              onChange={e => setSelectedPlanId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Выберите план...</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {selectedPlanId && (
            <div className="mb-2">
              <select
                className="form-select form-select-sm bg-dark border-secondary text-white"
                value={selectedTaskId ?? ''}
                onChange={e => setSelectedTaskId(e.target.value ? Number(e.target.value) : null)}
                disabled={tasks.length === 0}
              >
                <option value="">
                  {tasks.length === 0 ? 'Нет задач в плане' : 'Выберите задачу...'}
                </option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          )}

          <div className="row g-2 mb-2">
            <div className="col">
              <label className="form-label form-label-sm text-muted mb-1">Начало</label>
              <input type="time" className="form-control form-control-sm bg-dark border-secondary text-white"
                value={timeFrom} onChange={e => setTimeFrom(e.target.value)} />
            </div>
            <div className="col">
              <label className="form-label form-label-sm text-muted mb-1">Конец</label>
              <input type="time" className="form-control form-control-sm bg-dark border-secondary text-white"
                value={timeTo} onChange={e => setTimeTo(e.target.value)} />
            </div>
          </div>

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Добавление...' : 'Добавить'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
