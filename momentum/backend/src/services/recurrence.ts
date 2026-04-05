interface GenerateRecurrenceParams {
  type: 'weekly' | 'monthly' | 'yearly'
  startDate: string  // YYYY-MM-DD inclusive
  endDate: string    // YYYY-MM-DD inclusive
  daysOfWeek?: number[]   // 1=Mon…7=Sun
  daysOfMonth?: number[]  // 1-31
  month?: number          // 1-12
  day?: number            // 1-31
}

function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDate(s: string): Date {
  const [year, month, day] = s.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function generateRecurrenceDates(params: GenerateRecurrenceParams): string[] {
  const { type, startDate, endDate, daysOfWeek, daysOfMonth, month, day } = params
  const result: string[] = []
  const start = parseDate(startDate)
  const end = parseDate(endDate)

  if (start > end) return result

  if (type === 'weekly') {
    if (!daysOfWeek || daysOfWeek.length === 0) return result
    const cursor = new Date(start)
    while (cursor <= end) {
      const jsDay = cursor.getDay() // 0=Sun…6=Sat
      const normalized = jsDay === 0 ? 7 : jsDay // 1=Mon…7=Sun
      if (daysOfWeek.includes(normalized)) {
        result.push(formatDate(cursor))
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    return result
  }

  if (type === 'monthly') {
    if (!daysOfMonth || daysOfMonth.length === 0) return result
    const cursor = new Date(start)
    while (cursor <= end) {
      const dom = cursor.getDate()
      if (daysOfMonth.includes(dom)) {
        result.push(formatDate(cursor))
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    return result
  }

  if (type === 'yearly') {
    if (month === undefined || day === undefined) return result
    const startYear = start.getFullYear()
    const endYear = end.getFullYear()
    for (let year = startYear; year <= endYear; year++) {
      // Validate date (e.g. Feb 29 might not exist)
      const candidate: Date = new Date(year, month - 1, day)
      if (
        candidate.getFullYear() !== year ||
        candidate.getMonth() !== month - 1 ||
        candidate.getDate() !== day
      ) {
        continue // invalid date, skip
      }
      if (candidate >= start && candidate <= end) {
        result.push(formatDate(candidate))
      }
    }
    return result
  }

  return result
}
