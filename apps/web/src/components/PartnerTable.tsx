import type { Manufactory } from '../types'

export function PartnerTable({
  records,
  onSelect,
  selectedId,
}: {
  records: Manufactory[]
  onSelect: (id: string) => void
  selectedId?: string
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Label / Atelier</th>
            <th>Kategorie</th>
            <th>Status</th>
            <th>Fit</th>
            <th>Follow-up</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className={selectedId === record.id ? 'selected' : ''} onClick={() => onSelect(record.id)}>
              <td>
                <strong>{record.name}</strong>
                <small>{[record.city, record.country].filter(Boolean).join(', ')}</small>
              </td>
              <td>{record.category}</td>
              <td>
                <span className="chip">{record.status}</span>
              </td>
              <td>{record.brandFit}</td>
              <td>{record.nextFollowUp || 'offen'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
