import { useEffect, useMemo, useState } from 'react'
import logo from './assets/agorase-logo.jpeg'
import './App.css'
import { seedManufactories } from './data'
import {
  calculateMetrics,
  createEmptyManufacture,
  deriveTasks,
  groupByStatus,
  parseBulkImport,
  upsertManufacture,
} from './crmUtils'
import {
  categories,
  pipelineStatuses,
  type Category,
  type CrmTask,
  type Manufactory,
  type PipelineStatus,
} from './types'
import {
  requestAiManufactories,
  suggestionToManufacture,
  type AiResearchCriteria,
  type AiResearchSuggestion,
} from './aiResearch'
import { fashionOsModules, type FashionOsModule } from './fashionOs'
import { getSession, login, logout } from './authApi'
import { importPartners, listPartners, savePartner, updatePartner } from './partnersApi'

type Section = FashionOsModule['section']

const storageKeys = {
  records: 'agorase.records',
  templates: 'agorase.templates',
  completedTasks: 'agorase.completedTasks',
}

function App() {
  if (window.location.search.includes('reset=1')) {
    Object.values(storageKeys).forEach((key) => window.localStorage.removeItem(key))
    window.history.replaceState({}, '', window.location.pathname)
  }

  const [activeSection, setActiveSection] = useState<Section>('Command Center')
  const [records, setRecords] = useState<Manufactory[]>(seedManufactories)
  const [recordsStatus, setRecordsStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [recordsError, setRecordsError] = useState('')
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated' | 'error'>('checking')
  const [authError, setAuthError] = useState('')
  const [completedTasks, setCompletedTasks] = useLocalState<string[]>(storageKeys.completedTasks, [])
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'Alle' | Category>('Alle')
  const [statusFilter, setStatusFilter] = useState<'Alle' | PipelineStatus>('Alle')
  const [formOpen, setFormOpen] = useState(false)

  const selectedRecord = records.find((record) => record.id === selectedId) ?? records[0]
  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return records.filter((record) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          record.name,
          record.contactPerson,
          record.category,
          record.city,
          record.region,
          record.country,
          record.source,
          record.products,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      const matchesCategory = categoryFilter === 'Alle' || record.category === categoryFilter
      const matchesStatus = statusFilter === 'Alle' || record.status === statusFilter
      return matchesQuery && matchesCategory && matchesStatus
    })
  }, [records, query, categoryFilter, statusFilter])

  const today = '2026-05-14'
  const metrics = calculateMetrics(records, today)
  const tasks = deriveTasks(records, today).map((task) => ({
    ...task,
    completed: completedTasks.includes(task.id),
  }))
  const activeModule = fashionOsModules.find((module) => module.section === activeSection) ?? fashionOsModules[0]

  useEffect(() => {
    let active = true

    async function checkSession() {
      try {
        const session = await getSession()
        if (!active) return
        setAuthStatus(session.authenticated ? 'authenticated' : 'unauthenticated')
        setAuthError('')
      } catch {
        if (!active) return
        setAuthStatus('error')
        setAuthError('Session konnte nicht geprüft werden.')
      }
    }

    void checkSession()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (authStatus !== 'authenticated') return
    let active = true

    async function loadRecords() {
      try {
        const loaded = await listPartners()
        if (!active) return
        const nextRecords = loaded.length ? loaded : seedManufactories
        setRecords(nextRecords)
        setSelectedId((current) => current || nextRecords[0]?.id || '')
        setRecordsStatus('ready')
        setRecordsError('')
      } catch (caught) {
        if (!active) return
        setRecords(seedManufactories)
        setRecordsError(caught instanceof Error ? caught.message : 'Partner konnten nicht geladen werden.')
        setRecordsStatus('error')
      }
    }

    void loadRecords()
    return () => {
      active = false
    }
  }, [authStatus])

  async function handleLogin(password: string) {
    try {
      const session = await login(password)
      setAuthStatus(session.authenticated ? 'authenticated' : 'unauthenticated')
      setAuthError('')
    } catch {
      setAuthStatus('unauthenticated')
      setAuthError('Login fehlgeschlagen.')
    }
  }

  async function handleLogout() {
    await logout()
    setAuthStatus('unauthenticated')
  }

  async function saveRecord(nextRecord: Manufactory) {
    try {
      const saved = await savePartner(nextRecord)
      setRecords((current) => upsertManufacture(current, saved))
      setSelectedId(saved.id)
      setFormOpen(false)
      setRecordsStatus('ready')
      setRecordsError('')
    } catch (caught) {
      setRecordsStatus('error')
      setRecordsError(caught instanceof Error ? caught.message : 'Partner konnte nicht gespeichert werden.')
    }
  }

  async function updateSelectedRecord(patch: Partial<Manufactory>) {
    if (!selectedRecord) return
    try {
      const updated = await updatePartner(selectedRecord.id, patch)
      setRecords((current) => upsertManufacture(current, updated))
      setSelectedId(updated.id)
      setRecordsStatus('ready')
      setRecordsError('')
    } catch (caught) {
      setRecordsStatus('error')
      setRecordsError(caught instanceof Error ? caught.message : 'Partner konnte nicht aktualisiert werden.')
    }
  }

  async function saveImportedRecords(newRecords: Manufactory[]) {
    try {
      const saved = await importPartners(newRecords)
      setRecords((current) => saved.reduce((next, record) => upsertManufacture(next, record), current))
      if (saved[0]) setSelectedId(saved[0].id)
      setQuery('')
      setCategoryFilter('Alle')
      setStatusFilter('Alle')
      setRecordsStatus('ready')
      setRecordsError('')
      setActiveSection('Partners')
    } catch (caught) {
      setRecordsStatus('error')
      setRecordsError(caught instanceof Error ? caught.message : 'Partner konnten nicht importiert werden.')
    }
  }

  async function saveSeedRecords() {
    try {
      const saved = await importPartners(seedManufactories)
      setRecords(saved)
      setSelectedId(saved[0]?.id ?? '')
      setRecordsStatus('ready')
      setRecordsError('')
    } catch (caught) {
      setRecordsStatus('error')
      setRecordsError(caught instanceof Error ? caught.message : 'Seed-Daten konnten nicht gespeichert werden.')
    }
  }

  function toggleTask(task: CrmTask) {
    setCompletedTasks((current) =>
      current.includes(task.id) ? current.filter((id) => id !== task.id) : [...current, task.id],
    )
  }

  if (authStatus !== 'authenticated') {
    return <LoginView status={authStatus} error={authError} onLogin={handleLogin} />
  }

  return (
    <div className="app-shell">
      <Sidebar activeSection={activeSection} onSelect={setActiveSection} metrics={metrics.openTasks} />
      <main className="workspace">
        <Topbar
          activeModule={activeModule}
          query={query}
          categoryFilter={categoryFilter}
          statusFilter={statusFilter}
          onQueryChange={setQuery}
          onCategoryChange={setCategoryFilter}
          onStatusChange={setStatusFilter}
          onAdd={() => {
            setSelectedId('')
            setFormOpen(true)
          }}
        />
        {recordsStatus === 'error' && <div className="app-alert">Partnerdaten konnten nicht synchronisiert werden.</div>}
        {activeSection === 'Command Center' && (
          <Dashboard
            metrics={metrics}
            records={records}
            tasks={tasks}
            onSelectRecord={setSelectedId}
            onSectionChange={setActiveSection}
            onToggleTask={toggleTask}
          />
        )}
        {activeSection === 'Sourcing' && (
          <SourcingView
            onAiImport={saveImportedRecords}
            onBulkImport={saveImportedRecords}
          />
        )}
        {activeSection === 'Partners' && (
          <ListView
            records={filteredRecords}
            selectedRecord={selectedRecord}
            onSelect={setSelectedId}
            onEdit={() => setFormOpen(true)}
            onPatch={updateSelectedRecord}
          />
        )}
        {activeSection === 'Production' && (
          <ProductionView module={activeModule} records={filteredRecords} onSelect={setSelectedId} onPatch={saveRecord} />
        )}
        {activeSection === 'Creative Lab' && <WorkspaceFoundation module={activeModule} />}
        {activeSection === 'Mockups' && <WorkspaceFoundation module={activeModule} />}
        {activeSection === 'Legal Orientation' && <WorkspaceFoundation module={activeModule} />}
        {activeSection === 'Releases' && <WorkspaceFoundation module={activeModule} />}
        {activeSection === 'Web Ops' && <WorkspaceFoundation module={activeModule} />}
        {activeSection === 'Settings' && (
          <SettingsView
            status={
              recordsStatus === 'error'
                ? recordsError
                : recordsStatus === 'loading'
                  ? 'Partnerdaten werden geladen.'
                  : 'Partnerdaten werden über die API synchronisiert.'
            }
            onSeedSave={saveSeedRecords}
            onLogout={handleLogout}
          />
        )}
      </main>
      {formOpen && (
        <RecordForm
          initialRecord={selectedId ? selectedRecord : createEmptyManufacture()}
          onCancel={() => setFormOpen(false)}
          onSave={saveRecord}
        />
      )}
    </div>
  )
}

