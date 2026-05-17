import { PanelHeader } from '../../components/Panel'
import { PartnerTable } from '../../components/PartnerTable'
import { pipelineStatuses, type Manufactory, type PipelineStatus } from '../../types'

export function PartnersView({
  records,
  selectedRecord,
  onSelect,
  onEdit,
  onPatch,
  onDelete,
}: {
  records: Manufactory[]
  selectedRecord?: Manufactory
  onSelect: (id: string) => void
  onEdit: () => void
  onPatch: (patch: Partial<Manufactory>) => void
  onDelete: (id: string) => void
}) {
  return (
    <section className="split-view">
      <div className="panel table-panel">
        <PanelHeader title="Fashion-Partner-Liste" />
        {records.length === 0 ? (
          <div className="empty-state">
            Noch keine Partner. Über die Sourcing-Sektion neue Partner anlegen oder in den Einstellungen die Beispiel-Daten importieren.
          </div>
        ) : (
          <PartnerTable records={records} onSelect={onSelect} selectedId={selectedRecord?.id} />
        )}
      </div>
      {selectedRecord && (
        <DetailPanel record={selectedRecord} onEdit={onEdit} onPatch={onPatch} onDelete={onDelete} />
      )}
    </section>
  )
}

function DetailPanel({
  record,
  onEdit,
  onPatch,
  onDelete,
}: {
  record: Manufactory
  onEdit: () => void
  onPatch: (patch: Partial<Manufactory>) => void
  onDelete: (id: string) => void
}) {
  function handleDelete() {
    if (window.confirm(`Partner "${record.name}" wirklich löschen?`)) {
      onDelete(record.id)
    }
  }
  return (
    <aside className="detail-panel">
      <span className="label">Selected</span>
      <h2>{record.name}</h2>
      <p>{record.products}</p>
      <div className="detail-lines">
        <span>Status: {record.status}</span>
        <span>Potenzial: {record.cooperationPotential}</span>
        <span>Prioritaet: {record.priority}</span>
        <span>Quelle: {record.source || 'offen'}</span>
      </div>
      <label>
        Status
        <select value={record.status} onChange={(event) => onPatch({ status: event.target.value as PipelineStatus })}>
          {pipelineStatuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </label>
      <label>
        Naechster Follow-up
        <input type="date" value={record.nextFollowUp} onChange={(event) => onPatch({ nextFollowUp: event.target.value })} />
      </label>
      <label>
        Naechster Schritt
        <input value={record.nextStep} onChange={(event) => onPatch({ nextStep: event.target.value })} />
      </label>
      <div className="note-box">{record.notes || 'Noch keine Notizen.'}</div>
      <div className="detail-actions">
        <button type="button" onClick={onEdit}>
          Datensatz bearbeiten
        </button>
        <button type="button" className="danger-button" onClick={handleDelete}>
          Partner löschen
        </button>
      </div>
    </aside>
  )
}
