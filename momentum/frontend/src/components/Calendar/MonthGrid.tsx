import { getDaysInMonth, getFirstDayOfWeek, formatDate, isDateToday, isDatePast } from '../../utils/calendar.ts'

interface Props {
  year: number
  month: number          // 1-12
  selectedDate: string | null  // YYYY-MM-DD
  slots: Record<string, number>  // { '2026-04-06': 3 }
  onDayClick: (date: string) => void
  label?: string         // "Март 2026" — показывается над сеткой
}

export default function MonthGrid({ year, month, selectedDate, slots, onDayClick, label }: Props) {
  const daysInMonth = getDaysInMonth(year, month)
  const firstDayOffset = getFirstDayOfWeek(year, month) // 0=Пн, ..., 6=Вс

  // Строим массив ячеек: null для пустых ячеек перед первым днём
  const cells: (number | null)[] = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  // Разбиваем на недели по 7
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  // Дополняем последнюю неделю до 7 ячеек
  const lastWeek = weeks[weeks.length - 1]
  while (lastWeek.length < 7) lastWeek.push(null)

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  return (
    <div className="mb-3">
      {label && <h6 className="text-muted small mb-1">{label}</h6>}
      <table className="table table-dark table-sm mb-0" style={{ fontSize: '0.8rem' }}>
        <thead>
          <tr>
            {dayNames.map(d => (
              <th key={d} className="text-center text-muted fw-normal py-1 px-0" style={{ width: '14.28%' }}>
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((day, di) => {
                if (!day) return <td key={di} className="p-0"></td>
                const dateStr = formatDate(new Date(year, month - 1, day))
                const isToday = isDateToday(dateStr)
                const isPast = isDatePast(dateStr)
                const isSelected = selectedDate === dateStr
                const slotCount = slots[dateStr] ?? 0

                return (
                  <td
                    key={di}
                    className="text-center p-0 position-relative"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onDayClick(dateStr)}
                  >
                    <div
                      className={[
                        'd-inline-flex flex-column align-items-center justify-content-center',
                        'rounded',
                        isSelected ? 'border border-primary' : '',
                        isToday ? 'bg-primary text-white' : isPast ? 'text-muted' : 'text-white',
                      ].join(' ')}
                      style={{
                        width: '30px',
                        height: '30px',
                        margin: '1px auto',
                        fontSize: '0.8rem',
                        position: 'relative',
                      }}
                    >
                      {day}
                      {slotCount > 0 && (
                        <span
                          className="badge bg-info text-dark"
                          style={{
                            fontSize: '0.55rem',
                            padding: '1px 3px',
                            position: 'absolute',
                            bottom: '-2px',
                            right: '-2px',
                            minWidth: '14px',
                          }}
                        >
                          {slotCount}
                        </span>
                      )}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
