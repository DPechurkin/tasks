import { useState } from 'react'
import type { ScheduledSlot, FeedDay } from '../../types/index.ts'
import { isDatePast, isSlotPast, formatDateRu, formatDayOfWeekRu } from '../../utils/calendar.ts'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import SlotCard from './SlotCard.tsx'
import AddSlotForm from './AddSlotForm.tsx'
import LoadingSpinner from '../../components/LoadingSpinner.tsx'

interface Props {
  date: string           // YYYY-MM-DD
  slots: ScheduledSlot[]
  feed: FeedDay[]
  loading: boolean
  onRefresh: () => void
}

export default function DayPanel({ date, slots, feed, loading, onRefresh }: Props) {
  const [showAddForm, setShowAddForm] = useState(false)
  const isPast = isDatePast(date)
  const isToday = date === new Date().toISOString().split('T')[0]

  // Сортируем слоты по времени
  const sortedSlots = [...slots].sort((a, b) => a.timeFrom.localeCompare(b.timeFrom))

  const dateObj = new Date(date + 'T12:00:00')  // добавляем время чтобы избежать timezone проблем
  const dayTitle = `${formatDayOfWeekRu(dateObj)}, ${formatDateRu(dateObj)}`

  return (
    <div className="p-3">
      {/* Заголовок дня */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <h5 className="mb-0 text-capitalize">{dayTitle}</h5>
        {isToday && <span className="badge bg-success">Сегодня</span>}
        {isPast && !isToday && (
          <>
            <span className="badge bg-secondary">Прошедший день</span>
            <i className="bi bi-lock text-muted"></i>
          </>
        )}
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          {/* Задачи дня */}
          {sortedSlots.length === 0 ? (
            <p className="text-muted small">Нет задач на этот день</p>
          ) : (
            sortedSlots.map(slot => (
              <SlotCard
                key={slot.id}
                slot={slot}
                dateStr={date}
                onRefresh={onRefresh}
              />
            ))
          )}

          {/* Кнопка добавить (только будущие даты и сегодня) */}
          {!isPast && (
            <div className="mt-2">
              {!showAddForm ? (
                <button
                  className="btn btn-outline-primary btn-sm w-100"
                  onClick={() => setShowAddForm(true)}
                >
                  <i className="bi bi-plus me-1"></i>
                  Добавить задачу на {format(new Date(date + 'T12:00:00'), 'd MMMM', { locale: ru })}
                </button>
              ) : (
                <AddSlotForm
                  date={date}
                  onSaved={() => { setShowAddForm(false); onRefresh() }}
                  onCancel={() => setShowAddForm(false)}
                />
              )}
            </div>
          )}

          {/* Лента будущих задач */}
          {feed.length > 0 && (
            <div className="mt-4">
              <h6 className="text-muted border-bottom border-secondary pb-2 mb-3">
                Предстоящие задачи
              </h6>
              {feed.map(({ date: feedDate, slots: feedSlots }) => (
                <div key={feedDate} className="mb-3">
                  <div className="text-muted small mb-1">
                    {format(new Date(feedDate + 'T12:00:00'), 'EEEE, d MMMM', { locale: ru })}
                  </div>
                  {feedSlots.map(slot => (
                    <div key={slot.id} className="card bg-dark border-secondary mb-1">
                      <div className="card-body py-1 px-2">
                        <span className="badge bg-secondary me-2">{slot.timeFrom}–{slot.timeTo}</span>
                        <span className="text-white small">{slot.taskTitle}</span>
                        <span className="text-muted small ms-2">· {slot.planTitle}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
