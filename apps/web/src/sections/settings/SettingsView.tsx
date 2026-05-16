import { useEffect, useState } from 'react'
import type { AdminDiagnostics } from '@agorase/shared'
import { downloadAdminExport, fetchAdminDiagnostics } from '../../api/adminApi'
import { PanelHeader } from '../../components/Panel'

const ENV_VAR_LABELS = [
  'Gemini-API-Schlüssel',
  'Datenbank-URL',
  'Admin-Passwort',
  'Session-Geheimnis',
  'Erlaubte Origins',
] as const

const RENDER_SERVICES = ['Web (Static Site)', 'API (Web Service)', 'Postgres'] as const

type ExportState = 'idle' | 'loading' | 'success' | 'error'
type DiagnosticsState = 'loading' | 'ready' | 'error'

export function SettingsView({
  onSeedSave,
  onLogout,
  status,
}: {
  onSeedSave: () => void | Promise<void>
  onLogout: () => void | Promise<void>
  status: string
}) {
  const [diagnostics, setDiagnostics] = useState<AdminDiagnostics | null>(null)
  const [diagnosticsState, setDiagnosticsState] = useState<DiagnosticsState>('loading')
  const [diagnosticsError, setDiagnosticsError] = useState('')
  const [exportState, setExportState] = useState<ExportState>('idle')
  const [exportError, setExportError] = useState('')
  const [exportFilename, setExportFilename] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchAdminDiagnostics()
      .then((data) => {
        if (cancelled) return
        setDiagnostics(data)
        setDiagnosticsState('ready')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setDiagnosticsError(error instanceof Error ? error.message : 'Unbekannter Fehler')
        setDiagnosticsState('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleExport() {
    setExportState('loading')
    setExportError('')
    try {
      const filename = await downloadAdminExport()
      setExportFilename(filename)
      setExportState('success')
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Unbekannter Fehler')
      setExportState('error')
    }
  }

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

      <div className="foundation-panel">
        <span className="label">Export</span>
        <p>
          Lädt sämtliche Admin-Daten als JSON-Datei herunter. Rein lesend, ohne Server-Speicher.
        </p>
        <div className="settings-actions">
          <button
            type="button"
            className="primary-button"
            onClick={handleExport}
            disabled={exportState === 'loading'}
          >
            {exportState === 'loading' ? 'Export läuft …' : 'Vollständigen Export herunterladen'}
          </button>
        </div>
        {exportState === 'success' && (
          <p role="status">Export bereit: {exportFilename}</p>
        )}
        {exportState === 'error' && (
          <p role="alert">Export fehlgeschlagen: {exportError}</p>
        )}
      </div>

      <div className="foundation-panel">
        <span className="label">Diagnose</span>
        {diagnosticsState === 'loading' && <p>Diagnose wird geladen …</p>}
        {diagnosticsState === 'error' && (
          <p role="alert">Diagnose nicht verfügbar: {diagnosticsError}</p>
        )}
        {diagnosticsState === 'ready' && diagnostics && (
          <dl className="settings-diagnostics">
            <div>
              <dt>Gemini Text</dt>
              <dd>{providerLabel(diagnostics.providers.geminiText)}</dd>
            </div>
            <div>
              <dt>Gemini Image</dt>
              <dd>{providerLabel(diagnostics.providers.geminiImage)}</dd>
            </div>
            <div>
              <dt>Datenbank</dt>
              <dd>{databaseLabel(diagnostics.providers.database)}</dd>
            </div>
            <div>
              <dt>Gemini Text-Modell</dt>
              <dd>{diagnostics.env.geminiTextModel}</dd>
            </div>
            <div>
              <dt>Gemini Image-Modell</dt>
              <dd>{diagnostics.env.geminiImageModel}</dd>
            </div>
            <div>
              <dt>Allowed-Origins</dt>
              <dd>{diagnostics.env.allowedOriginsCount}</dd>
            </div>
            <div>
              <dt>Deployment</dt>
              <dd>{diagnostics.deployment.nodeEnv}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="foundation-panel">
        <span className="label">Deployment-Checkliste</span>
        <p>Erwartete Geheimnisse auf dem API-Service (nur Beschreibungen, keine Werte):</p>
        <ul>
          {ENV_VAR_LABELS.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
        <p>Render-Services:</p>
        <ul>
          {RENDER_SERVICES.map((service) => (
            <li key={service}>{service}</li>
          ))}
        </ul>
        <p>
          Restore aus Export: aktuell nicht unterstützt — JSON ist nur für lokale Backups gedacht.
          Ein destruktiver Restore wird separat entworfen.
        </p>
      </div>
    </section>
  )
}

function providerLabel(status: AdminDiagnostics['providers']['geminiText']) {
  return status === 'ready' ? 'ready' : 'nicht konfiguriert'
}

function databaseLabel(status: AdminDiagnostics['providers']['database']) {
  return status === 'ready' ? 'ready' : 'nicht erreichbar'
}
