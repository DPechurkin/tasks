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

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

function getDefaultEndDate(startDate: string): string {
  const d = new Date(startDate + 'T12:00:00')
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().split('T')[0]
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

  // Повторение
  const [recurring, setRecurring] = useState(false)
  const [recType, setRecType] = useState<'weekly' | 'monthly' | 'yearly'>('weekly')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]) // 1=Пн..7=Вс
  const [daysOfMonth, setDaysOfMonth] = useState<number[]>([])
  const [yearMonth, setYearMonth] = useState(new Date(date + 'T12:00:00').getMonth() + 1)
  const [yearDay, setYearDay] = useState(new Date(date + 'T12:00:00').getDate())
  const [endDate, setEndDate] = useState(getDefaultEndDate(date))

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

  const toggleDayOfWeek = (d: number) =>
    setDaysOfWeek(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])

  const toggleDayOfMonth = (d: number) =>
    setDaysOfMonth(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTaskId) { setError('Выберите задачу'); return }
    if (timeFrom >= timeTo) { setError('Начало должно быть раньше конца'); return }

    if (recurring) {
      if (recType === 'weekly' && daysOfWeek.length === 0) { setError('Выберите хотя бы один день недели'); return }
      if (recType === 'monthly' && daysOfMonth.length === 0) { setError('Выберите хотя бы одно число месяца'); return }
      if (!endDate) { setError('Укажите дату окончания'); return }
      if (endDate <= date) { setError('Дата окончания должна быть позже даты начала'); return }
    }

    setSaving(true)
    setError(null)
    try {
      if (!recurring) {
        await scheduleApi.create({ taskId: selectedTaskId, date, timeFrom, timeTo })
      } else {
        await scheduleApi.createRecurring({
          taskId: selectedTaskId,
          startDate: date,
          timeFrom,
          timeTo,
          endDate,
          type: recType,
          ...(recType === 'weekly' ? { daysOfWeek } : {}),
          ...(recType === 'monthly' ? { daysOfMonth } : {}),
          ...(recType === 'yearly' ? { month: yearMonth, day: yearDay } : {}),
        })
      }
      onSaved()
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { error?: string; conflict?: { taskTitle?: string; timeFrom?: string; timeTo?: string }; conflicts?: Array<{ date: string; taskTitle: string; timeFrom: string; timeTo: string }> } } }
      if (e.response?.status === 409) {
        const conflicts = e.response.data?.conflicts
        const single = e.response.data?.conflict
        if (conflicts && conflicts.length > 0) {
          setError(`Пересечения на ${conflicts.length} датах:\n` + conflicts.slice(0, 3).map(c => `${c.date}: "${c.taskTitle}" ${c.timeFrom}–${c.timeTo}`).join('\n') + (conflicts.length > 3 ? `\n...и ещё ${conflicts.length - 3}` : ''))
        } else if (single) {
          setError(`Пересечение с "${single.taskTitle}" (${single.timeFrom}–${single.timeTo})`)
        } else {
          setError(e.response.data?.error ?? 'Пересечение с другой задачей')
        }
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
        {error && <div className="alert alert-danger py-2 mb-2" style={{ whiteSpace: 'pre-wrap' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-2">
            <select className="form-select form-select-sm bg-dark border-secondary text-white"
              value={selectedPlanId ?? ''} onChange={e => setSelectedPlanId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Выберите план...</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>

          {selectedPlanId && (
            <div className="mb-2">
              <select className="form-select form-select-sm bg-dark border-secondary text-white"
                value={selectedTaskId ?? ''} onChange={e => setSelectedTaskId(e.target.value ? Number(e.target.value) : null)}
                disabled={tasks.length === 0}>
                <option value="">{tasks.length === 0 ? 'Нет задач в плане' : 'Выберите задачу...'}</option>
                {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
          )}

          <div className="row g-2 mb-2">
            <div className="col">
              <label className="form-label form-label-sm text-muted mb-1">Начало</label>
              <input type="time" className="form-control form-control-sm bg-dark border-secondary text-white" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} />
            </div>
            <div className="col">
              <label className="form-label form-label-sm text-muted mb-1">Конец</label>
              <input type="time" className="form-control form-control-sm bg-dark border-secondary text-white" value={timeTo} onChange={e => setTimeTo(e.target.value)} />
            </div>
          </div>

          {/* Переключатель повторения */}
          <div className="form-check form-switch mb-2">
            <input className="form-check-input" type="checkbox" id="recurringToggle" checked={recurring} onChange={e => setRecurring(e.target.checked)} />
            <label className="form-check-label text-white" htmlFor="recurringToggle">Повторя��ь</label>
          </div>

          {recurring && (
            <div className="border border-secondary rounded p-2 mb-2">
              {/* Тип повторения */}
              <div className="mb-2">
                <select className="form-select form-select-sm bg-dark border-secondary text-white"
                  value={recType} onChange={e => setRecType(e.target.value as 'weekly' | 'monthly' | 'yearly')}>
                  <option value="weekly">Раз в неделю</option>
                  <option value="monthly">Раз в месяц</option>
                  <option value="yearly">Раз в год</option>
                </select>
              </div>

              {/* Раз в неделю — дни */}
              {recType === 'weekly' && (
                <div className="d-flex gap-1 flex-wrap mb-2">
                  {DAY_LABELS.map((label, i) => {
                    const d = i + 1 // 1=Пн..7=Вс
                    const active = daysOfWeek.includes(d)
                    return (
                      <button key={d} type="button"
                        className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline-secondary'}`}
                        style={{ minWidth: '36px' }} onClick={() => toggleDayOfWeek(d)}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Раз в месяц — числа */}
              {recType === 'monthly' && (
                <div className="mb-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => {
                    const active = daysOfMonth.includes(d)
                    return (
                      <button key={d} type="button"
                        className={`btn btn-sm p-0 ${active ? 'btn-primary' : 'btn-outline-secondary'}`}
                        style={{ fontSize: '11px', height: '26px' }} onClick={() => toggleDayOfMonth(d)}>
                        {d}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Раз в год — месяц и день */}
              {recType === 'yearly' && (
                <div className="row g-2 mb-2">
                  <div className="col">
                    <select className="form-select form-select-sm bg-dark border-secondary text-white"
                      value={yearMonth} onChange={e => setYearMonth(Number(e.target.value))}>
                      {MONTH_NAMES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                  <div className="col-auto">
                    <select className="form-select form-select-sm bg-dark border-secondary text-white"
                      value={yearDay} onChange={e => setYearDay(Number(e.target.value))}>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Дата окончания */}
              <div>
                <label className="form-label form-label-sm text-muted mb-1">Повторять до</label>
                <input type="date" className="form-control form-control-sm bg-dark border-secondary text-white"
                  value={endDate} onChange={e => setEndDate(e.target.value)} min={date} />
              </div>
            </div>
          )}

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Добавление...' : (recurring ? 'Создать повторение' : 'Добавить')}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  )
}
