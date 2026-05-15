import type { FashionOsModule } from '../../fashionOs'
import { PanelHeader } from '../../components/Panel'

export function WorkspaceFoundation({ module }: { module: FashionOsModule }) {
  return (
    <section className="panel">
      <PanelHeader title={module.label} />
      <div className="foundation-panel">
        <span className="label">{module.status}</span>
        <p>{module.summary}</p>
      </div>
    </section>
  )
}
