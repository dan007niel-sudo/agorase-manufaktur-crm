import { groupByStatus } from '../../crmUtils'
import type { FashionOsModule } from '../../fashionOs'
import { pipelineStatuses, type Manufactory, type PipelineStatus } from '../../types'
import { WorkspaceFoundation } from '../foundation/WorkspaceFoundation'

export function ProductionView({
  module,
  records,
  onSelect,
  onPatch,
}: {
  module: FashionOsModule
  records: Manufactory[]
  onSelect: (id: string) => void
  onPatch: (record: Manufactory) => void
}) {
  return (
    <section className="production-layout">
      <PipelineView records={records} onSelect={onSelect} onPatch={onPatch} />
      <WorkspaceFoundation module={module} />
    </section>
  )
}

function PipelineView({
  records,
  onSelect,
  onPatch,
}: {
  records: Manufactory[]
  onSelect: (id: string) => void
  onPatch: (record: Manufactory) => void
}) {
  return (
    <section className="pipeline-board">
      {groupByStatus(records)
        .filter((group) => group.records.length > 0)
        .map((group) => (
          <div className="pipeline-column" key={group.status}>
            <div className="column-title">
              <strong>{group.status}</strong>
              <span>{group.records.length}</span>
            </div>
            {group.records.map((record) => (
              <article className="pipeline-card" key={record.id} onClick={() => onSelect(record.id)}>
                <strong>{record.name}</strong>
                <span>{record.category}</span>
                <small>{record.nextStep || 'Nächsten Schritt festlegen'}</small>
                <select
                  value={record.status}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => onPatch({ ...record, status: event.target.value as PipelineStatus })}
                >
                  {pipelineStatuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </article>
            ))}
          </div>
        ))}
    </section>
  )
}
