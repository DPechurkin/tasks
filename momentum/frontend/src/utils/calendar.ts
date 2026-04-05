import { format, isToday, isBefore, startOfDay } from 'date-fns'
import { ru } from 'date-fns/locale'

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

// Возвращает 0=Пн, 1=Вт, ..., 6=Вс для первого дня месяца
export function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month - 1, 1).getDay()
  return day === 0 ? 6 : day - 1  // воскресенье (0) → 6, остальные -1
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function formatDateRu(date: Date): string {
  return format(date, 'd MMMM yyyy', { locale: ru })
}

export function formatDayOfWeekRu(date: Date): string {
  return format(date, 'EEEE', { locale: ru })
}

export function isDateToday(dateStr: string): boolean {
  return isToday(new Date(dateStr))
}

export function isDatePast(dateStr: string): boolean {
  return isBefore(startOfDay(new Date(dateStr)), startOfDay(new Date()))
}

export function isSlotPast(dateStr: string, timeFrom: string): boolean {
  const [hours, minutes] = timeFrom.split(':').map(Number)
  const slotDate = new Date(dateStr)
  slotDate.setHours(hours, minutes, 0, 0)
  return slotDate < new Date()
}

export function getMonthName(year: number, month: number): string {
  return format(new Date(year, month - 1, 1), 'LLLL yyyy', { locale: ru })
}
