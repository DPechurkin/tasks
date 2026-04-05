import { NavLink } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="navbar navbar-dark bg-dark border-bottom border-secondary sticky-top">
      <div className="container-fluid">
        <span className="navbar-brand fw-bold">
          <i className="bi bi-lightning-charge-fill text-warning me-2"></i>
          Momentum
        </span>
        <div className="d-flex gap-1">
          <NavLink
            to="/ideas"
            className={({ isActive }) =>
              `btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-light'}`
            }
          >
            <i className="bi bi-lightbulb me-1"></i>Идеи
          </NavLink>
          <NavLink
            to="/plans"
            className={({ isActive }) =>
              `btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-light'}`
            }
          >
            <i className="bi bi-list-check me-1"></i>Планы
          </NavLink>
          <NavLink
            to="/schedule"
            className={({ isActive }) =>
              `btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-light'}`
            }
          >
            <i className="bi bi-calendar3 me-1"></i>Расписание
          </NavLink>
        </div>
      </div>
    </nav>
  )
}