function LoginView({
  status,
  error,
  onLogin,
}: {
  status: 'checking' | 'unauthenticated' | 'error'
  error: string
  onLogin: (password: string) => void | Promise<void>
}) {
  const [password, setPassword] = useState('')
  const loading = status === 'checking'

  return (
    <main className="login-shell">
      <form
        className="login-panel"
        onSubmit={(event) => {
          event.preventDefault()
          void onLogin(password)
        }}
      >
        <img src={logo} alt="Agorase Logo" />
        <label>
          Passwort
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoFocus
          />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button type="submit" className="primary-button" disabled={loading || !password}>
          {loading ? 'Prüfe...' : 'Einloggen'}
        </button>
      </form>
    </main>
  )
}

function useLocalState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = window.localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : fallback
  })

  function updateValue(next: T | ((current: T) => T)) {
    setValue((current) => {
      const resolved = typeof next === 'function' ? (next as (current: T) => T)(current) : next
      window.localStorage.setItem(key, JSON.stringify(resolved))
      return resolved
    })
  }

  return [value, updateValue] as const
}

function Sidebar({
  activeSection,
  metrics,
  onSelect,
}: {
  activeSection: Section
  metrics: number
  onSelect: (section: Section) => void
}) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <img src={logo} alt="Agorase Logo" />
      <div>
        <strong>AGORASE</strong>
        <span>Fashion OS</span>
      </div>
    </div>
      <nav className="side-nav" aria-label="Fashion OS Bereiche">
        {fashionOsModules.map((module) => (
          <button
            key={module.section}
            className={activeSection === module.section ? 'active' : ''}
            type="button"
            onClick={() => onSelect(module.section)}
          >
            <span>{module.shortLabel}</span>
            <small>{module.status}</small>
          </button>
        ))}
      </nav>
      <div className="today-label">
        <span>Heute</span>
        <strong>{metrics}</strong>
        <small>offene OS-Schritte</small>
      </div>
    </aside>
  )
}

