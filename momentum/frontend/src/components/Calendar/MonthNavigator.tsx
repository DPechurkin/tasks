import { getMonthName } from '../../utils/calendar.ts'

interface Props {
  year: number
  month: number   // 1-12
  onChange: (year: number, month: number) => void
}

export default function MonthNavigator({ year, month, onChange }: Props) {
  const goBack = () => {
    if (month === 1) onChange(year - 1, 12)
    else onChange(year, month - 1)
  }
  const goForward = () => {
    if (month === 12) onChange(year + 1, 1)
    else onChange(year, month + 1)
  }

  return (
    <div className="d-flex align-items-center justify-content-between mb-3">
      <button className="btn btn-sm btn-outline-secondary" onClick={goBack}>
        <i className="bi bi-chevron-left"></i>
      </button>
      <span className="fw-semibold text-capitalize">{getMonthName(year, month)}</span>
      <button className="btn btn-sm btn-outline-secondary" onClick={goForward}>
        <i className="bi bi-chevron-right"></i>
      </button>
    </div>
  )
}
