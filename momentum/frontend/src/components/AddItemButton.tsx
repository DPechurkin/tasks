interface Props {
  onClick: () => void
  label?: string
}

export default function AddItemButton({ onClick, label = 'Новая идея' }: Props) {
  return (
    <div className="text-center my-1">
      <button
        className="btn btn-outline-primary btn-sm opacity-50 hover-opacity-100"
        onClick={onClick}
        style={{ fontSize: '0.75rem', padding: '2px 10px' }}
      >
        <i className="bi bi-plus"></i> {label}
      </button>
    </div>
  )
}