function Topbar({
  activeModule,
  query,
  categoryFilter,
  statusFilter,
  onQueryChange,
  onCategoryChange,
  onStatusChange,
  onAdd,
}: {
  activeModule: FashionOsModule
  query: string
  categoryFilter: 'Alle' | Category
  statusFilter: 'Alle' | PipelineStatus
  onQueryChange: (value: string) => void
  onCategoryChange: (value: 'Alle' | Category) => void
  onStatusChange: (value: 'Alle' | PipelineStatus) => void
  onAdd: () => void
}) {
  return (
    <header className="topbar">
      <div>
        <span className="label">Fashion OS / {activeModule.status}</span>
        <h1>{activeModule.label}</h1>
        <p className="topbar-summary">{activeModule.summary}</p>
      </div>
      <div className="topbar-actions">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Suche nach Name, Kategorie, Stadt, Quelle"
        />
        <select value={categoryFilter} onChange={(event) => onCategoryChange(event.target.value as 'Alle' | Category)}>
          <option>Alle</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(event) => onStatusChange(event.target.value as 'Alle' | PipelineStatus)}>
          <option>Alle</option>
          {pipelineStatuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <button type="button" className="primary-button" onClick={onAdd}>
          Neuer Kontakt
        </button>
      </div>
    </header>
  )
}

