import { PanelHeader } from '../../components/Panel'
import { PartnerTable } from '../../components/PartnerTable'
import { pipelineStatuses, type Manufactory, type PipelineStatus } from '../../types'

export function PartnersView({
  records,
  selectedRecord,
  onSelect,
  onEdit,
  onPatch,
}: {
  records: Manufactory[]
  selectedRecord?: Manufactory
  onSelect: (id: string) => void
  onEdit: () => void
  onPatch: (patch: Partial<Manufactory>) => void
}) {
  return (
    <section className="split-view">
      <div className="panel table-panel">
        <PanelHeader title="Fashion-Partner-Liste" />
        <PartnerTable records={records} onSelect={onSelect} selectedId={selectedRecord?.id} />
      </div>
      {selectedRecord && <DetailPanel record={selectedRecord} onEdit={onEdit} onPatch={onPatch} />}
    </section>
  )
}

function DetailPanel({
  record,
  onEdit,
  onPatch,
}: {
  record: Manufactory
  onEdit: () => void
  onPatch: (patch: Partial<Manufactory>) => void
}) {
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
      <button type="button" onClick={onEdit}>
        Datensatz bearbeiten
      </button>
    </aside>
  )
}
