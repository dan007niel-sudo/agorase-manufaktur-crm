import { PanelHeader } from '../../components/Panel'

export function SettingsView({
  onSeedSave,
  onLogout,
  status,
}: {
  onSeedSave: () => void | Promise<void>
  onLogout: () => void | Promise<void>
  status: string
}) {
  return (
    <section className="panel">
      <PanelHeader title="Settings" />
      <div className="foundation-panel">
        <span className="label">Phase 2A</span>
        <p>{status}</p>
        <div className="settings-actions">
          <button type="button" className="primary-button" onClick={onSeedSave}>
            Seed speichern
          </button>
          <button type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </section>
  )
}