function Dashboard({
  metrics,
  records,
  tasks,
  onSelectRecord,
  onSectionChange,
  onToggleTask,
}: {
  metrics: ReturnType<typeof calculateMetrics>
  records: Manufactory[]
  tasks: CrmTask[]
  onSelectRecord: (id: string) => void
  onSectionChange: (section: Section) => void
  onToggleTask: (task: CrmTask) => void
}) {
  const topRecords = records.filter((record) => record.priority === 'A' || record.brandFit === 'A').slice(0, 4)

  return (
    <section className="view-grid">
      <div className="metric-grid">
        <Metric label="Gesamt" value={metrics.total} />
        <Metric label="Markenfit A" value={metrics.highFit} />
        <Metric label="Potenzial hoch" value={metrics.highPotential} />
        <Metric label="Heute dran" value={metrics.dueFollowUps} dark />
      </div>
      <div className="panel wide">
        <PanelHeader title="Priorisierte Fashion-Partner" action="Zu Partners" onClick={() => onSectionChange('Partners')} />
        <CompactTable records={topRecords} onSelect={onSelectRecord} />
      </div>
      <div className="panel">
        <PanelHeader title="Nächste Schritte" action="Produktion" onClick={() => onSectionChange('Production')} />
        <TaskList tasks={tasks.slice(0, 5)} records={records} onToggle={onToggleTask} onSelectRecord={onSelectRecord} />
      </div>
    </section>
  )
}

