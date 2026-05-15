export function Metric({ label, value, dark = false }: { label: string; value: number; dark?: boolean }) {
  return (
    <div className={`metric ${dark ? 'dark' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function PanelHeader({ title, action, onClick }: { title: string; action?: string; onClick?: () => void }) {
  return (
    <div className="panel-header">
      <h2>{title}</h2>
      {action && (
        <button type="button" onClick={onClick}>
          {action}
        </button>
      )}
    </div>
  )
}
