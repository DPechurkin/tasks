import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { scheduleApi } from '../../api/schedule.ts'
import type { ScheduledSlot, FeedDay } from '../../types/index.ts'
import MonthGrid from '../../components/Calendar/MonthGrid.tsx'
import MonthNavigator from '../../components/Calendar/MonthNavigator.tsx'
import DayPanel from './DayPanel.tsx'
import { formatDate, getMonthName } from '../../utils/calendar.ts'
import { addMonths, subMonths } from 'date-fns'

export default function SchedulePage() {
  const { date: urlDate } = useParams<{ date?: string }>()

  // Навигатор: текущий выбранный месяц (для центральной сетки)
  const today = new Date()
  const [navYear, setNavYear] = useState(today.getFullYear())
  const [navMonth, setNavMonth] = useState(today.getMonth() + 1) // 1-12

  // Выбранная дата в правой панели
  const [selectedDate, setSelectedDate] = useState<string | null>(urlDate ?? formatDate(today))

  // Данные расписания: объект { date: slotCount }
  const [slotCounts, setSlotCounts] = useState<Record<string, number>>({})

  // Данные для правой панели
  const [daySlots, setDaySlots] = useState<ScheduledSlot[]>([])
  const [feed, setFeed] = useState<FeedDay[]>([])
  const [dayLoading, setDayLoading] = useState(false)

  // Вычисляем три месяца вокруг navYear/navMonth
  const prevMonthDate = subMonths(new Date(navYear, navMonth - 1, 1), 1)
  const nextMonthDate = addMonths(new Date(navYear, navMonth - 1, 1), 1)

  const prevYear = prevMonthDate.getFullYear()
  const prevMonth = prevMonthDate.getMonth() + 1
  const nextYear = nextMonthDate.getFullYear()
  const nextMonth = nextMonthDate.getMonth() + 1

  const loadSlotCounts = useCallback(async () => {
    // Диапазон: с начала prevMonth по конец nextMonth
    const dateFrom = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
    const lastDay = new Date(nextYear, nextMonth, 0).getDate()
    const dateTo = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${lastDay}`

    const data = await scheduleApi.getRange(dateFrom, dateTo)
    // Подсчёт кол-ва слотов по датам
    const counts: Record<string, number> = {}
    Object.entries(data).forEach(([date, slots]) => {
      counts[date] = (slots as ScheduledSlot[]).length
    })
    setSlotCounts(counts)
  }, [prevYear, prevMonth, nextYear, nextMonth])

  useEffect(() => { loadSlotCounts() }, [loadSlotCounts])

  const loadDayData = useCallback(async (date: string) => {
    setDayLoading(true)
    try {
      const [slots, feedData] = await Promise.all([
        scheduleApi.getDay(date),
        scheduleApi.getFeed(date, 90),
      ])
      setDaySlots(slots)
      setFeed(feedData)
    } finally {
      setDayLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedDate) loadDayData(selectedDate)
  }, [selectedDate, loadDayData])

  return (
    <div className="container-fluid py-3" style={{ height: 'calc(100vh - 60px)' }}>
      <div className="row h-100">
        {/* Левая панель */}
        <div className="col-md-4 border-end border-secondary overflow-auto">
          <MonthNavigator
            year={navYear}
            month={navMonth}
            onChange={(y, m) => { setNavYear(y); setNavMonth(m) }}
          />

          {/* Три сетки: прошлый, текущий (выбранный), следующий */}
          <MonthGrid
            year={prevYear}
            month={prevMonth}
            selectedDate={selectedDate}
            slots={slotCounts}
            onDayClick={setSelectedDate}
            label={getMonthName(prevYear, prevMonth)}
          />
          <MonthGrid
            year={navYear}
            month={navMonth}
            selectedDate={selectedDate}
            slots={slotCounts}
            onDayClick={setSelectedDate}
            label={getMonthName(navYear, navMonth)}
          />
          <MonthGrid
            year={nextYear}
            month={nextMonth}
            selectedDate={selectedDate}
            slots={slotCounts}
            onDayClick={setSelectedDate}
            label={getMonthName(nextYear, nextMonth)}
          />
        </div>

        {/* Правая панель */}
        <div className="col-md-8 overflow-auto">
          {selectedDate ? (
            <DayPanel
              date={selectedDate}
              slots={daySlots}
              feed={feed}
              loading={dayLoading}
              onRefresh={() => {
                loadDayData(selectedDate)
                loadSlotCounts()
              }}
            />
          ) : (
            <div className="d-flex align-items-center justify-content-center h-100 text-muted">
              <div className="text-center">
                <i className="bi bi-calendar3 fs-1 d-block mb-2"></i>
                <p>Выберите день в календаре</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