function Metric({ label, value, dark = false }: { label: string; value: number; dark?: boolean }) {
  return (
    <div className={`metric ${dark ? 'dark' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function PanelHeader({ title, action, onClick }: { title: string; action?: string; onClick?: () => void }) {
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

function ListView({
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
        <CompactTable records={records} onSelect={onSelect} selectedId={selectedRecord?.id} />
      </div>
      {selectedRecord && <DetailPanel record={selectedRecord} onEdit={onEdit} onPatch={onPatch} />}
    </section>
  )
}

function CompactTable({
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

function ProductionView({
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

function WorkspaceFoundation({ module }: { module: FashionOsModule }) {
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

function SettingsView({
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

function TaskList({
  tasks,
  records,
  onToggle,
  onSelectRecord,
}: {
  tasks: CrmTask[]
  records: Manufactory[]
  onToggle?: (task: CrmTask) => void
  onSelectRecord: (id: string) => void
}) {
  return (
    <div className="task-list">
      {tasks.map((task) => {
        const record = records.find((item) => item.id === task.manufactureId)
        return (
          <article className={`task-row ${task.urgency} ${task.completed ? 'done' : ''}`} key={task.id}>
            {onToggle && <input type="checkbox" checked={task.completed} onChange={() => onToggle(task)} />}
            <button type="button" onClick={() => onSelectRecord(task.manufactureId)}>
              {task.title}
            </button>
          <span>{record?.name}</span>
            <small>{task.dueDate || 'ohne Datum'}</small>
          </article>
        )
      })}
    </div>
  )
}

function SourcingView({
  onAiImport,
  onBulkImport,
}: {
  onAiImport: (records: Manufactory[]) => void | Promise<void>
  onBulkImport: (records: Manufactory[]) => void | Promise<void>
}) {
  return (
    <section className="sourcing-layout">
      <AiResearchView onImport={onAiImport} />
      <BulkImportView onImport={onBulkImport} />
    </section>
  )
}

function AiResearchView({ onImport }: { onImport: (records: Manufactory[]) => void }) {
  const [criteria, setCriteria] = useState<AiResearchCriteria>({
    categories: ['Streetwear', 'Ready-to-Wear', 'Schmuck'],
    regions: 'DACH, Norditalien, Benelux',
    productFocus: 'zeitgenoessische Streetwear, Ready-to-Wear, Accessoires und kleine Capsule Drops',
    priceLevel: 'Premium',
    count: 8,
  })
  const [suggestions, setSuggestions] = useState<AiResearchSuggestion[]>([])
  const [selectedNames, setSelectedNames] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')

  async function runResearch() {
    setStatus('loading')
    setError('')

    try {
      const nextSuggestions = await requestAiManufactories({ criteria })
      setSuggestions(nextSuggestions)
      setSelectedNames(nextSuggestions.map((suggestion) => suggestion.name))
      setStatus('idle')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'KI-Recherche fehlgeschlagen.')
      setStatus('error')
    }
  }

  function toggleCategory(category: Category) {
    setCriteria((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category],
    }))
  }

  const selectedSuggestions = suggestions.filter((suggestion) => selectedNames.includes(suggestion.name))

  return (
    <section className="ai-research-layout">
      <div className="panel ai-control-panel">
        <PanelHeader title="KI-Recherche" />
        <p className="helper-copy">
          Lass dir passende Labels, Ateliers, Hersteller und Fashion-Partner per interner Recherche vorschlagen und übernimm die besten Treffer direkt in die Partnerliste.
        </p>
        <label>
          Regionen / Länder
          <input
            value={criteria.regions}
            onChange={(event) => setCriteria((current) => ({ ...current, regions: event.target.value }))}
          />
        </label>
        <label>
          Fashion-Fokus
          <textarea
            value={criteria.productFocus}
            onChange={(event) => setCriteria((current) => ({ ...current, productFocus: event.target.value }))}
          />
        </label>
        <div className="form-grid two">
          <label>
            Preisniveau
            <select
              value={criteria.priceLevel}
              onChange={(event) =>
                setCriteria((current) => ({ ...current, priceLevel: event.target.value as AiResearchCriteria['priceLevel'] }))
              }
            >
              <option>Alle</option>
              <option>Budget</option>
              <option>Mittel</option>
              <option>Premium</option>
              <option>Luxus</option>
            </select>
          </label>
          <label>
            Anzahl
            <input
              type="number"
              min="3"
              max="20"
              value={criteria.count}
              onChange={(event) => setCriteria((current) => ({ ...current, count: Number(event.target.value) }))}
            />
          </label>
        </div>
        <div className="category-picker">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={criteria.categories.includes(category) ? 'selected' : ''}
              onClick={() => toggleCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        {status === 'error' && <div className="error-box">{error}</div>}
        <button type="button" className="primary-button" onClick={runResearch} disabled={status === 'loading'}>
          {status === 'loading' ? 'KI sucht...' : 'Fashion-Partner suchen lassen'}
        </button>
      </div>

      <div className="panel">
        <PanelHeader title="KI-Vorschläge" />
        {!suggestions.length && (
          <div className="empty-state">
            Noch keine Vorschläge. Starte eine KI-Recherche mit Kategorien, Region und Fashion-Fokus.
          </div>
        )}
        <div className="ai-suggestion-list">
          {suggestions.map((suggestion) => (
            <article className="ai-suggestion" key={suggestion.name}>
              <label className="select-line">
                <input
                  type="checkbox"
                  checked={selectedNames.includes(suggestion.name)}
                  onChange={() =>
                    setSelectedNames((current) =>
                      current.includes(suggestion.name)
                        ? current.filter((name) => name !== suggestion.name)
                        : [...current, suggestion.name],
                    )
                  }
                />
                <strong>{suggestion.name}</strong>
              </label>
              <div className="suggestion-meta">
                <span>{suggestion.category}</span>
                <span>{[suggestion.city, suggestion.country].filter(Boolean).join(', ')}</span>
                <span>Fit {suggestion.brandFit}</span>
                <span>{suggestion.confidence}%</span>
              </div>
              <p>{suggestion.rationale}</p>
              <div className="source-list">
                {suggestion.sources.map((source) => (
                  <a key={source.url} href={source.url} target="_blank">
                    {source.title || source.url}
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
        {!!suggestions.length && (
          <button
            type="button"
            className="primary-button import-ai-button"
            disabled={!selectedSuggestions.length}
            onClick={() => onImport(selectedSuggestions.map(suggestionToManufacture))}
          >
            {selectedSuggestions.length} Vorschläge übernehmen
          </button>
        )}
      </div>
    </section>
  )
}

function BulkImportView({ onImport }: { onImport: (records: Manufactory[]) => void }) {
  const [raw, setRaw] = useState('Name\tKategorie\tStadt\tE-Mail\tStatus\tPriorität\nNeue Werkstatt\tKeramik\tBerlin\thello@example.com\tKontakt gefunden\tA')
  const preview = useMemo(() => parseBulkImport(raw), [raw])

  return (
    <section className="split-view">
      <div className="panel">
        <PanelHeader title="Bulk-Import" />
        <textarea className="import-box" value={raw} onChange={(event) => setRaw(event.target.value)} />
        <button type="button" className="primary-button" onClick={() => onImport(preview)} disabled={!preview.length}>
          {preview.length} Zeilen importieren
        </button>
      </div>
      <div className="panel">
        <PanelHeader title="Vorschau" />
        <CompactTable records={preview} onSelect={() => undefined} />
      </div>
    </section>
  )
}

function RecordForm({
  initialRecord,
  onCancel,
  onSave,
}: {
  initialRecord: Manufactory
  onCancel: () => void
  onSave: (record: Manufactory) => void | Promise<void>
}) {
  const [draft, setDraft] = useState(initialRecord)

  function patch(field: keyof Manufactory, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="modal-backdrop">
      <form
        className="record-form"
        onSubmit={(event) => {
          event.preventDefault()
          onSave({ ...draft, id: draft.id || draft.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') })
        }}
      >
        <PanelHeader title={draft.id ? 'Fashion-Kontakt bearbeiten' : 'Neuer Fashion-Kontakt'} />
        <div className="form-grid">
          <Field label="Name" value={draft.name} onChange={(value) => patch('name', value)} />
          <Field label="Ansprechpartner" value={draft.contactPerson} onChange={(value) => patch('contactPerson', value)} />
          <label>
            Kategorie
            <select value={draft.category} onChange={(event) => patch('category', event.target.value)}>
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <Field label="Stadt" value={draft.city} onChange={(value) => patch('city', value)} />
          <Field label="Land" value={draft.country} onChange={(value) => patch('country', value)} />
          <Field label="Website" value={draft.website} onChange={(value) => patch('website', value)} />
          <Field label="E-Mail" value={draft.email} onChange={(value) => patch('email', value)} />
          <Field label="Telefon" value={draft.phone} onChange={(value) => patch('phone', value)} />
          <Field label="Social" value={draft.social} onChange={(value) => patch('social', value)} />
          <Field label="Produkte" value={draft.products} onChange={(value) => patch('products', value)} />
          <label>
            Status
            <select value={draft.status} onChange={(event) => patch('status', event.target.value)}>
              {pipelineStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <Field label="Nächster Schritt" value={draft.nextStep} onChange={(value) => patch('nextStep', value)} />
        </div>
        <label>
          Notizen
          <textarea value={draft.notes} onChange={(event) => patch('notes', event.target.value)} />
        </label>
        <div className="form-actions">
          <button type="button" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="submit" className="primary-button">
            Speichern
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export default App
